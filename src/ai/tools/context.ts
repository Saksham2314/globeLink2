/**
 * Every tool handler runs with the identity of the acting user — never
 * elevated. Read tools scope to what that user may see; mutate tools re-check
 * ownership inside the domain service. `userId` is null only for anonymous
 * callers of read-only tools (e.g. natural-language search while signed out).
 */
export interface ToolContext {
  userId: string | null;
  /** The agent session this call belongs to, when invoked from the orchestrator.
   *  Null for direct/standalone tool calls. Recorded on the AgentToolCall row. */
  sessionId?: string | null;
  /** Reserved for future role-based tool filtering. */
  role?: "user" | "admin";
}
