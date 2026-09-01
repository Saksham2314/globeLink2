/**
 * Database seed. Intentionally a no-op in Phase 0 — there are no meaningful
 * records to create yet. Wired up via package.json -> "prisma.seed" so that
 * `prisma migrate reset` and `prisma db seed` already work as future phases
 * add fixtures (a demo user, sample journeys, etc).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("[seed] Phase 0: nothing to seed yet.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
