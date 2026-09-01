"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client-side boundary: surface to the browser console. Server-side errors
    // are already captured by the platform logs.
    console.error(error);
  }, [error]);

  return (
    <Container className="flex min-h-dvh flex-col items-center justify-center text-center">
      <p className="font-display text-accent text-5xl">Something broke</p>
      <h1 className="text-ink mt-4 text-2xl">An unexpected error occurred</h1>
      <p className="text-muted mt-2 max-w-sm">
        Try again in a moment. If it keeps happening, the issue is on our side.
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
