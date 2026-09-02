import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Signed-in / user-private surfaces have no SEO value.
      disallow: ["/settings", "/messages", "/itineraries", "/assistant", "/saved", "/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
