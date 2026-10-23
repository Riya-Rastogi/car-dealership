import type { ZodType } from "zod";
import { AppError } from "./errors.js";

/** Validates an untrusted value or throws the API's 400 envelope. */
export function parseOrThrow<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Request is invalid", result.error.issues);
  }

  return result.data;
}
