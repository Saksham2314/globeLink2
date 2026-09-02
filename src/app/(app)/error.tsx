"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

/** Segment error boundary for the signed-in app. Keeps the header/footer shell;
 *  only the page content is replaced. */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="font-display text-accent text-4xl">This page hit a snag</p>
      <p className="text-muted mt-3 max-w-sm text-sm">
        Something went wrong loading this view. Try again — if it keeps happening, it&rsquo;s on our
        side.
      </p>
      {error.digest ? (
        <p className="text-muted mt-3 font-mono text-xs">Reference: {error.digest}</p>
      ) : null}
      <Button onClick={reset} className="mt-8">
        Try again
      </Button>
    </Container>
  );
}
