import { CardGridSkeleton, Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/ui/container";

export default function Loading() {
  return (
    <Container className="py-12">
      <header className="mb-8">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-2 h-4 w-56" />
      </header>
      <CardGridSkeleton count={6} />
    </Container>
  );
}
