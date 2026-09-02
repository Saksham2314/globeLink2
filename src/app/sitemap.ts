import type { MetadataRoute } from "next";

import { env } from "@/lib/env";
import { listPublishedForSitemap } from "@/modules/journeys/journey.service";
import { listProfileHandlesForSitemap } from "@/modules/users/user.service";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/explore`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/login`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/signup`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const [journeys, handles] = await Promise.all([
    listPublishedForSitemap().catch(() => []),
    listProfileHandlesForSitemap().catch(() => []),
  ]);

  return [
    ...staticRoutes,
    ...journeys.map((j) => ({
      url: `${base}/journeys/${j.slug}`,
      lastModified: j.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...handles.map((h) => ({
      url: `${base}/profile/${h.handle}`,
      lastModified: h.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
  ];
}
