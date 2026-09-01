import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/** Centres content and applies the standard page gutter. */
export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-6xl px-6 md:px-8", className)} {...props} />;
}
