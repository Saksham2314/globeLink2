import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/**
 * Renders user-authored markdown. `rehype-sanitize` strips anything unsafe
 * (scripts, event handlers, raw HTML), so this is safe for arbitrary input.
 *
 * `tone="chat"` is for short conversational text (the assistant): tighter
 * spacing, and inline code renders as plain text rather than a highlighted box,
 * since a stray backtick or slug shouldn't look like a code snippet.
 */
export function Markdown({
  children,
  className,
  tone = "document",
}: {
  children: string;
  className?: string;
  tone?: "document" | "chat";
}) {
  const chat = tone === "chat";
  return (
    <div
      className={cn(
        "text-ink text-[0.95rem] leading-relaxed",
        chat ? "space-y-2" : "space-y-3",
        "[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2",
        "[&_h2]:font-display [&_h2]:text-ink [&_h2]:text-lg [&_h3]:font-medium",
        "[&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5",
        "[&_blockquote]:border-border-strong [&_blockquote]:text-muted [&_blockquote]:border-l-2 [&_blockquote]:pl-3",
        chat
          ? "[&_code]:font-inherit [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit"
          : "[&_code]:bg-surface-muted [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
