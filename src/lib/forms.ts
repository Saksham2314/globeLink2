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
  /**
   * What was submitted, echoed back on failure. React resets a form's fields
   * after its action runs — even when validation failed — so forms use these
   * as `defaultValue` to keep the visitor's input instead of wiping it.
   */
  values?: Record<string, string>;
}

/** The submitted text of the named fields, for `FormState.values`. */
export function submittedValues(formData: FormData, names: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of names) {
    const v = formData.get(name);
    if (typeof v === "string") out[name] = v;
  }
  return out;
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
