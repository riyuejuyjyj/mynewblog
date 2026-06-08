import type { MetadataRoute } from "next";

import { getPublishedPosts } from "@/lib/blog-data";
import { absoluteSiteUrl, toAbsoluteUrl } from "@/lib/site-metadata";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPublishedPosts(100);

  return [
    {
      changeFrequency: "weekly",
      lastModified: new Date(),
      priority: 1,
      url: absoluteSiteUrl("/"),
    },
    {
      changeFrequency: "weekly",
      lastModified: new Date(),
      priority: 0.85,
      url: absoluteSiteUrl("/posts"),
    },
    ...posts.map((post) => {
      const imageUrl = toAbsoluteUrl(post.coverImage);

      return {
        changeFrequency: "monthly" as const,
        images: imageUrl ? [imageUrl] : undefined,
        lastModified: new Date(post.updatedAt ?? post.publishedAt),
        priority: post.featured ? 0.9 : 0.75,
        url: absoluteSiteUrl(`/posts/${post.slug}`),
      };
    }),
  ];
}
