import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AssistantUnavailable } from "@/components/globe/assistant/assistant-unavailable";
import { AssistantWorkspace } from "@/components/globe/assistant/assistant-workspace";
import { auth } from "@/lib/auth";
import { requireVerifiedUser } from "@/lib/require-verified";
import { isAiEnabled } from "@/lib/env";
import { listSessionMessages } from "@/modules/agent/agent-message.service";
import { getOwnedSession, listSessions } from "@/modules/agent/agent-session.service";

type Params = { params: Promise<{ sessionId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const session = await auth();
  if (!session?.user?.id) return { title: "Assistant" };
  const { sessionId } = await params;
  try {
    const s = await getOwnedSession(session.user.id, sessionId);
    return { title: `${s.title} · Assistant` };
  } catch {
    return { title: "Assistant" };
  }
}

export default async function AssistantSessionPage({ params }: Params) {
  const { sessionId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?next=/assistant/${sessionId}`);
  await requireVerifiedUser(`/assistant/${sessionId}`);
  if (!isAiEnabled) return <AssistantUnavailable />;

  let current;
  try {
    current = await getOwnedSession(session.user.id, sessionId);
  } catch {
    notFound();
  }

  const [messages, sessions] = await Promise.all([
    listSessionMessages(sessionId),
    listSessions(session.user.id),
  ]);

  return (
    <AssistantWorkspace
      key={sessionId}
      sessionId={sessionId}
      sessionTitle={current.title}
      initialMessages={messages}
      sessions={sessions}
    />
  );
}
