import type { TravelPreference, User } from "@prisma/client";

/** Preferences as plain data for the UI and, later, the AI tools. */
export interface PreferencesDto {
  styles: string[];
  pace: string | null;
  budgetTier: string | null;
  interests: string[];
  dietary: string[];
  homeRegion: string | null;
}

export function toPreferencesDto(p: TravelPreference | null): PreferencesDto {
  return {
    styles: p?.styles ?? [],
    pace: p?.pace ?? null,
    budgetTier: p?.budgetTier ?? null,
    interests: p?.interests ?? [],
    dietary: p?.dietary ?? [],
    homeRegion: p?.homeRegion ?? null,
  };
}

type UserWithPrefs = User & { preferences: TravelPreference | null };

/** Publicly visible profile — no email, no auth fields. */
export interface PublicProfileDto {
  handle: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  memberSince: string;
  preferences: PreferencesDto;
}

export function toPublicProfile(user: UserWithPrefs): PublicProfileDto {
  return {
    handle: user.handle ?? "",
    name: user.name,
    image: user.image,
    bio: user.bio,
    memberSince: user.createdAt.toISOString(),
    preferences: toPreferencesDto(user.preferences),
  };
}

/** The signed-in user's own view — adds account state they're allowed to see. */
export interface CurrentUserDto extends PublicProfileDto {
  id: string;
  email: string;
  emailVerified: boolean;
}

export function toCurrentUser(user: UserWithPrefs): CurrentUserDto {
  return {
    ...toPublicProfile(user),
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified !== null,
  };
}
