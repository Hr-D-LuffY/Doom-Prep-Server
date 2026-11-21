import { AppError } from "../errors/AppError";

export const validationError = (message: string) =>
  new AppError(400, "VALIDATION_ERROR", message);

export const isPlainObject = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const validateId = (raw: unknown): number => {
  const id = typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isSafeInteger(id) || id < 1) {
    throw validationError("id must be a positive integer");
  }
  return id;
};
