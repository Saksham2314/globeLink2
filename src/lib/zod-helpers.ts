import { z } from "zod";

/**
 * Shared Zod field helpers for form + server-action input. They all tolerate
 * `string | null | undefined` because server-action serialization turns empty
 * nested values into `null` and missing keys into `undefined`.
 */

/** Optional trimmed string → `string | null`. `.max()` truncates, not errors. */
export const trimmedOptional = (max: number) =>
  z.union([z.string(), z.null(), z.undefined()]).transform((v) => {
    const s = typeof v === "string" ? v.trim() : "";
    return s.length > 0 ? s.slice(0, max) : null;
  });

/** Major-unit amount (string or number) → integer minor units (× 100), or null.
 *  Invalid input clears the field rather than blocking the whole save. */
export const minorUnits = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
  });

/** "" | null | undefined → null; otherwise coerce to a Date. */
export const optionalDate = z
  .union([z.string(), z.date(), z.null(), z.undefined()])
  .transform((v, ctx) => {
    if (v === null || v === undefined || v === "") return null;
    const d = v instanceof Date ? v : new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "That date isn't valid" });
      return z.NEVER;
    }
    return d;
  });
