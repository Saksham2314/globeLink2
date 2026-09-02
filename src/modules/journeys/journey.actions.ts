"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { AppError, isAppError } from "@/lib/errors";
import { firstErrors, type FormState } from "@/lib/forms";
import { logger } from "@/lib/logger";

import {
  createJourneySchema,
  itinerarySchema,
  journeyBasicsSchema,
  journeyBudgetSchema,
  journeyContentSchema,
  journeyRouteSchema,
} from "./journey.schema";
import {
  createDraft,
  publish,
  remove,
  removeImage,
  reorderImages,
  replaceItinerary,
  setCoverImage,
  unpublish,
  updateBasics,
  updateBudget,
  updateContent,
  updateImageCaption,
  updateRoute,
  type JourneyRef,
} from "./journey.service";

async function actorId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw AppError.unauthorized("Please sign in again");
  return id;
}

function fail(error: unknown): FormState {
  if (isAppError(error) && error.expose) return { error: error.message };
  logger.error({ err: error }, "journey action failed");
  return { error: "Something went wrong. Please try again." };
}

/** Revalidate the public page, the editor, and the author's profile. */
function revalidateJourney(ref: JourneyRef) {
  revalidatePath(`/journeys/${ref.slug}`);
  revalidatePath(`/journeys/${ref.slug}/edit`);
  if (ref.authorHandle) revalidatePath(`/profile/${ref.authorHandle}`);
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createJourneyAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let userId: string;
  try {
    userId = await actorId();
  } catch {
    return { error: "Please sign in again." };
  }

  const parsed = createJourneySchema.safeParse({
    title: formData.get("title"),
    destinationName: formData.get("destinationName") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };

  let slug: string;
  try {
    ({ slug } = await createDraft(userId, parsed.data));
  } catch (error) {
    return fail(error);
  }
  redirect(`/journeys/${slug}/edit`);
}

// ---------------------------------------------------------------------------
// Section forms (hidden `journeyId` field)
// ---------------------------------------------------------------------------

function jid(formData: FormData): string {
  return String(formData.get("journeyId") ?? "");
}

export async function updateBasicsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let userId: string;
  try {
    userId = await actorId();
  } catch {
    return { error: "Please sign in again." };
  }
  const parsed = journeyBasicsSchema.safeParse({
    title: formData.get("title"),
    summary: formData.get("summary") ?? undefined,
    originName: formData.get("originName") ?? undefined,
    destinationName: formData.get("destinationName") ?? undefined,
    country: formData.get("country") ?? undefined,
    region: formData.get("region") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };

  try {
    revalidateJourney(await updateBasics(userId, jid(formData), parsed.data));
  } catch (error) {
    return fail(error);
  }
  return { ok: true, message: "Saved." };
}

export async function updateRouteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let userId: string;
  try {
    userId = await actorId();
  } catch {
    return { error: "Please sign in again." };
  }
  const parsed = journeyRouteSchema.safeParse({
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
    durationDays: formData.get("durationDays") || undefined,
  });
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };

  try {
    revalidateJourney(await updateRoute(userId, jid(formData), parsed.data));
  } catch (error) {
    return fail(error);
  }
  return { ok: true, message: "Saved." };
}

export async function updateBudgetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let userId: string;
  try {
    userId = await actorId();
  } catch {
    return { error: "Please sign in again." };
  }
  const raw = {
    budgetAmount: formData.get("budgetAmount") || undefined,
    budgetCurrency: formData.get("budgetCurrency") || "INR",
    transportModes: formData.getAll("transportModes"),
    travelStyle: formData.getAll("travelStyle"),
  };
  const parsed = journeyBudgetSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };

  try {
    revalidateJourney(await updateBudget(userId, jid(formData), raw));
  } catch (error) {
    return fail(error);
  }
  return { ok: true, message: "Saved." };
}

export async function updateContentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let userId: string;
  try {
    userId = await actorId();
  } catch {
    return { error: "Please sign in again." };
  }
  const tips = String(formData.get("tips") ?? "")
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);
  const parsed = journeyContentSchema.safeParse({
    description: formData.get("description") ?? undefined,
    tips,
  });
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };

  try {
    revalidateJourney(await updateContent(userId, jid(formData), parsed.data));
  } catch (error) {
    return fail(error);
  }
  return { ok: true, message: "Saved." };
}

// ---------------------------------------------------------------------------
// Itinerary — structured payload
// ---------------------------------------------------------------------------

export async function saveItineraryAction(journeyId: string, payload: unknown): Promise<FormState> {
  let userId: string;
  try {
    userId = await actorId();
  } catch {
    return { error: "Please sign in again." };
  }
  const parsed = itinerarySchema.safeParse(payload);
  if (!parsed.success) {
    return { error: "Some itinerary entries are invalid — every stop needs a title." };
  }

  try {
    revalidateJourney(await replaceItinerary(userId, journeyId, payload));
  } catch (error) {
    return fail(error);
  }
  return { ok: true, message: "Itinerary saved." };
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

export async function setCoverImageAction(imageId: string): Promise<FormState> {
  try {
    revalidateJourney(await setCoverImage(await actorId(), imageId));
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteImageAction(imageId: string): Promise<FormState> {
  try {
    revalidateJourney(await removeImage(await actorId(), imageId));
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function updateImageCaptionAction(
  imageId: string,
  caption: string,
): Promise<FormState> {
  try {
    revalidateJourney(await updateImageCaption(await actorId(), imageId, caption.trim() || null));
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function reorderImagesAction(
  journeyId: string,
  orderedIds: string[],
): Promise<FormState> {
  try {
    revalidateJourney(await reorderImages(await actorId(), journeyId, orderedIds));
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export async function publishJourneyAction(journeyId: string): Promise<FormState> {
  try {
    revalidateJourney(await publish(await actorId(), journeyId));
    return { ok: true, message: "Published." };
  } catch (error) {
    return fail(error);
  }
}

export async function unpublishJourneyAction(journeyId: string): Promise<FormState> {
  try {
    revalidateJourney(await unpublish(await actorId(), journeyId));
    return { ok: true, message: "Moved back to draft." };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteJourneyAction(journeyId: string): Promise<FormState> {
  let ref: JourneyRef;
  try {
    ref = await remove(await actorId(), journeyId);
  } catch (error) {
    return fail(error);
  }
  revalidateJourney(ref);
  redirect(ref.authorHandle ? `/profile/${ref.authorHandle}` : "/");
}
