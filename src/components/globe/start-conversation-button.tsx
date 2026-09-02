import Link from "next/link";

import { startConversationAction } from "@/modules/messaging/messaging.actions";

interface Props {
  authorId: string;
  journeyId: string;
  /** Whether the viewer is signed in. */
  canMessage: boolean;
  /** Path to return to after signing in. */
  returnTo: string;
}

/** "Message" button on the journey page. Opens or creates the thread with the
 *  author, scoped to this journey. */
export function StartConversationButton({ authorId, journeyId, canMessage, returnTo }: Props) {
  const cls =
    "inline-flex h-9 items-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-muted";

  if (!canMessage) {
    return (
      <Link href={`/login?next=${encodeURIComponent(returnTo)}`} className={cls}>
        Message
      </Link>
    );
  }

  return (
    <form action={startConversationAction}>
      <input type="hidden" name="recipientId" value={authorId} />
      <input type="hidden" name="journeyId" value={journeyId} />
      <button type="submit" className={cls}>
        Message
      </button>
    </form>
  );
}
