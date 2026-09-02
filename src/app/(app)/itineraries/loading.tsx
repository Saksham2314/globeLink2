import { CardGridSkeleton, Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/ui/container";

export default function Loading() {
  return (
    <Container className="py-12">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <Skeleton className="h-9 w-44" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-32" />
      </header>
      <CardGridSkeleton count={6} />
    </Container>
  );
}
