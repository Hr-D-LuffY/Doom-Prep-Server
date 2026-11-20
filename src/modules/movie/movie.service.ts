import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import {
  CreateMovieInput,
  MovieResponse,
  MovieWithLinks,
} from "./movie.interface";

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
