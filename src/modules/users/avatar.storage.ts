import "server-only";

import { randomBytes } from "node:crypto";

import { del, put } from "@vercel/blob";

import { isBlobEnabled } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB — avatars are small; keeps uploads snappy

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/** True for URLs we own in the Blob store (vs. an external OAuth avatar). */
export function isOwnedAvatarUrl(url: string | null | undefined): url is string {
  return typeof url === "string" && url.includes(".public.blob.vercel-storage.com/");
}

/** Upload one validated avatar image to the Blob store under `avatars/<userId>/`. */
export async function storeAvatarImage(userId: string, file: File): Promise<string> {
  if (!isBlobEnabled) {
    throw AppError.internal("Image storage is not configured (BLOB_READ_WRITE_TOKEN missing)");
  }
  if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
    throw AppError.badRequest("Only JPEG, PNG, WebP or AVIF images are allowed");
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw AppError.badRequest("Images must be 2 MB or smaller");
  }

  const key = `avatars/${userId}/${randomBytes(8).toString("hex")}.${EXT[file.type] ?? "bin"}`;
  const blob = await put(key, file, { access: "public", contentType: file.type });
  return blob.url;
}

/** Delete a previously stored avatar; best-effort. No-op for external URLs. */
export async function deleteAvatarImage(url: string | null | undefined): Promise<void> {
  if (!isBlobEnabled || !isOwnedAvatarUrl(url)) return;
  try {
    await del(url);
  } catch (error) {
    logger.warn({ err: error, url }, "failed to delete old avatar blob (continuing)");
  }
}
