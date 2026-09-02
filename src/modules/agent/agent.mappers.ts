import type { AgentMessage, AgentSession } from "@prisma/client";
import type { UIMessage } from "ai";

export interface AgentSessionDto {
  id: string;
  title: string;
  lastActivityAt: string;
}

export function toSessionDto(s: AgentSession): AgentSessionDto {
  return {
    id: s.id,
    title: s.title,
    lastActivityAt: s.lastActivityAt.toISOString(),
  };
}

/** Stored row → the UIMessage shape the AI SDK client and orchestrator expect.
 *  `parts` is persisted verbatim, so this is a straight cast. */
export function fromStoredMessage(m: AgentMessage): UIMessage {
  return {
    id: m.id,
    role: m.role === "USER" ? "user" : "assistant",
    parts: (m.parts as UIMessage["parts"]) ?? [],
  };
}

/** UIMessage parts → JSON-safe value for the `parts` column. */
export function toStoredParts(parts: UIMessage["parts"] | undefined): object {
  try {
    return JSON.parse(JSON.stringify(parts ?? [])) as object;
  } catch {
    return [];
  }
}
