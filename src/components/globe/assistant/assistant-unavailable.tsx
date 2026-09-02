export function AssistantUnavailable() {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="font-display text-ink text-2xl">The assistant is offline</h1>
      <p className="text-muted mt-2 text-sm">
        This deployment doesn&rsquo;t have an AI provider configured. Journey search and everything
        else still work — try{" "}
        <a href="/explore" className="text-accent font-medium hover:underline">
          Explore
        </a>
        .
      </p>
    </div>
  );
}
