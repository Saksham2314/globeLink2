import { describe, expect, it } from "vitest";

import { signInSchema, signUpSchema } from "./auth.schema";

describe("signUpSchema", () => {
  it("normalises email and accepts a valid payload", () => {
    const result = signUpSchema.parse({
      name: "  Anaya  ",
      email: "  Anaya@Example.COM ",
      password: "hillstation7",
    });
    expect(result).toEqual({ name: "Anaya", email: "anaya@example.com", password: "hillstation7" });
  });

  it("rejects a password with no digit", () => {
    const result = signUpSchema.safeParse({
      name: "A",
      email: "a@b.com",
      password: "onlyletters",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8", () => {
    const result = signUpSchema.safeParse({ name: "A", email: "a@b.com", password: "ab12" });
    expect(result.success).toBe(false);
  });

  it("requires a name", () => {
    const result = signUpSchema.safeParse({ name: "  ", email: "a@b.com", password: "abcdef12" });
    expect(result.success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("accepts any non-empty password (policy only applies at sign-up)", () => {
    expect(signInSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(signInSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
  });
});
