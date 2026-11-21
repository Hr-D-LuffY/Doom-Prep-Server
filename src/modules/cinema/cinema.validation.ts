import { AppError } from "../../errors/AppError";
import { isPlainObject, validationError } from "../../lib/validators";
import type { CreateCinemaInput } from "./cinema.interface";

const MAX_NAME_LENGTH = 100;
const MIN_BUNDLE_TYPES = 1;
const MAX_BUNDLE_TYPES = 10;
const MIN_BUNDLE_SIZE = 1;
const MAX_BUNDLE_SIZE = 500;

const parseName = (value: unknown): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw validationError("name must be a non-empty string");
  }
  const name = value.trim();
  if (name.length > MAX_NAME_LENGTH) {
    throw validationError(`name must be at most ${MAX_NAME_LENGTH} characters`);
  }
  return name;
};

const parseBundleSizes = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    throw validationError("bundleSizes must be an array of numbers");
  }
  if (value.length < MIN_BUNDLE_TYPES || value.length > MAX_BUNDLE_TYPES) {
    throw validationError(
      `bundleSizes must contain between ${MIN_BUNDLE_TYPES} and ${MAX_BUNDLE_TYPES} sizes`,
    );
  }

  const sizes: number[] = [];
  for (const item of value) {
    if (
      typeof item !== "number" ||
      !Number.isInteger(item) ||
      item < MIN_BUNDLE_SIZE ||
      item > MAX_BUNDLE_SIZE
    ) {
      throw validationError(
        `each bundle size must be an integer between ${MIN_BUNDLE_SIZE} and ${MAX_BUNDLE_SIZE}`,
      );
    }
    sizes.push(item);
  }

  if (new Set(sizes).size !== sizes.length) {
    throw validationError("bundleSizes must not contain duplicate sizes");
  }

  return sizes.sort((a, b) => a - b);
};

const parseCreateCinema = (body: unknown): CreateCinemaInput => {
  if (!isPlainObject(body)) {
    throw validationError("cinema must be a JSON object");
  }
  return {
    name: parseName(body.name),
    bundleSizes: parseBundleSizes(body.bundleSizes),
  };
};

export const validateCreateCinemas = (body: unknown): CreateCinemaInput[] => {
  if (!Array.isArray(body)) {
    return [parseCreateCinema(body)];
  }
  if (body.length === 0) {
    throw validationError("cinema array must not be empty");
  }

  const cinemas = body.map((item, index) => {
    try {
      return parseCreateCinema(item);
    } catch (error) {
      if (error instanceof AppError) {
        throw validationError(`cinemas[${index}]: ${error.message}`);
      }
      throw error;
    }
  });

  const names = new Set<string>();
  for (const cinema of cinemas) {
    if (names.has(cinema.name)) {
      throw new AppError(
        409,
        "DUPLICATE_NAME",
        `Name "${cinema.name}" appears more than once in the request`,
      );
    }
    names.add(cinema.name);
  }
  return cinemas;
};
