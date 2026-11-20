import { AppError } from "../../errors/AppError";
import { CreateMovieInput } from "./movie.interface";

const MIN_RELEASE_YEAR = 1900;
const MAX_RELEASE_YEAR = 2100;
const MIN_RUNTIME = 1;
const MAX_RUNTIME = 300;
const MAX_TITLE_LENGTH = 200;

const validationError = (message: string) =>
  new AppError(400, "VALIDATION_ERROR", message);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const parseTitle = (value: unknown): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw validationError("title must be a non-empty string");
  }
  const title = value.trim();
  if (title.length > MAX_TITLE_LENGTH) {
    throw validationError(
      `title must be at most ${MAX_TITLE_LENGTH} characters`,
    );
  }
  return title;
};

export const parseIntegerInRange = (
  value: unknown,
  field: string,
  min: number,
  max: number,
): number => {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    throw validationError(
      `${field} must be an integer between ${min} and ${max}`,
    );
  }
  return value;
};

export const parseWatched = (value: unknown): boolean => {
  if (typeof value !== "boolean") {
    throw validationError("watched must be true or false");
  }
  return value;
};

export const parsePrerequisites = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    throw validationError("prerequisites must be an array of movie ids");
  }
  const ids: number[] = [];
  for (const item of value) {
    if (typeof item !== "number" || !Number.isInteger(item) || item < 1) {
      throw validationError(
        "prerequisites must contain only positive integer ids",
      );
    }
    ids.push(item);
  }
  if (new Set(ids).size !== ids.length) {
    throw validationError("prerequisites must not contain duplicate ids");
  }
  return ids;
};

const parseCreateMovie = (body: unknown): CreateMovieInput => {
  if (!isPlainObject(body)) {
    throw validationError("movie must be a JSON object");
  }
  return {
    title: parseTitle(body.title),
    releaseYear: parseIntegerInRange(
      body.releaseYear,
      "releaseYear",
      MIN_RELEASE_YEAR,
      MAX_RELEASE_YEAR,
    ),
    runtime: parseIntegerInRange(
      body.runtime,
      "runtime",
      MIN_RUNTIME,
      MAX_RUNTIME,
    ),
    prerequisites:
      body.prerequisites === undefined
        ? []
        : parsePrerequisites(body.prerequisites),
    watched: body.watched === undefined ? false : parseWatched(body.watched),
  };
};

// Accepts one movie object or an array of movies
export const validateCreateMovies = (body: unknown): CreateMovieInput[] => {
  if (!Array.isArray(body)) {
    return [parseCreateMovie(body)];
  }
  if (body.length === 0) {
    throw validationError("movie array must not be empty");
  }

  const movies = body.map((item, index) => {
    try {
      return parseCreateMovie(item);
    } catch (error) {
      if (error instanceof AppError) {
        throw validationError(`movies[${index}]: ${error.message}`);
      }
      throw error;
    }
  });

  const titles = new Set<string>();
  for (const movie of movies) {
    if (titles.has(movie.title)) {
      throw new AppError(
        409,
        "DUPLICATE_TITLE",
        `Title "${movie.title}" appears more than once in the request`,
      );
    }
    titles.add(movie.title);
  }
  return movies;
};

export const validateId = (raw: unknown): number => {
  const id = typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isSafeInteger(id) || id < 1) {
    throw validationError("id must be a positive integer");
  }
  return id;
};

import { UpdateMovieInput } from "./movie.interface"; // add to the existing import

const UPDATABLE_FIELDS = [
  "title",
  "releaseYear",
  "runtime",
  "watched",
  "prerequisites",
];

export const validateUpdateMovie = (body: unknown): UpdateMovieInput => {
  if (!isPlainObject(body)) {
    throw validationError("request body must be a JSON object");
  }
  const keys = Object.keys(body);
  if (keys.length === 0) {
    throw validationError("provide at least one field to update");
  }
  const unknown = keys.filter((key) => !UPDATABLE_FIELDS.includes(key));
  if (unknown.length > 0) {
    throw validationError(`unknown field(s): ${unknown.join(", ")}`);
  }

  const input: UpdateMovieInput = {};
  if (body.title !== undefined) input.title = parseTitle(body.title);
  if (body.releaseYear !== undefined) {
    input.releaseYear = parseIntegerInRange(
      body.releaseYear,
      "releaseYear",
      MIN_RELEASE_YEAR,
      MAX_RELEASE_YEAR,
    );
  }
  if (body.runtime !== undefined) {
    input.runtime = parseIntegerInRange(
      body.runtime,
      "runtime",
      MIN_RUNTIME,
      MAX_RUNTIME,
    );
  }
  if (body.watched !== undefined) input.watched = parseWatched(body.watched);
  if (body.prerequisites !== undefined)
    input.prerequisites = parsePrerequisites(body.prerequisites);
  return input;
};
