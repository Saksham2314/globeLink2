import "server-only";

import { db } from "@/lib/db";

/**
 * Read-only "Assistant activity" feed for Settings: recent data changes the
 * assistant made (`AuditLog`) interleaved with recent assistant turns
 * (`AgentRun`). No admin surface — a user only ever sees their own rows.
 */

export interface ActivityItem {
  id: string;
  kind: "change" | "run";
  at: string;
  title: string;
  detail: string;
  outcome?: "OK" | "ERROR" | "TIMEOUT" | "RATE_LIMITED";
}

const ACTION_TITLE: Record<string, string> = {
  saveJourney: "Saved a journey",
  createItinerary: "Created an itinerary",
  updateItinerary: "Updated an itinerary",
  sendMessage: "Sent a message",
};

const nf = new Intl.NumberFormat("en-US");

export async function getAssistantActivity(userId: string, limit = 15): Promise<ActivityItem[]> {
  const [changes, runs] = await Promise.all([
    db.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    db.agentRun.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const items: ActivityItem[] = [
    ...changes.map((c): ActivityItem => ({
      id: c.id,
      kind: "change",
      at: c.createdAt.toISOString(),
      title: ACTION_TITLE[c.action] ?? "Made a change",
      detail: c.summary,
    })),
    ...runs.map((r): ActivityItem => {
      const bits = [
        `${nf.format(r.totalTokens)} tokens`,
        `${r.steps} step${r.steps === 1 ? "" : "s"}`,
      ];
      if (r.toolNames.length) bits.push([...new Set(r.toolNames)].join(", "));
      return {
        id: r.id,
        kind: "run",
        at: r.createdAt.toISOString(),
        title: "Assistant turn",
        detail: bits.join(" · "),
        outcome: r.outcome,
      };
    }),
  ];

  items.sort((a, b) => (a.at < b.at ? 1 : -1));
  return items.slice(0, limit);
}
