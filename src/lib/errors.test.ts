import { describe, expect, it } from "vitest";

import { AppError, isAppError, toAppError, toErrorResponse } from "@/lib/errors";

describe("AppError", () => {
  it("maps each code to the correct HTTP status", () => {
    expect(AppError.badRequest().status).toBe(400);
    expect(AppError.unauthorized().status).toBe(401);
    expect(AppError.forbidden().status).toBe(403);
    expect(AppError.notFound().status).toBe(404);
    expect(AppError.conflict().status).toBe(409);
    expect(AppError.rateLimited().status).toBe(429);
    expect(AppError.internal().status).toBe(500);
  });

  it("exposes client-error messages but masks internal ones", () => {
    expect(AppError.badRequest("Missing title").serialize().error.message).toBe("Missing title");
    expect(AppError.internal("db connection exploded").serialize().error.message).toBe(
      "Something went wrong",
    );
  });

  it("includes details only when the error is exposable", () => {
    const exposed = AppError.badRequest("Invalid", { field: "email" }).serialize();
    expect(exposed.error.details).toEqual({ field: "email" });

    const hidden = new AppError("INTERNAL", "boom", { details: { field: "email" } }).serialize();
    expect(hidden.error.details).toBeUndefined();
  });
});

describe("toAppError", () => {
  it("passes AppError instances through untouched", () => {
    const original = AppError.notFound();
    expect(toAppError(original)).toBe(original);
  });

  it("wraps native errors as INTERNAL", () => {
    const wrapped = toAppError(new Error("kaboom"));
    expect(isAppError(wrapped)).toBe(true);
    expect(wrapped.code).toBe("INTERNAL");
    expect(wrapped.cause).toBeInstanceOf(Error);
  });

  it("wraps non-error throwables", () => {
    expect(toAppError("a string").code).toBe("INTERNAL");
  });
});

describe("toErrorResponse", () => {
  it("returns a status and client-safe body", () => {
    expect(toErrorResponse(AppError.forbidden("nope"))).toEqual({
      status: 403,
      body: { error: { code: "FORBIDDEN", message: "nope" } },
    });
  });
});
