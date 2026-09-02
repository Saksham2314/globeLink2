"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { formatTimeAgo } from "@/lib/format";
import type { FormState } from "@/lib/forms";
import { cn } from "@/lib/utils";
import {
  createSessionAction,
  deleteSessionAction,
  renameSessionAction,
} from "@/modules/agent/agent.actions";
import type { AgentSessionDto } from "@/modules/agent/agent.mappers";

interface Props {
  sessions: AgentSessionDto[];
  activeId: string;
}

export function AssistantSessionList({ sessions, activeId }: Props) {
  return (
    <aside className="border-border bg-bg hidden min-h-0 flex-col rounded-lg border p-3 md:flex">
      <form action={createSessionAction}>
        <Button type="submit" size="sm" variant="secondary" className="w-full">
          + New chat
        </Button>
      </form>

      <ul className="mt-3 flex-1 space-y-1 overflow-y-auto">
        {sessions.map((s) => (
          <li key={s.id}>
            <SessionRow session={s} active={s.id === activeId} />
          </li>
        ))}
        {sessions.length === 0 ? (
          <li className="text-muted px-2 py-3 text-xs">No conversations yet.</li>
        ) : null}
      </ul>
    </aside>
  );
}

const initialForm: FormState = {};

function SessionRow({ session, active }: { session: AgentSessionDto; active: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [renameState, rename] = useActionState(renameSessionAction, initialForm);

  useEffect(() => {
    if (renameState.ok) setEditing(false);
  }, [renameState]);

  return (
    <div
      className={cn(
        "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors",
        active ? "bg-surface-muted text-ink" : "text-muted hover:bg-surface-muted/60",
      )}
    >
      {editing ? (
        <form action={rename} className="flex min-w-0 flex-1 items-center gap-1">
          <input type="hidden" name="id" value={session.id} />
          <input
            name="title"
            defaultValue={session.title}
            autoFocus
            maxLength={80}
            className="border-border-strong bg-surface text-ink min-w-0 flex-1 rounded border px-1.5 py-0.5 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditing(false);
            }}
          />
          <button type="submit" className="text-accent shrink-0 text-[11px] hover:underline">
            save
          </button>
        </form>
      ) : (
        <Link href={`/assistant/${session.id}`} className="min-w-0 flex-1">
          <span className="block truncate">{session.title}</span>
          <span className="text-muted/70 text-[11px]">{formatTimeAgo(session.lastActivityAt)}</span>
        </Link>
      )}

      {editing ? null : confirming ? (
        <button
          type="button"
          disabled={deleting}
          onClick={() => startDelete(async () => void (await deleteSessionAction(session.id)))}
          className="text-danger shrink-0 text-[11px] font-medium hover:underline"
        >
          {deleting ? "…" : "delete"}
        </button>
      ) : (
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Rename ${session.title}`}
            className="text-muted/50 hover:text-ink text-xs"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`Delete ${session.title}`}
            className="text-muted/50 hover:text-danger text-xs"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
