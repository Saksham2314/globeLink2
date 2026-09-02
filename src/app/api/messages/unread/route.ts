import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getTotalUnread } from "@/modules/messaging/messaging.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/messages/unread → { count }. Polled by the header badge. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ count: 0 });
  return NextResponse.json({ count: await getTotalUnread(session.user.id) });
}
