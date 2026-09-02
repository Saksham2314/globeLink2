import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AssistantUnavailable } from "@/components/globe/assistant/assistant-unavailable";
import { Container } from "@/components/ui/container";
import { auth } from "@/lib/auth";
import { isAiEnabled } from "@/lib/env";
import { createSession, listSessions } from "@/modules/agent/agent-session.service";

export const metadata: Metadata = { title: "Assistant" };

export default async function AssistantIndexPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/assistant");
  if (!isAiEnabled) {
    return (
      <Container>
        <AssistantUnavailable />
      </Container>
    );
  }

  const sessions = await listSessions(session.user.id);
  const target = sessions[0] ?? (await createSession(session.user.id));
  redirect(`/assistant/${target.id}`);
}
