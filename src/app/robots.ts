import type { MetadataRoute } from "next";

import { absoluteSiteUrl } from "@/lib/site-metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      allow: "/",
      disallow: ["/api/", "/studio"],
      userAgent: "*",
    },
    sitemap: absoluteSiteUrl("/sitemap.xml"),
  };
}
