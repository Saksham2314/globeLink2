import "server-only";

import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

import { isHandleAvailableShape } from "./handle";
import {
  toCurrentUser,
  toPublicProfile,
  type CurrentUserDto,
  type PublicProfileDto,
} from "./user.mappers";
import type { UpdatePreferencesInput, UpdateProfileInput } from "./user.schema";

const withPreferences = { preferences: true } as const;

/** Public profile by handle, or `null` if there is no such user. */
export async function getPublicProfileByHandle(handle: string): Promise<PublicProfileDto | null> {
  const user = await db.user.findUnique({
    where: { handle: handle.toLowerCase() },
    include: withPreferences,
  });
  return user ? toPublicProfile(user) : null;
}

/** The signed-in user's own profile + account state. */
export async function getCurrentUser(userId: string): Promise<CurrentUserDto | null> {
  const user = await db.user.findUnique({ where: { id: userId }, include: withPreferences });
  return user ? toCurrentUser(user) : null;
}

/** The user's saved theme choice (light/dark/system) or null if unset. Used to
 *  sync the theme across devices — the browser-local value is the fast path. */
export async function getUserThemePreference(userId: string): Promise<string | null> {
  const row = await db.travelPreference.findUnique({
    where: { userId },
    select: { theme: true },
  });
  return row?.theme ?? null;
}

export async function setUserThemePreference(userId: string, theme: string): Promise<void> {
  await db.travelPreference.upsert({
    where: { userId },
    update: { theme },
    create: { userId, theme },
  });
}

/** Resolve a public handle to a user id, or null. Used by the assistant's
 *  sendMessage tool to address a recipient. */
export async function getUserIdByHandle(handle: string): Promise<string | null> {
  const row = await db.user.findUnique({
    where: { handle: handle.toLowerCase() },
    select: { id: true },
  });
  return row?.id ?? null;
}

/** Lightweight identity for the header (avatar + name + verification banner). */
export async function getSessionUserSummary(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, handle: true, image: true, emailVerified: true },
  });
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<CurrentUserDto> {
  if (!isHandleAvailableShape(input.handle)) {
    throw AppError.badRequest("That handle isn't allowed");
  }

  const owner = await db.user.findUnique({
    where: { handle: input.handle },
    select: { id: true },
  });
  if (owner && owner.id !== userId) {
    throw AppError.conflict("That handle is already taken");
  }

  const user = await db.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      handle: input.handle,
      bio: input.bio,
    },
    include: withPreferences,
  });
  return toCurrentUser(user);
}

export async function updatePreferences(
  userId: string,
  input: UpdatePreferencesInput,
): Promise<CurrentUserDto> {
  const data = {
    styles: input.styles,
    pace: input.pace ?? null,
    budgetTier: input.budgetTier ?? null,
    interests: input.interests,
    dietary: input.dietary,
    homeRegion: input.homeRegion ?? null,
  };

  await db.travelPreference.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, include: withPreferences });
  return toCurrentUser(user);
}
