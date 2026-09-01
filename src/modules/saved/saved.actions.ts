"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import { listSaved, toggleSave } from "./saved.service";

export interface ToggleSaveResult {
  ok: boolean;
  saved?: boolean;
  error?: string;
}

export async function toggleSaveAction(journeyId: string): Promise<ToggleSaveResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in to save journeys" };

  try {
    const { saved } = await toggleSave(session.user.id, journeyId);
    revalidatePath("/saved");
    return { ok: true, saved };
  } catch (error) {
    if (isAppError(error) && error.expose) return { ok: false, error: error.message };
    logger.error({ err: error }, "toggleSaveAction failed");
    return { ok: false, error: "Couldn't update that. Try again." };
  }
}

export async function loadMoreSavedAction(cursor: string) {
  const session = await auth();
  if (!session?.user?.id) return { items: [], nextCursor: null };
  return listSaved(session.user.id, { cursor });
}
