import { cn } from "@/lib/utils";

interface ChoiceChipProps {
  type: "checkbox" | "radio";
  name: string;
  value: string;
  label: string;
  defaultChecked?: boolean;
  className?: string;
}

/**
 * A pill that toggles a hidden checkbox/radio. Selected styling is driven purely
 * by `:has(:checked)` — no client JS, so it works inside a plain <form>.
 */
export function ChoiceChip({
  type,
  name,
  value,
  label,
  defaultChecked,
  className,
}: ChoiceChipProps) {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-center rounded-full border px-3 py-1.5 text-sm transition-colors select-none",
        "border-border-strong text-muted hover:bg-surface-muted",
        "has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-ink",
        "has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-bg has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2",
        className,
      )}
    >
      <input
        type={type}
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="sr-only"
      />
      {label}
    </label>
  );
}
