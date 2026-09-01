import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { AppError, toErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { addImage } from "@/modules/journeys/journey.service";
import { storeJourneyImage } from "@/modules/journeys/journey.storage";

export const runtime = "nodejs";

/**
 * POST /api/journeys/:journeyId/images
 * multipart/form-data with a single `file` field. Uploads to Blob, records a
 * JourneyImage, and returns it. Ownership is enforced in the service.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ journeyId: string }> },
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw AppError.unauthorized();

    const { journeyId } = await params;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw AppError.badRequest("No file provided");

    const stored = await storeJourneyImage(journeyId, file);
    const image = await addImage(userId, journeyId, stored);

    return NextResponse.json({
      id: image.id,
      url: image.url,
      caption: image.caption,
      position: image.position,
      isCover: image.isCover,
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    if (status >= 500) logger.error({ err: error }, "journey image upload failed");
    return NextResponse.json(body, { status });
  }
}
