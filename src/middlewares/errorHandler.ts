import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";

const isInvalidJsonError = (err: unknown): boolean => {
  return (
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    (err as { type?: string }).type === "entity.parse.failed"
  );
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    res
      .status(err.statusCode)
      .json({ error: { code: err.code, message: err.message } });
    return;
  }

  if (isInvalidJsonError(err)) {
    res
      .status(400)
      .json({
        error: {
          code: "INVALID_JSON",
          message: "Request body contains invalid JSON",
        },
      });
    return;
  }

  console.error(err);
  res
    .status(500)
    .json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Something went wrong" },
    });
};
