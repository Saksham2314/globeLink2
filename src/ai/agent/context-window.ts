import type { UIMessage } from "ai";

/**
 * Context budgeting for the agent loop. Small model + short Vercel function
 * window, so keep it simple: a fixed message count, with older turns folded
 * into `AgentSession.summary`.
 */

export const MAX_CONTEXT_MESSAGES = 20;
export const SUMMARIZE_AFTER_MESSAGES = 30;

export interface MessageWindow {
  /** The most recent messages, sent to the model verbatim. */
  window: UIMessage[];
  /** Older messages that fell outside the window — candidates for the summary. */
  overflow: UIMessage[];
}

export function windowMessages(all: UIMessage[], max = MAX_CONTEXT_MESSAGES): MessageWindow {
  if (all.length <= max) return { window: all, overflow: [] };
  const cut = all.length - max;
  return { window: all.slice(cut), overflow: all.slice(0, cut) };
}

/** Once a session gets long, refresh the rolling summary from the overflow. */
export function shouldRefreshSummary(totalMessages: number): boolean {
  return totalMessages >= SUMMARIZE_AFTER_MESSAGES;
}

const isTextPart = (p: unknown): p is { type: "text"; text: string } =>
  typeof p === "object" &&
  p !== null &&
  (p as { type?: unknown }).type === "text" &&
  typeof (p as { text?: unknown }).text === "string";

const isToolPart = (p: unknown): boolean => {
  const type = (p as { type?: unknown })?.type;
  return typeof type === "string" && (type.startsWith("tool-") || type === "dynamic-tool");
};

/** Flatten messages to plain text for the summarizer prompt. Messages with no
 *  text and no tool use are dropped. */
export function messagesToPlainText(messages: UIMessage[]): string {
  return messages
    .map((m) => {
      const parts = m.parts ?? [];
      const text = parts
        .filter(isTextPart)
        .map((p) => p.text)
        .join(" ")
        .trim();
      const content = [text, parts.some(isToolPart) ? "[used a tool]" : ""]
        .filter(Boolean)
        .join(" ");
      return content ? `${m.role.toUpperCase()}: ${content}` : "";
    })
    .filter(Boolean)
    .join("\n");
}
