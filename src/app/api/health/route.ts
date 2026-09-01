import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/** Prisma needs the Node.js runtime (not Edge). */
export const runtime = "nodejs";
/** Never cache — this must reflect live state. */
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 *
 * Liveness + database readiness probe. Used by uptime monitors and as a
 * post-deploy smoke check. Returns 200 when the database answers, 503 otherwise.
 */
export async function GET() {
  const startedAt = Date.now();

  try {
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "ok",
      service: "globelink",
      db: "up",
      latencyMs: Date.now() - startedAt,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error }, "health check failed: database unreachable");

    return NextResponse.json(
      {
        status: "degraded",
        service: "globelink",
        db: "down",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
