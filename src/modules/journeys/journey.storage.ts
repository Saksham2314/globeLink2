import "server-only";

import { randomBytes } from "node:crypto";

import { del, put } from "@vercel/blob";

import { isBlobEnabled } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB — within the serverless body limit

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export interface StoredImage {
  url: string;
  storageKey: string;
}

/** Upload one validated image to the Blob store under `journeys/<id>/`. */
export async function storeJourneyImage(journeyId: string, file: File): Promise<StoredImage> {
  if (!isBlobEnabled) {
    throw AppError.internal("Image storage is not configured (BLOB_READ_WRITE_TOKEN missing)");
  }
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw AppError.badRequest("Only JPEG, PNG, WebP or AVIF images are allowed");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw AppError.badRequest("Images must be 4 MB or smaller");
  }

  const key = `journeys/${journeyId}/${randomBytes(8).toString("hex")}.${EXT[file.type] ?? "bin"}`;
  const blob = await put(key, file, { access: "public", contentType: file.type });
  return { url: blob.url, storageKey: blob.pathname };
}

/** Delete a stored image; best-effort (a missing blob is not an error). */
export async function deleteStoredImage(storageKey: string): Promise<void> {
  if (!isBlobEnabled) return;
  try {
    await del(storageKey);
  } catch (error) {
    logger.warn({ err: error, storageKey }, "failed to delete blob (continuing)");
  }
}
