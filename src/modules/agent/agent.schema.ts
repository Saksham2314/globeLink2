import { z } from "zod";

/**
 * Request body for `POST /api/agent`. The client transport sends only the new
 * user message plus the session id; the server loads the rest of the history.
 * The message is validated loosely here — the AI SDK does the structural check
 * when it converts to model messages.
 */
export const agentRequestSchema = z.object({
  sessionId: z.string().min(1).max(64),
  message: z
    .object({
      id: z.string().optional(),
      role: z.literal("user"),
      parts: z.array(z.object({ type: z.string() }).passthrough()).min(1),
    })
    .passthrough(),
});
export type AgentRequest = z.infer<typeof agentRequestSchema>;

export const renameSessionSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().trim().min(1, "Give it a name").max(80),
});

/** The plain text the user typed, from a UIMessage's parts. */
export function userMessageText(parts: Array<{ type: string; text?: unknown }>): string {
  return parts
    .filter(
      (p): p is { type: "text"; text: string } => p.type === "text" && typeof p.text === "string",
    )
    .map((p) => p.text)
    .join(" ")
    .trim();
}
