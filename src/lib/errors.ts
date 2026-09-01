/**
 * Typed application errors.
 *
 * Throw an `AppError` anywhere in a service or route when something goes wrong
 * in a *known* way. The transport layer (route handlers / server actions) can
 * then translate it into a consistent HTTP response via `toErrorResponse`,
 * without leaking internal details for 5xx errors.
 */

export const ERROR_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

export interface SerializedError {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

interface AppErrorOptions {
  /** Machine-readable context safe to send to the client (validation issues…). */
  details?: unknown;
  /** Underlying error, preserved for logs. */
  cause?: unknown;
  /** Whether `message` is safe to expose to the client. Defaults to true for
   *  every code except INTERNAL. */
  expose?: boolean;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;
  readonly expose: boolean;

  constructor(code: ErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.status = ERROR_STATUS[code];
    this.details = options.details;
    this.expose = options.expose ?? code !== "INTERNAL";
    // Restore prototype chain (TS target ES2022 transpiles `extends Error`).
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static badRequest(message = "Bad request", details?: unknown) {
    return new AppError("BAD_REQUEST", message, { details });
  }
  static unauthorized(message = "Authentication required") {
    return new AppError("UNAUTHORIZED", message);
  }
  static forbidden(message = "You do not have access to this resource") {
    return new AppError("FORBIDDEN", message);
  }
  static notFound(message = "Resource not found") {
    return new AppError("NOT_FOUND", message);
  }
  static conflict(message = "That resource already exists") {
    return new AppError("CONFLICT", message);
  }
  static unprocessable(message = "The request could not be processed", details?: unknown) {
    return new AppError("UNPROCESSABLE", message, { details });
  }
  static rateLimited(message = "Too many requests — slow down") {
    return new AppError("RATE_LIMITED", message);
  }
  static internal(message = "Something went wrong", cause?: unknown) {
    return new AppError("INTERNAL", message, { cause, expose: false });
  }

  /** Client-safe JSON body. Internal messages are masked. */
  serialize(): SerializedError {
    return {
      error: {
        code: this.code,
        message: this.expose ? this.message : "Something went wrong",
        ...(this.expose && this.details !== undefined ? { details: this.details } : {}),
      },
    };
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

/** Coerce any thrown value into an `AppError` (unknown -> INTERNAL). */
export function toAppError(value: unknown): AppError {
  if (isAppError(value)) return value;
  if (value instanceof Error) return AppError.internal(value.message, value);
  return AppError.internal("Unknown error", value);
}

/** Shape a thrown value into an HTTP status + client-safe body. */
export function toErrorResponse(value: unknown): { status: number; body: SerializedError } {
  const err = toAppError(value);
  return { status: err.status, body: err.serialize() };
}
