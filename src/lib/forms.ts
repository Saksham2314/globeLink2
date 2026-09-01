import type { ZodError } from "zod";

/** Shared return shape for `useActionState`-driven form server actions. */
export interface FormState {
  /** Form-level error message. */
  error?: string;
  /** Per-field error messages, keyed by input `name`. */
  fieldErrors?: Record<string, string>;
  /** Set on success. */
  ok?: boolean;
  /** Optional success message to surface. */
  message?: string;
}

/** Collapse a ZodError to one message per field (first wins). */
export function firstErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
