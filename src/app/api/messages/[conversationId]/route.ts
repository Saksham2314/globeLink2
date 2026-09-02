import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { AppError, toErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { messagesSince } from "@/modules/messaging/messaging.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/messages/:conversationId?after=<messageId>
 *
 * Returns messages newer than `after` (or the whole thread if omitted),
 * oldest → newest. Polled by the open thread view. Participant-scoped.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw AppError.unauthorized();

    const { conversationId } = await params;
    const after = request.nextUrl.searchParams.get("after") ?? undefined;

    const messages = await messagesSince(session.user.id, conversationId, after);
    return NextResponse.json({ messages });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    if (status >= 500) logger.error({ err: error }, "messages poll failed");
    return NextResponse.json(body, { status });
  }
}
