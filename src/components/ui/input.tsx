import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, type = "text", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        "bg-surface text-ink h-10 w-full rounded-md border px-3 text-sm shadow-sm",
        "placeholder:text-muted/70",
        "focus-visible:ring-accent focus-visible:ring-offset-bg transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-60",
        invalid ? "border-danger focus-visible:ring-danger" : "border-border-strong",
        className,
      )}
      {...props}
    />
  );
});
