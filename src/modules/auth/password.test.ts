import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies a correct password against its hash", async () => {
    const hash = await hashPassword("correct horse battery 7");
    expect(hash).not.toContain("correct horse");
    expect(await verifyPassword("correct horse battery 7", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("s3cret-value");
    expect(await verifyPassword("wrong-value", hash)).toBe(false);
  });

  it("produces a distinct hash each time (salted)", async () => {
    const [a, b] = await Promise.all([hashPassword("same-pass-1"), hashPassword("same-pass-1")]);
    expect(a).not.toBe(b);
  });
});
