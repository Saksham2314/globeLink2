import { forwardRef, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, rows = 3, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        "bg-surface text-ink w-full rounded-md border px-3 py-2 text-sm shadow-sm",
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
