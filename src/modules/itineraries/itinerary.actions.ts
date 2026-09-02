"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { AppError, isAppError } from "@/lib/errors";
import { firstErrors, type FormState } from "@/lib/forms";
import { logger } from "@/lib/logger";

import {
  createItinerarySchema,
  itineraryMetaSchema,
  ITINERARY_STATUSES,
  planSchema,
  type ItineraryStatusValue,
} from "./itinerary.schema";
import {
  createItinerary,
  deleteItinerary,
  forkFromJourney,
  replacePlan,
  updateMeta,
  updateStatus,
} from "./itinerary.service";

async function actorId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw AppError.unauthorized("Please sign in again");
  return id;
}

function fail(error: unknown): FormState {
  if (isAppError(error) && error.expose) return { error: error.message };
  logger.error({ err: error }, "itinerary action failed");
  return { error: "Something went wrong. Please try again." };
}

function revalidateItinerary(id: string) {
  revalidatePath("/itineraries");
  revalidatePath(`/itineraries/${id}`);
}

// ---------------------------------------------------------------------------

export async function createItineraryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let userId: string;
  try {
    userId = await actorId();
  } catch {
    return { error: "Please sign in again." };
  }

  const parsed = createItinerarySchema.safeParse({
    title: formData.get("title"),
    destinationName: formData.get("destinationName") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };

  let id: string;
  try {
    ({ id } = await createItinerary(userId, parsed.data));
  } catch (error) {
    return fail(error);
  }
  redirect(`/itineraries/${id}`);
}

/** "Use as itinerary base" on a journey page. */
export async function forkJourneyAction(formData: FormData): Promise<void> {
  let userId: string;
  try {
    userId = await actorId();
  } catch {
    redirect("/login");
  }

  const slug = String(formData.get("slug") ?? "");
  if (!slug) redirect("/explore");

  let id: string;
  try {
    ({ id } = await forkFromJourney(userId, slug));
  } catch (error) {
    logger.error({ err: error }, "forkJourney failed");
    redirect("/itineraries");
  }
  redirect(`/itineraries/${id}`);
}

export async function updateItineraryMetaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let userId: string;
  try {
    userId = await actorId();
  } catch {
    return { error: "Please sign in again." };
  }

  const id = String(formData.get("itineraryId") ?? "");
  const parsed = itineraryMetaSchema.safeParse({
    title: formData.get("title"),
    destinationName: formData.get("destinationName") ?? undefined,
    country: formData.get("country") ?? undefined,
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
    status: formData.get("status") || undefined,
    currency: formData.get("currency") || undefined,
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };

  try {
    await updateMeta(userId, id, parsed.data);
  } catch (error) {
    return fail(error);
  }
  revalidateItinerary(id);
  return { ok: true, message: "Saved." };
}

export async function savePlanAction(itineraryId: string, payload: unknown): Promise<FormState> {
  let userId: string;
  try {
    userId = await actorId();
  } catch {
    return { error: "Please sign in again." };
  }

  const parsed = planSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: "Some entries are invalid — every item needs a title." };
  }

  try {
    await replacePlan(userId, itineraryId, parsed.data);
  } catch (error) {
    return fail(error);
  }
  revalidateItinerary(itineraryId);
  return { ok: true, message: "Plan saved." };
}

export async function updateItineraryStatusAction(
  itineraryId: string,
  status: string,
): Promise<FormState> {
  if (!(ITINERARY_STATUSES as readonly string[]).includes(status)) {
    return { error: "Unknown status" };
  }
  try {
    await updateStatus(await actorId(), itineraryId, status as ItineraryStatusValue);
  } catch (error) {
    return fail(error);
  }
  revalidateItinerary(itineraryId);
  return { ok: true };
}

export async function deleteItineraryAction(itineraryId: string): Promise<FormState> {
  try {
    await deleteItinerary(await actorId(), itineraryId);
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/itineraries");
  redirect("/itineraries");
}
