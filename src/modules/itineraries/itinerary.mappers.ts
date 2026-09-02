import type { Itinerary, Journey, PlanDay, PlanItem } from "@prisma/client";

import { budgetSummary } from "./budget";

type SourceJourney = Pick<Journey, "slug" | "title"> | null;

interface PlanItemDto {
  time: string | null;
  type: PlanItem["type"];
  title: string;
  description: string | null;
  locationName: string | null;
  cost: number | null;
  costCurrency: string | null;
}

interface PlanDayDto {
  dayNumber: number;
  title: string | null;
  date: string | null;
  notes: string | null;
  items: PlanItemDto[];
}

const toItemDto = (i: PlanItem): PlanItemDto => ({
  time: i.time,
  type: i.type,
  title: i.title,
  description: i.description,
  locationName: i.locationName,
  cost: i.cost,
  costCurrency: i.costCurrency,
});

const toDayDto = (d: PlanDay & { items: PlanItem[] }): PlanDayDto => ({
  dayNumber: d.dayNumber,
  title: d.title,
  date: d.date ? d.date.toISOString() : null,
  notes: d.notes,
  items: [...d.items].sort((a, b) => a.position - b.position).map(toItemDto),
});

// ---------------------------------------------------------------------------

export interface ItineraryCardDto {
  id: string;
  title: string;
  destinationName: string | null;
  country: string | null;
  startDate: string | null;
  endDate: string | null;
  status: Itinerary["status"];
  currency: string;
  dayCount: number;
  totalCost: number;
  sourceJourney: { slug: string; title: string } | null;
  updatedAt: string;
}

type CardRow = Itinerary & {
  days: { dayNumber: number; items: { cost: number | null }[] }[];
  sourceJourney: SourceJourney;
};

export function toCardDto(it: CardRow): ItineraryCardDto {
  const { total } = budgetSummary(it.days, it.currency);
  return {
    id: it.id,
    title: it.title,
    destinationName: it.destinationName,
    country: it.country,
    startDate: it.startDate ? it.startDate.toISOString() : null,
    endDate: it.endDate ? it.endDate.toISOString() : null,
    status: it.status,
    currency: it.currency,
    dayCount: it.days.length,
    totalCost: total,
    sourceJourney: it.sourceJourney,
    updatedAt: it.updatedAt.toISOString(),
  };
}

export interface ItineraryEditDto {
  id: string;
  title: string;
  destinationName: string | null;
  country: string | null;
  startDate: string | null;
  endDate: string | null;
  status: Itinerary["status"];
  currency: string;
  notes: string | null;
  sourceJourney: { slug: string; title: string } | null;
  days: PlanDayDto[];
}

type EditRow = Itinerary & {
  days: (PlanDay & { items: PlanItem[] })[];
  sourceJourney: SourceJourney;
};

export function toEditDto(it: EditRow): ItineraryEditDto {
  return {
    id: it.id,
    title: it.title,
    destinationName: it.destinationName,
    country: it.country,
    startDate: it.startDate ? it.startDate.toISOString() : null,
    endDate: it.endDate ? it.endDate.toISOString() : null,
    status: it.status,
    currency: it.currency,
    notes: it.notes,
    sourceJourney: it.sourceJourney,
    days: [...it.days].sort((a, b) => a.dayNumber - b.dayNumber).map(toDayDto),
  };
}
