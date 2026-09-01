import type { LabelHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-ink text-sm font-medium", className)} {...props} />;
}

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

/** Label + control + hint/error, with the wiring for accessible error text. */
export function Field({ label, htmlFor, error, hint, children, className }: FieldProps) {
  const describedBy = error ? `${htmlFor}-error` : hint ? `${htmlFor}-hint` : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      <div aria-describedby={describedBy}>{children}</div>
      {hint && !error ? (
        <p id={`${htmlFor}-hint`} className="text-muted text-xs">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-danger text-xs font-medium">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Form-level error / success banner. */
export function FormMessage({ error, message }: { error?: string; message?: string }) {
  if (error) {
    return (
      <p className="border-danger/40 bg-danger-soft text-danger rounded-md border px-3 py-2 text-sm">
        {error}
      </p>
    );
  }
  if (message) {
    return (
      <p className="border-success/40 bg-success/10 text-success rounded-md border px-3 py-2 text-sm">
        {message}
      </p>
    );
  }
  return null;
}
