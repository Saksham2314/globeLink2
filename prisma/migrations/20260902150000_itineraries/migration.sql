-- Phase 5: personal itineraries.
--
-- `prisma migrate diff` also emits `DROP INDEX journeys_search_idx` and
-- `ALTER COLUMN searchVector DROP DEFAULT` — Prisma can't represent the
-- generated tsvector column / its GIN index. Those lines are omitted so the
-- Phase 3 search index stays intact.

-- CreateEnum
CREATE TYPE "ItineraryStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PlanOrigin" AS ENUM ('USER', 'AGENT');

-- CreateTable
CREATE TABLE "itineraries" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "destinationName" TEXT,
    "country" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "ItineraryStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "notes" TEXT,
    "sourceJourneyId" TEXT,
    "createdBy" "PlanOrigin" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itineraries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_days" (
    "id" TEXT NOT NULL,
    "itineraryId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "title" TEXT,
    "date" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_items" (
    "id" TEXT NOT NULL,
    "planDayId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "time" TEXT,
    "type" "StopType" NOT NULL DEFAULT 'ACTIVITY',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "locationName" TEXT,
    "cost" INTEGER,
    "costCurrency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "itineraries_ownerId_updatedAt_idx" ON "itineraries"("ownerId", "updatedAt");

-- CreateIndex
CREATE INDEX "itineraries_sourceJourneyId_idx" ON "itineraries"("sourceJourneyId");

-- CreateIndex
CREATE INDEX "plan_days_itineraryId_idx" ON "plan_days"("itineraryId");

-- CreateIndex
CREATE UNIQUE INDEX "plan_days_itineraryId_dayNumber_key" ON "plan_days"("itineraryId", "dayNumber");

-- CreateIndex
CREATE INDEX "plan_items_planDayId_idx" ON "plan_items"("planDayId");

-- AddForeignKey
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_sourceJourneyId_fkey" FOREIGN KEY ("sourceJourneyId") REFERENCES "journeys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_days" ADD CONSTRAINT "plan_days_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "itineraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_planDayId_fkey" FOREIGN KEY ("planDayId") REFERENCES "plan_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;
