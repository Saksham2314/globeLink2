"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { requireSession } from "@/lib/authz";
import { isAppError } from "@/lib/errors";
import { firstErrors, type FormState } from "@/lib/forms";
import { logger } from "@/lib/logger";

import { updatePreferencesSchema, updateProfileSchema } from "./user.schema";
import {
  getQuickNavTargets,
  setUserThemePreference,
  updatePreferences,
  updateProfile,
  type QuickNavTargets,
} from "./user.service";

const THEME_VALUES = new Set(["light", "dark", "system"]);

/**
 * Persist the theme choice so it follows the user across devices. Best-effort:
 * the client has already applied and cached it locally, so a failure here is
 * silent. A no-op for anonymous visitors (they rely on localStorage).
 */
export async function saveThemePreferenceAction(pref: string): Promise<void> {
  if (!THEME_VALUES.has(pref)) return;
  const session = await auth();
  if (!session?.user?.id) return;
  try {
    await setUserThemePreference(session.user.id, pref);
  } catch (error) {
    logger.warn({ err: error }, "saveThemePreferenceAction failed");
  }
}

/** Recent journeys + itineraries for the ⌘K palette. Empty for anon users. */
export async function quickNavTargetsAction(): Promise<QuickNavTargets> {
  const session = await auth();
  if (!session?.user?.id) return { journeys: [], itineraries: [] };
  try {
    return await getQuickNavTargets(session.user.id);
  } catch (error) {
    logger.warn({ err: error }, "quickNavTargetsAction failed");
    return { journeys: [], itineraries: [] };
  }
}

export async function updateProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await auth();

  let userId: string;
  try {
    userId = requireSession(session).user.id;
  } catch {
    return { error: "Your session expired. Please sign in again." };
  }

  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name"),
    handle: formData.get("handle"),
    bio: formData.get("bio") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };

  try {
    await updateProfile(userId, parsed.data);
  } catch (error) {
    if (isAppError(error) && (error.code === "CONFLICT" || error.code === "BAD_REQUEST")) {
      return { fieldErrors: { handle: error.message } };
    }
    logger.error({ err: error }, "profile update failed");
    return { error: "Couldn't save your profile. Please try again." };
  }

  revalidatePath("/settings");
  revalidatePath(`/profile/${parsed.data.handle}`);
  return { ok: true, message: "Profile saved." };
}

export async function updatePreferencesAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await auth();

  let userId: string;
  try {
    userId = requireSession(session).user.id;
  } catch {
    return { error: "Your session expired. Please sign in again." };
  }

  const parsed = updatePreferencesSchema.safeParse({
    styles: formData.getAll("styles"),
    interests: formData.getAll("interests"),
    dietary: formData.getAll("dietary"),
    pace: formData.get("pace") || undefined,
    budgetTier: formData.get("budgetTier") || undefined,
    homeRegion: formData.get("homeRegion") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };

  try {
    await updatePreferences(userId, parsed.data);
  } catch (error) {
    logger.error({ err: error }, "preferences update failed");
    return { error: "Couldn't save your preferences. Please try again." };
  }

  revalidatePath("/settings");
  return { ok: true, message: "Preferences saved." };
}
