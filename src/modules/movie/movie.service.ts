import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import {
  CreateMovieInput,
  MovieResponse,
  MovieWithLinks,
  PrerequisiteGraph,
  UpdateMovieInput,
  RewatchItem,
  RewatchOrderResponse,
} from "./movie.interface";
import { wouldCreateCycle } from "./cycleDetection";
import { buildRewatchOrder } from "./rewatchOrder";

const movieInclude = {
  prerequisites: { select: { prerequisiteId: true } },
} as const;

const toMovieResponse = (movie: MovieWithLinks): MovieResponse => ({
  id: movie.id,
  title: movie.title,
  releaseYear: movie.releaseYear,
  runtime: movie.runtime,
  watched: movie.watched,
  prerequisites: movie.prerequisites.map((link) => link.prerequisiteId),
});

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "P2002";

const ensureMoviesExist = async (ids: number[]): Promise<void> => {
  if (ids.length === 0) return;
  const found = await prisma.movie.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  const foundIds = new Set(found.map((movie) => movie.id));
  const missing = ids.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      `Prerequisite movie(s) not found: ${missing.join(", ")}`,
    );
  }
};

export const createMovies = async (
  inputs: CreateMovieInput[],
): Promise<MovieResponse[]> => {
  const existing = await prisma.movie.findFirst({
    where: { title: { in: inputs.map((input) => input.title) } },
    select: { title: true },
  });
  if (existing) {
    throw new AppError(
      409,
      "DUPLICATE_TITLE",
      `Movie "${existing.title}" already exists`,
    );
  }

  await ensureMoviesExist([
    ...new Set(inputs.flatMap((input) => input.prerequisites)),
  ]);

  try {
    // All-or-nothing: if one movie fails, none are saved
    return await prisma.$transaction(async (tx) => {
      const created: MovieResponse[] = [];
      for (const input of inputs) {
        const movie = await tx.movie.create({
          data: {
            title: input.title,
            releaseYear: input.releaseYear,
            runtime: input.runtime,
            watched: input.watched,
            prerequisites: {
              create: input.prerequisites.map((id) => ({ prerequisiteId: id })),
            },
          },
          include: movieInclude,
        });
        created.push(toMovieResponse(movie));
      }
      return created;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(
        409,
        "DUPLICATE_TITLE",
        "A movie with this title already exists",
      );
    }
    throw error;
  }
};

export const getMovies = async (): Promise<MovieResponse[]> => {
  const movies = await prisma.movie.findMany({
    include: movieInclude,
    orderBy: { id: "asc" },
  });
  return movies.map(toMovieResponse);
};

export const getMovieById = async (id: number): Promise<MovieResponse> => {
  const movie = await prisma.movie.findUnique({
    where: { id },
    include: movieInclude,
  });
  if (!movie) {
    throw new AppError(404, "NOT_FOUND", "Movie not found");
  }
  return toMovieResponse(movie);
};

const loadPrerequisiteGraph = async (): Promise<PrerequisiteGraph> => {
  const links = await prisma.moviePrerequisite.findMany({
    orderBy: [{ movieId: "asc" }, { prerequisiteId: "asc" }],
  });
  const graph: PrerequisiteGraph = new Map();
  for (const link of links) {
    const list = graph.get(link.movieId) ?? [];
    list.push(link.prerequisiteId);
    graph.set(link.movieId, list);
  }
  return graph;
};

export const updateMovie = async (
  id: number,
  input: UpdateMovieInput,
): Promise<MovieResponse> => {
  const current = await prisma.movie.findUnique({
    where: { id },
    select: { id: true, title: true },
  });
  if (!current) {
    throw new AppError(404, "NOT_FOUND", "Movie not found");
  }

  if (input.title !== undefined && input.title !== current.title) {
    const duplicate = await prisma.movie.findUnique({
      where: { title: input.title },
      select: { id: true },
    });
    if (duplicate) {
      throw new AppError(
        409,
        "DUPLICATE_TITLE",
        `Movie "${input.title}" already exists`,
      );
    }
  }

  if (input.prerequisites !== undefined) {
    await ensureMoviesExist(input.prerequisites);
    const graph = await loadPrerequisiteGraph();
    if (wouldCreateCycle(id, input.prerequisites, graph)) {
      throw new AppError(
        409,
        "CIRCULAR_DEPENDENCY",
        "These prerequisites would create a circular dependency",
      );
    }
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (input.prerequisites !== undefined) {
        // PATCH replaces the whole prerequisite list
        await tx.moviePrerequisite.deleteMany({ where: { movieId: id } });
        await tx.moviePrerequisite.createMany({
          data: input.prerequisites.map((prerequisiteId) => ({
            movieId: id,
            prerequisiteId,
          })),
        });
      }
      return tx.movie.update({
        where: { id },
        data: {
          title: input.title,
          releaseYear: input.releaseYear,
          runtime: input.runtime,
          watched: input.watched,
        },
        include: movieInclude,
      });
    });
    return toMovieResponse(updated);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(
        409,
        "DUPLICATE_TITLE",
        "A movie with this title already exists",
      );
    }
    throw error;
  }
};

export const deleteMovie = async (id: number): Promise<void> => {
  const existing = await prisma.movie.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    throw new AppError(404, "NOT_FOUND", "Movie not found");
  }
  // onDelete: Cascade removes links where this movie is the dependent or the prerequisite
  await prisma.movie.delete({ where: { id } });
};

export const getRewatchOrder = async (
  targetId: number,
): Promise<RewatchOrderResponse> => {
  const target = await prisma.movie.findUnique({
    where: { id: targetId },
    select: { id: true, title: true },
  });
  if (!target) {
    throw new AppError(404, "NOT_FOUND", "Movie not found");
  }

  const graph = await loadPrerequisiteGraph();
  const orderedIds = buildRewatchOrder(targetId, graph);

  const movies =
    orderedIds.length === 0
      ? []
      : await prisma.movie.findMany({
          where: { id: { in: orderedIds } },
          select: { id: true, title: true, runtime: true, watched: true },
        });
  const movieById = new Map(movies.map((movie) => [movie.id, movie]));

  // keep the order that the algorithm produced
  const order: RewatchItem[] = orderedIds.flatMap((id) => {
    const movie = movieById.get(id);
    return movie ? [movie] : [];
  });

  const watchedCount = order.filter((movie) => movie.watched).length;
  const remainingMinutes = order
    .filter((movie) => !movie.watched)
    .reduce((sum, movie) => sum + movie.runtime, 0);

  return {
    target: { id: target.id, title: target.title },
    order,
    totalCount: order.length,
    watchedCount,
    remainingMinutes,
  };
};
