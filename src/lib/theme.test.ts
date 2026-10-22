import { describe, expect, it } from "vitest";

import {
  DEFAULT_THEME_PREFERENCE,
  getStoredPreference,
  readStoredPreference,
  themeToAdopt,
} from "./theme";

describe("themeToAdopt", () => {
  it("never overrides a choice made on this device", () => {
    expect(themeToAdopt("light", "dark")).toBeNull();
    expect(themeToAdopt("dark", "light")).toBeNull();
    expect(themeToAdopt("system", "dark")).toBeNull();
  });

  it("adopts the account's theme on a device that has never chosen", () => {
    expect(themeToAdopt(null, "light")).toBe("light");
    expect(themeToAdopt(null, "system")).toBe("system");
  });

  it("does nothing when the account has no theme", () => {
    expect(themeToAdopt(null, null)).toBeNull();
    expect(themeToAdopt("light", null)).toBeNull();
  });
});

describe("defaults", () => {
  it("is dark when nothing is stored", () => {
    expect(DEFAULT_THEME_PREFERENCE).toBe("dark");
    expect(readStoredPreference()).toBeNull();
    expect(getStoredPreference()).toBe("dark");
  });
});
