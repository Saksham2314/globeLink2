import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function NotFound() {
  return (
    <Container className="flex min-h-dvh flex-col items-center justify-center text-center">
      <p className="font-display text-accent text-6xl">404</p>
      <h1 className="text-ink mt-4 text-2xl">We couldn&rsquo;t find that page</h1>
      <p className="text-muted mt-2 max-w-sm">
        The link may be broken, or the page may have moved.
      </p>
      <Button asChild className="mt-8">
        <Link href="/">Back to home</Link>
      </Button>
    </Container>
  );
}
