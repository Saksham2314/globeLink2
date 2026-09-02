import { NextResponse, type NextRequest } from "next/server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { AppError, toErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { storeAvatarImage } from "@/modules/users/avatar.storage";
import { removeUserAvatar, setUserAvatar } from "@/modules/users/user.service";

export const runtime = "nodejs";

/**
 * POST /api/profile/avatar
 * multipart/form-data with a single `file` field. Uploads to Blob and points the
 * signed-in user's avatar at it, replacing any avatar we previously stored.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw AppError.unauthorized();

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw AppError.badRequest("No file provided");

    const url = await storeAvatarImage(userId, file);
    await setUserAvatar(userId, url);
    revalidatePath("/settings");

    return NextResponse.json({ image: url });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    if (status >= 500) logger.error({ err: error }, "avatar upload failed");
    return NextResponse.json(body, { status });
  }
}

/** DELETE /api/profile/avatar — clear the signed-in user's avatar. */
export async function DELETE() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw AppError.unauthorized();

    await removeUserAvatar(userId);
    revalidatePath("/settings");

    return NextResponse.json({ image: null });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    if (status >= 500) logger.error({ err: error }, "avatar removal failed");
    return NextResponse.json(body, { status });
  }
}
