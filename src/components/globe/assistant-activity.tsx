import { formatTimeAgo } from "@/lib/format";
import type { ActivityItem } from "@/modules/agent/activity.service";

/** Read-only recent-activity list for Settings. Server-rendered; no controls. */
export function AssistantActivity({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-muted text-sm">
        Nothing yet. Changes the assistant makes for you — and each turn it takes — will show up
        here.
      </p>
    );
  }

  return (
    <ul className="divide-border border-border divide-y rounded-lg border">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 px-3.5 py-2.5">
          <span
            aria-hidden
            className={
              "mt-1.5 size-1.5 shrink-0 rounded-full " +
              (item.outcome && item.outcome !== "OK" ? "bg-danger" : "bg-accent/60")
            }
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-ink truncate text-sm font-medium">
                {item.title}
                {item.kind === "change" ? (
                  <span className="text-muted ml-2 text-xs font-normal">by the assistant</span>
                ) : null}
              </p>
              <time className="text-muted shrink-0 text-xs" dateTime={item.at}>
                {formatTimeAgo(item.at)}
              </time>
            </div>
            <p className="text-muted truncate text-xs">
              {item.detail}
              {item.outcome && item.outcome !== "OK" ? ` · ${item.outcome.toLowerCase()}` : ""}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
