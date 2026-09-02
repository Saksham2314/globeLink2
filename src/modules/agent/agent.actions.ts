"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { firstErrors, type FormState } from "@/lib/forms";
import { logger } from "@/lib/logger";

import { createSession, deleteSession, renameSession } from "./agent-session.service";
import { renameSessionSchema } from "./agent.schema";

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
