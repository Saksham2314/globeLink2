import type { JourneyCardDto, JourneyDetailDto } from "@/modules/journeys/journey.mappers";

/**
 * Model-facing journey shapes. Costs are exposed in **major** currency units
 * (the DB stores minor units) because that is how the model and the user talk
 * about money. Structure is preserved in full on the detail shape so a future
 * flow can mine destinations, stops, costs and tips from community journeys.
 */

const major = (minor: number | null, currency: string) =>
  minor == null ? null : { amount: Math.round(minor) / 100, currency };

export interface ToolJourneyCard {
  slug: string;
  title: string;
  summary: string | null;
  destination: string | null;
  country: string | null;
  durationDays: number | null;
  budget: { amount: number; currency: string } | null;
}

export function toToolJourneyCard(j: JourneyCardDto): ToolJourneyCard {
  return {
    slug: j.slug,
    title: j.title,
    summary: j.summary,
    destination: j.destinationName,
    country: j.country,
    durationDays: j.durationDays,
    budget: major(j.budgetAmount, j.budgetCurrency),
  };
}

export interface ToolJourneyStop {
  time: string | null;
  type: string;
  title: string;
  description: string | null;
  location: string | null;
  cost: { amount: number; currency: string } | null;
}

export interface ToolJourneyDay {
  dayNumber: number;
  title: string | null;
  stops: ToolJourneyStop[];
}

export interface ToolJourneyDetail {
  slug: string;
  title: string;
  summary: string | null;
  origin: string | null;
  destination: string | null;
  country: string | null;
  region: string | null;
  durationDays: number | null;
  transportModes: string[];
  travelStyle: string[];
  budget: { amount: number; currency: string } | null;
  description: string | null;
  tips: string[];
  tags: string[];
  author: { name: string | null; handle: string | null };
  days: ToolJourneyDay[];
}

export function toToolJourneyDetail(j: JourneyDetailDto): ToolJourneyDetail {
  return {
    slug: j.slug,
    title: j.title,
    summary: j.summary,
    origin: j.originName,
    destination: j.destinationName,
    country: j.country,
    region: j.region,
    durationDays: j.durationDays,
    transportModes: j.transportModes,
    travelStyle: j.travelStyle,
    budget: major(j.budgetAmount, j.budgetCurrency),
    description: j.description,
    tips: j.tips,
    tags: j.tags,
    author: { name: j.author.name, handle: j.author.handle },
    days: j.days.map((d) => ({
      dayNumber: d.dayNumber,
      title: d.title,
      stops: d.stops.map((s) => ({
        time: s.time,
        type: s.type,
        title: s.title,
        description: s.description,
        location: s.locationName,
        cost: major(s.cost, s.costCurrency ?? j.budgetCurrency),
      })),
    })),
  };
}
