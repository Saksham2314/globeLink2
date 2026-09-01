import { PrismaClient } from "@prisma/client";

import { env } from "@/lib/env";

/**
 * Single shared Prisma client.
 *
 * In development Next.js clears the module cache on every request, which would
 * otherwise open a new pool of database connections each time. Caching the
 * client on `globalThis` keeps exactly one instance alive across hot reloads.
 * In production a fresh module graph is created once, so the guard is a no-op.
 */
const createPrismaClient = () =>
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
