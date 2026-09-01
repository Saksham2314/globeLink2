import type {
  Journey,
  JourneyDay,
  JourneyImage,
  JourneyStatus,
  JourneyStop,
  Tag,
  User,
} from "@prisma/client";

type Author = Pick<User, "name" | "handle" | "image" | "bio">;

type FullJourney = Journey & {
  images: JourneyImage[];
  days: (JourneyDay & { stops: JourneyStop[] })[];
  tags: { tag: Tag }[];
  author: Author;
};

type ListJourney = Journey & { images: JourneyImage[]; author: Author };

function coverUrl(images: JourneyImage[]): string | null {
  const sorted = [...images].sort((a, b) => a.position - b.position);
  return sorted.find((i) => i.isCover)?.url ?? sorted[0]?.url ?? null;
}

export interface JourneyCardDto {
  slug: string;
  title: string;
  summary: string | null;
  status: JourneyStatus;
  destinationName: string | null;
  country: string | null;
  durationDays: number | null;
  budgetAmount: number | null;
  budgetCurrency: string;
  coverImageUrl: string | null;
  author: { name: string | null; handle: string | null; image: string | null };
}

export function toCardDto(j: ListJourney): JourneyCardDto {
  return {
    slug: j.slug,
    title: j.title,
    summary: j.summary,
    status: j.status,
    destinationName: j.destinationName,
    country: j.country,
    durationDays: j.durationDays,
    budgetAmount: j.budgetAmount,
    budgetCurrency: j.budgetCurrency,
    coverImageUrl: coverUrl(j.images),
    author: { name: j.author.name, handle: j.author.handle, image: j.author.image },
  };
}

interface ImageDto {
  id: string;
  url: string;
  caption: string | null;
  position: number;
  isCover: boolean;
}

interface StopDto {
  time: string | null;
  type: JourneyStop["type"];
  title: string;
  description: string | null;
  locationName: string | null;
  cost: number | null;
  costCurrency: string | null;
}

interface DayDto {
  dayNumber: number;
  title: string | null;
  date: string | null;
  notes: string | null;
  stops: StopDto[];
}

const toImageDto = (i: JourneyImage): ImageDto => ({
  id: i.id,
  url: i.url,
  caption: i.caption,
  position: i.position,
  isCover: i.isCover,
});

const toDayDto = (d: JourneyDay & { stops: JourneyStop[] }): DayDto => ({
  dayNumber: d.dayNumber,
  title: d.title,
  date: d.date ? d.date.toISOString() : null,
  notes: d.notes,
  stops: [...d.stops]
    .sort((a, b) => a.position - b.position)
    .map((s) => ({
      time: s.time,
      type: s.type,
      title: s.title,
      description: s.description,
      locationName: s.locationName,
      cost: s.cost,
      costCurrency: s.costCurrency,
    })),
});

/** Everything the owner's edit page needs. */
export interface JourneyEditDto {
  id: string;
  slug: string;
  status: JourneyStatus;
  title: string;
  summary: string | null;
  originName: string | null;
  destinationName: string | null;
  country: string | null;
  region: string | null;
  startDate: string | null;
  endDate: string | null;
  durationDays: number | null;
  transportModes: string[];
  travelStyle: string[];
  budgetAmount: number | null;
  budgetCurrency: string;
  description: string | null;
  tips: string[];
  images: ImageDto[];
  days: DayDto[];
}

export function toEditDto(j: FullJourney): JourneyEditDto {
  return {
    id: j.id,
    slug: j.slug,
    status: j.status,
    title: j.title,
    summary: j.summary,
    originName: j.originName,
    destinationName: j.destinationName,
    country: j.country,
    region: j.region,
    startDate: j.startDate ? j.startDate.toISOString() : null,
    endDate: j.endDate ? j.endDate.toISOString() : null,
    durationDays: j.durationDays,
    transportModes: j.transportModes,
    travelStyle: j.travelStyle,
    budgetAmount: j.budgetAmount,
    budgetCurrency: j.budgetCurrency,
    description: j.description,
    tips: j.tips,
    images: [...j.images].sort((a, b) => a.position - b.position).map(toImageDto),
    days: [...j.days].sort((a, b) => a.dayNumber - b.dayNumber).map(toDayDto),
  };
}

/** Public journey page. */
export interface JourneyDetailDto {
  slug: string;
  status: JourneyStatus;
  title: string;
  summary: string | null;
  originName: string | null;
  destinationName: string | null;
  country: string | null;
  region: string | null;
  startDate: string | null;
  endDate: string | null;
  durationDays: number | null;
  transportModes: string[];
  travelStyle: string[];
  budgetAmount: number | null;
  budgetCurrency: string;
  description: string | null;
  tips: string[];
  tags: string[];
  viewCount: number;
  publishedAt: string | null;
  coverImageUrl: string | null;
  images: ImageDto[];
  days: DayDto[];
  author: { name: string | null; handle: string | null; image: string | null; bio: string | null };
}

export function toDetailDto(j: FullJourney): JourneyDetailDto {
  return {
    slug: j.slug,
    status: j.status,
    title: j.title,
    summary: j.summary,
    originName: j.originName,
    destinationName: j.destinationName,
    country: j.country,
    region: j.region,
    startDate: j.startDate ? j.startDate.toISOString() : null,
    endDate: j.endDate ? j.endDate.toISOString() : null,
    durationDays: j.durationDays,
    transportModes: j.transportModes,
    travelStyle: j.travelStyle,
    budgetAmount: j.budgetAmount,
    budgetCurrency: j.budgetCurrency,
    description: j.description,
    tips: j.tips,
    tags: j.tags.map((t) => t.tag.label),
    viewCount: j.viewCount,
    publishedAt: j.publishedAt ? j.publishedAt.toISOString() : null,
    coverImageUrl: coverUrl(j.images),
    images: [...j.images].sort((a, b) => a.position - b.position).map(toImageDto),
    days: [...j.days].sort((a, b) => a.dayNumber - b.dayNumber).map(toDayDto),
    author: {
      name: j.author.name,
      handle: j.author.handle,
      image: j.author.image,
      bio: j.author.bio,
    },
  };
}
