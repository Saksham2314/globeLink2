import { cn } from "@/lib/utils";

/** A single shimmering placeholder block. Honors `prefers-reduced-motion`
 *  (the pulse is dropped, a static tint remains). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("bg-surface-muted rounded-md motion-safe:animate-pulse", className)}
    />
  );
}

/** Cover + two text lines — matches `JourneyCard` / `ItineraryCard`. */
export function CardSkeleton() {
  return (
    <div className="border-border bg-surface overflow-hidden rounded-xl border">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

/** A responsive grid of {count} card skeletons. */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/** A stack of list rows — matches conversation / session lists. */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="border-border flex items-center gap-3 rounded-lg border p-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
