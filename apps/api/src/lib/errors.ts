import type { ErrorCode } from "@dealer/shared";

/**
 * An error that maps directly onto the API's error envelope. Anything else
 * reaching the error handler is a bug and becomes a 500.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}
