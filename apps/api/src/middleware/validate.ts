import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { AppError } from "../lib/errors.js";

/** Parses the request body with a shared schema and replaces it with typed data. */
export function validateBody(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      next(
        new AppError(400, "VALIDATION_ERROR", "Request body is invalid", result.error.issues),
      );
      return;
    }

    req.body = result.data;
    next();
  };
}
