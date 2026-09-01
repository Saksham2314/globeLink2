import { describe, expect, it } from "vitest";

import { assertOwnership, requireSession } from "./authz";

describe("requireSession", () => {
  it("returns the session when a user id is present", () => {
    const session = { user: { id: "u1", email: "a@b.com" }, expires: "" };
    expect(requireSession(session).user.id).toBe("u1");
  });

  it("throws 401 for a null session", () => {
    expect(() => requireSession(null)).toThrow(expect.objectContaining({ status: 401 }));
  });

  it("throws 401 when the session has no user id", () => {
    // @ts-expect-error — intentionally malformed
    expect(() => requireSession({ expires: "" })).toThrow(expect.objectContaining({ status: 401 }));
  });
});

describe("assertOwnership", () => {
  it("passes when ids match", () => {
    expect(() => assertOwnership("u1", "u1")).not.toThrow();
  });

  it("throws 403 when ids differ", () => {
    expect(() => assertOwnership("u1", "u2")).toThrow(expect.objectContaining({ status: 403 }));
  });
});
