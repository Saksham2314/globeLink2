-- Full-text search vector: a Postgres GENERATED column, maintained by the
-- database on every insert/update. Weighted so title matches rank highest.
--
-- Only scalar text columns are included: casting a text[] to text (directly or
-- via array_to_string) is not IMMUTABLE, which a generated column forbids.
-- travelStyle / transportModes are covered by their own filters instead; tips
-- searchability is a minor, acceptable loss.
ALTER TABLE "journeys" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english'::regconfig, coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, coalesce("destinationName", '') || ' ' || coalesce("country", '') || ' ' || coalesce("region", '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, coalesce("summary", '')), 'C') ||
    setweight(to_tsvector('english'::regconfig, coalesce("originName", '') || ' ' || coalesce("description", '')), 'D')
  ) STORED;

-- GIN index for `searchVector @@ query` lookups.
CREATE INDEX "journeys_search_idx" ON "journeys" USING GIN ("searchVector");

-- Indexes for the discovery filters.
CREATE INDEX "journeys_travelStyle_idx" ON "journeys" USING GIN ("travelStyle");
CREATE INDEX "journeys_transportModes_idx" ON "journeys" USING GIN ("transportModes");
CREATE INDEX "journeys_country_idx" ON "journeys" ("country");
CREATE INDEX "journeys_durationDays_idx" ON "journeys" ("durationDays");
CREATE INDEX "journeys_budgetAmount_idx" ON "journeys" ("budgetAmount");

-- CreateTable
CREATE TABLE "saved_journeys" (
    "userId" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_journeys_pkey" PRIMARY KEY ("userId","journeyId")
);

-- CreateIndex
CREATE INDEX "saved_journeys_userId_createdAt_idx" ON "saved_journeys"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "saved_journeys_journeyId_idx" ON "saved_journeys"("journeyId");

-- AddForeignKey
ALTER TABLE "saved_journeys" ADD CONSTRAINT "saved_journeys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_journeys" ADD CONSTRAINT "saved_journeys_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
