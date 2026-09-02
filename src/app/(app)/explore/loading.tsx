import { CardGridSkeleton, Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/ui/container";

export default function Loading() {
  return (
    <Container className="py-10">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-3 h-11 w-full max-w-xl" />
      <div className="mt-4 flex flex-wrap gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="mt-8">
        <CardGridSkeleton count={9} />
      </div>
    </Container>
  );
}
