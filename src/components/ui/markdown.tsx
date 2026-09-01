import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/**
 * Renders user-authored markdown. `rehype-sanitize` strips anything unsafe
 * (scripts, event handlers, raw HTML), so this is safe for arbitrary input.
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn(
        "text-ink space-y-3 text-[0.95rem] leading-relaxed",
        "[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2",
        "[&_h2]:font-display [&_h2]:text-ink [&_h2]:text-lg [&_h3]:font-medium",
        "[&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5",
        "[&_blockquote]:border-border-strong [&_blockquote]:text-muted [&_blockquote]:border-l-2 [&_blockquote]:pl-3",
        "[&_code]:bg-surface-muted [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
