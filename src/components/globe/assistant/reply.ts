import type { UIMessage } from "ai";

/**
 * WhatsApp-style "reply to a message". Kept as a plain-text convention rather
 * than a schema change: the quoted excerpt is prepended to the user's message
 * with a marker the model understands as context, stored verbatim in the
 * message's text part, and split back out for display.
 */

export interface QuotedReply {
  role: "user" | "assistant";
  text: string;
}

const MAX_QUOTE = 240;
const MARKER = /^⟪reply to (user|assistant)⟫\n"([\s\S]*?)"\n\n([\s\S]*)$/;

/** Prepend a quoted-reply block to the outgoing user text. */
export function composeWithReply(text: string, reply: QuotedReply | null): string {
  if (!reply) return text;
  const quote = reply.text.replace(/\s+/g, " ").trim().slice(0, MAX_QUOTE);
  if (!quote) return text;
  return `⟪reply to ${reply.role}⟫\n"${quote}"\n\n${text}`;
}

/** Split a stored message body into its quoted-reply block (if any) and the rest. */
export function splitReply(body: string): { quote: QuotedReply | null; text: string } {
  const m = MARKER.exec(body);
  if (!m) return { quote: null, text: body };
  return {
    quote: { role: m[1] === "user" ? "user" : "assistant", text: m[2] ?? "" },
    text: m[3] ?? "",
  };
}

/** Flatten a message's text parts to one string (for quoting from). */
export function messagePlainText(message: UIMessage): string {
  return (message.parts ?? [])
    .filter(
      (p): p is { type: "text"; text: string } =>
        p.type === "text" && typeof (p as { text?: unknown }).text === "string",
    )
    .map((p) => p.text)
    .join(" ")
    .trim();
}

/** The text to quote when the user hits "reply" on a message — the body only,
 *  never the marker of a message that was itself a reply. */
export function quotableText(message: UIMessage): string {
  return splitReply(messagePlainText(message)).text;
}
