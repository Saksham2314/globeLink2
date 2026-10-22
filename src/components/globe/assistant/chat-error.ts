/** The chat transport puts the raw response body in `error.message`; the agent
 *  route answers limits/outages with `{ "error": "…" }`, so unwrap that. */
export function readableError(error: Error): string {
  const raw = error.message?.trim();
  if (!raw) return "Something went wrong. Try again.";
  if (raw.startsWith("{")) {
    try {
      const body = JSON.parse(raw) as { error?: unknown };
      if (typeof body.error === "string" && body.error.trim()) return body.error;
    } catch {
      // not JSON after all — fall through
    }
    return "Something went wrong. Try again.";
  }
  if (raw === "Unauthorized") return "Your session has ended — sign in again to keep chatting.";
  if (raw === "Bad request") return "That message couldn't be sent. Try again.";
  return raw;
}
