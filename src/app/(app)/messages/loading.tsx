import { ListSkeleton, Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/ui/container";

export default function Loading() {
  return (
    <Container className="py-10">
      <Skeleton className="h-9 w-40" />
      <div className="mt-6 max-w-xl">
        <ListSkeleton rows={5} />
      </div>
    </Container>
  );
}
