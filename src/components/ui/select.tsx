import { forwardRef, type SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean };

/** Styled native <select> — accessible, works inside a plain form, no JS. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "bg-surface text-ink h-10 w-full rounded-md border px-3 text-sm shadow-sm",
        "focus-visible:ring-accent focus-visible:ring-offset-bg transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-60",
        invalid ? "border-danger focus-visible:ring-danger" : "border-border-strong",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});
