"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getTool } from "@/ai/tools/registry";
import { auth } from "@/lib/auth";
import { AppError, isAppError } from "@/lib/errors";
import { firstErrors, type FormState } from "@/lib/forms";
import { logger } from "@/lib/logger";

import { resolveToolCallInMessage } from "./agent-message.service";
import {
  createSession,
  deleteSession,
  getOwnedSession,
  renameSession,
} from "./agent-session.service";
import { renameSessionSchema } from "./agent.schema";

const CONFIRMABLE = new Set(["createItinerary", "updateItinerary", "sendMessage"]);

async function actorId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw AppError.unauthorized("Please sign in again");
  return id;
}

export async function createSessionAction(): Promise<void> {
  const userId = await actorId();
  const session = await createSession(userId);
  redirect(`/assistant/${session.id}`);
}

export async function renameSessionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let userId: string;
  try {
    userId = await actorId();
  } catch {
    return { error: "Please sign in again." };
  }

  const parsed = renameSessionSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
  });
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };

  try {
    await renameSession(userId, parsed.data.id, parsed.data.title);
  } catch (error) {
    logger.error({ err: error }, "renameSessionAction failed");
    return { error: "Couldn't rename this conversation." };
  }
  revalidatePath("/assistant", "layout");
  return { ok: true, message: "Renamed." };
}

export async function deleteSessionAction(id: string): Promise<void> {
  const userId = await actorId();
  await deleteSession(userId, id);
  revalidatePath("/assistant", "layout");
  redirect("/assistant");
}

// ---------------------------------------------------------------------------
// Confirmed mutations
// ---------------------------------------------------------------------------

export interface ConfirmMutationResult {
  ok: boolean;
  /** The tool output on success, or `{ status: "cancelled" }` / an error. */
  output: unknown;
  error?: string;
}

interface ConfirmArgs {
  sessionId: string;
  messageId: string;
  toolCallId: string;
  toolName: string;
  input: unknown;
}

/**
 * Runs a mutation the assistant proposed, after the user clicked Confirm. The
 * click *is* the authorization: this action authenticates, checks the user owns
 * the session, runs the mutation through `tool.execute` (which re-checks
 * resource ownership in the domain service, enforces the rate caps, and writes
 * the `AuditLog` row), then patches the persisted transcript.
 */
export async function confirmMutationAction(args: ConfirmArgs): Promise<ConfirmMutationResult> {
  let userId: string;
  try {
    userId = await actorId();
  } catch {
    return { ok: false, output: { status: "error" }, error: "Please sign in again." };
  }

  if (!CONFIRMABLE.has(args.toolName)) {
    return { ok: false, output: { status: "error" }, error: "Unknown action." };
  }

  try {
    await getOwnedSession(userId, args.sessionId);
  } catch {
    return { ok: false, output: { status: "error" }, error: "Conversation not found." };
  }

  const tool = getTool(args.toolName);
  if (!tool) return { ok: false, output: { status: "error" }, error: "Unknown action." };

  const result = await tool.execute(args.input, { userId, sessionId: args.sessionId });

  if (!result.ok) {
    return {
      ok: false,
      output: { status: "error", error: result.error.message },
      error: result.error.message,
    };
  }

  await resolveToolCallInMessage(args.sessionId, args.messageId, args.toolCallId, result.data);
  return { ok: true, output: result.data };
}

/** "Save" on a canvas journey card — user-initiated from the assistant surface.
 *  Still audited so it shows in the mutation trail. Returns the new state. */
export async function assistantSaveJourneyAction(
  slug: string,
): Promise<{ ok: boolean; saved?: boolean; error?: string }> {
  let userId: string;
  try {
    userId = await actorId();
  } catch {
    return { ok: false, error: "Please sign in." };
  }
  const { getPublishedJourneyRef } = await import("@/modules/journeys/journey.service");
  const { toggleSave } = await import("@/modules/saved/saved.service");
  const { recordAudit } = await import("./audit.service");

  const journey = await getPublishedJourneyRef(slug);
  if (!journey) return { ok: false, error: "That journey isn't available." };

  try {
    const { saved } = await toggleSave(userId, journey.id);
    await recordAudit({
      userId,
      action: "saveJourney",
      targetType: "journey",
      targetId: journey.id,
      summary: `${saved ? "Saved" : "Unsaved"} "${journey.title}" from the assistant`,
    });
    return { ok: true, saved };
  } catch (error) {
    logger.error({ err: error }, "assistantSaveJourneyAction failed");
    return { ok: false, error: "Couldn't save that." };
  }
}

export async function cancelMutationAction(args: {
  sessionId: string;
  messageId: string;
  toolCallId: string;
}): Promise<void> {
  let userId: string;
  try {
    userId = await actorId();
  } catch {
    return;
  }
  try {
    await getOwnedSession(userId, args.sessionId);
  } catch (err) {
    if (isAppError(err)) return;
    throw err;
  }
  await resolveToolCallInMessage(args.sessionId, args.messageId, args.toolCallId, {
    status: "cancelled",
  });
}
