"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { cancelMutationAction, confirmMutationAction } from "@/modules/agent/agent.actions";

import { toolNameOf, type ToolPart } from "./parts";

interface Props {
  part: ToolPart;
  sessionId: string;
  messageId: string;
  /** Feed the outcome back into the chat so the transcript is complete. */
  onResolved: (args: { toolName: string; toolCallId: string; output: unknown }) => void;
}

type Local = "idle" | "working" | "error";

export function ConfirmationCard({ part, sessionId, messageId, onResolved }: Props) {
  const name = toolNameOf(part);
  const input = (part.input ?? {}) as Record<string, unknown>;
  const [local, setLocal] = useState<Local>("idle");
  const [localError, setLocalError] = useState<string | null>(null);

  const resolved =
    part.state === "output-available"
      ? (part.output as Record<string, unknown> | undefined)
      : undefined;
  const badArgs = part.state === "output-error";

  async function confirm() {
    setLocal("working");
    setLocalError(null);
    try {
      const res = await confirmMutationAction({
        sessionId,
        messageId,
        toolCallId: part.toolCallId,
        toolName: name,
        input: part.input,
      });
      if (res.ok) {
        onResolved({ toolName: name, toolCallId: part.toolCallId, output: res.output });
      } else {
        setLocal("error");
        setLocalError(res.error ?? "That didn't work.");
        onResolved({ toolName: name, toolCallId: part.toolCallId, output: res.output });
      }
    } catch {
      setLocal("error");
      setLocalError("Something went wrong. Try again.");
    }
  }

  async function cancel() {
    setLocal("working");
    try {
      await cancelMutationAction({ sessionId, messageId, toolCallId: part.toolCallId });
    } catch {
      // best-effort
    }
    onResolved({ toolName: name, toolCallId: part.toolCallId, output: { status: "cancelled" } });
  }

  // ---- resolved states ---------------------------------------------------
  if (resolved?.status === "cancelled") {
    return <Line tone="muted">You cancelled this.</Line>;
  }
  if (resolved?.status === "error") {
    return <Line tone="error">{String(resolved.error ?? "That action failed.")}</Line>;
  }
  if (resolved) {
    return (
      <Line tone="done">
        {doneLabel(name, resolved)}
        {typeof resolved.url === "string" ? (
          <>
            {" · "}
            <Link href={resolved.url} className="text-accent font-medium hover:underline">
              Open
            </Link>
          </>
        ) : null}
      </Line>
    );
  }
  if (badArgs) {
    return <Line tone="error">The assistant proposed an invalid action.</Line>;
  }

  // ---- pending: show what will happen + Confirm / Cancel ----------------
  return (
    <div className="border-accent/40 bg-accent-soft/40 my-1.5 max-w-full rounded-lg border p-3 text-sm">
      <p className="text-ink font-medium">{title(name)}</p>
      <div className="text-muted mt-1.5 space-y-1 text-xs">{preview(name, input)}</div>

      {local === "error" ? <p className="text-danger mt-2 text-xs">{localError}</p> : null}

      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          onClick={confirm}
          disabled={local === "working"}
          aria-busy={local === "working"}
        >
          {local === "working" ? "Working…" : "Confirm"}
        </Button>
        <Button size="sm" variant="ghost" onClick={cancel} disabled={local === "working"}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function Line({ tone, children }: { tone: "done" | "muted" | "error"; children: React.ReactNode }) {
  return (
    <p
      className={cn(
        "my-1 text-xs",
        tone === "done" && "text-success",
        tone === "muted" && "text-muted",
        tone === "error" && "text-danger",
      )}
    >
      {tone === "done" ? "✓ " : ""}
      {children}
    </p>
  );
}

// ---- copy -----------------------------------------------------------------

function title(name: string): string {
  if (name === "createItinerary") return "Create this itinerary?";
  if (name === "updateItinerary") return "Apply these changes?";
  if (name === "sendMessage") return "Send this message?";
  return "Confirm this action?";
}

function doneLabel(name: string, out: Record<string, unknown>): string {
  if (name === "createItinerary") return `Created "${String(out.title ?? "itinerary")}"`;
  if (name === "updateItinerary") {
    const changed = Array.isArray(out.changed) ? out.changed.join(", ") : "the itinerary";
    return `Updated ${changed}`;
  }
  if (name === "sendMessage") return `Message sent to ${String(out.recipient ?? "the recipient")}`;
  return "Done";
}

function preview(name: string, input: Record<string, unknown>): React.ReactNode {
  if (name === "sendMessage") {
    const to = input.recipientHandle
      ? `@${String(input.recipientHandle)}`
      : input.journeySlug
        ? "the journey's author"
        : "the recipient";
    return (
      <>
        <p>
          To <span className="text-ink">{to}</span>:
        </p>
        <blockquote className="border-border-strong text-ink border-l-2 pl-2 whitespace-pre-wrap">
          {String(input.body ?? "")}
        </blockquote>
      </>
    );
  }

  if (name === "createItinerary") {
    const days = Array.isArray(input.days) ? input.days.length : 0;
    return (
      <>
        <p>
          Title: <span className="text-ink">{String(input.title ?? "")}</span>
        </p>
        {input.fromJourneySlug ? <p>Forked from a published journey.</p> : null}
        {input.destination ? <p>Destination: {String(input.destination)}</p> : null}
        {days ? (
          <p>
            {days} day{days === 1 ? "" : "s"} planned.
          </p>
        ) : null}
      </>
    );
  }

  if (name === "updateItinerary") {
    const fields = ["title", "destination", "country", "notes", "status"]
      .filter((f) => input[f] !== undefined)
      .concat(Array.isArray(input.days) && input.days.length ? ["day plan"] : []);
    return (
      <>
        <p>
          Itinerary: <span className="text-ink">{String(input.itinerary ?? "")}</span>
        </p>
        <p>Changing: {fields.length ? fields.join(", ") : "nothing"}</p>
        {input.status ? <p>New status: {String(input.status)}</p> : null}
        {input.title ? <p>New title: {String(input.title)}</p> : null}
      </>
    );
  }

  return <p>{JSON.stringify(input)}</p>;
}
