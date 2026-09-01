-- CreateEnum
CREATE TYPE "JourneyStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StopType" AS ENUM ('ACTIVITY', 'TRANSIT', 'LODGING', 'FOOD', 'NOTE');

-- CreateTable
CREATE TABLE "journeys" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "status" "JourneyStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "originName" TEXT,
    "destinationName" TEXT,
    "country" TEXT,
    "region" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "durationDays" INTEGER,
    "transportModes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "travelStyle" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "budgetAmount" INTEGER,
    "budgetCurrency" TEXT NOT NULL DEFAULT 'INR',
    "budgetBreakdown" JSONB,
    "description" TEXT,
    "tips" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journey_images" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "caption" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journey_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journey_days" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "title" TEXT,
    "date" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journey_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journey_stops" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "time" TEXT,
    "type" "StopType" NOT NULL DEFAULT 'ACTIVITY',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "locationName" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "cost" INTEGER,
    "costCurrency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journey_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journey_tags" (
    "journeyId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "journey_tags_pkey" PRIMARY KEY ("journeyId","tagId")
);

-- CreateIndex
CREATE UNIQUE INDEX "journeys_slug_key" ON "journeys"("slug");

-- CreateIndex
CREATE INDEX "journeys_authorId_idx" ON "journeys"("authorId");

-- CreateIndex
CREATE INDEX "journeys_status_publishedAt_idx" ON "journeys"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "journey_images_journeyId_idx" ON "journey_images"("journeyId");

-- CreateIndex
CREATE INDEX "journey_days_journeyId_idx" ON "journey_days"("journeyId");

-- CreateIndex
CREATE UNIQUE INDEX "journey_days_journeyId_dayNumber_key" ON "journey_days"("journeyId", "dayNumber");

-- CreateIndex
CREATE INDEX "journey_stops_dayId_idx" ON "journey_stops"("dayId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "journey_tags_tagId_idx" ON "journey_tags"("tagId");

-- AddForeignKey
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_images" ADD CONSTRAINT "journey_images_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_days" ADD CONSTRAINT "journey_days_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_stops" ADD CONSTRAINT "journey_stops_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "journey_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_tags" ADD CONSTRAINT "journey_tags_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_tags" ADD CONSTRAINT "journey_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

