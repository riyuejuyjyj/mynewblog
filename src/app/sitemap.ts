import type { MetadataRoute } from "next";

import { getPublishedPosts } from "@/lib/blog-data";
import {
  getCategoryPath,
  getPostCategories,
  getPostTags,
  getTagPath,
} from "@/lib/blog-taxonomy";
import { absoluteSiteUrl, toAbsoluteUrl } from "@/lib/site-metadata";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPublishedPosts(100);
  const categories = getPostCategories(posts);
  const tags = getPostTags(posts);

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
    ...categories.map((category) => ({
      changeFrequency: "weekly" as const,
      lastModified: new Date(),
      priority: 0.65,
      url: absoluteSiteUrl(getCategoryPath(category)),
    })),
    ...tags.map((tag) => ({
      changeFrequency: "weekly" as const,
      lastModified: new Date(),
      priority: 0.6,
      url: absoluteSiteUrl(getTagPath(tag)),
    })),
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
