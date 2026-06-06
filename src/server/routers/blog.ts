import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { hasDatabase } from "@/db";
import { comments, moments, posts } from "@/db/schema";
import { seedComments, seedMoments, seedPosts } from "@/content/seed";
import { getR2Status } from "@/lib/r2";
import { createTRPCRouter, publicProcedure } from "@/server/trpc";

function toPreview(post: typeof seedPosts[number]) {
  return {
    ...post,
    publishedAt: post.publishedAt.toISOString(),
  };
}

function toMoment(moment: typeof seedMoments[number]) {
  return {
    ...moment,
    createdAt: moment.createdAt.toISOString(),
  };
}

export const blogRouter = createTRPCRouter({
  feed: publicProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(12).default(6),
        })
        .default({ limit: 6 }),
    )
    .query(async ({ ctx, input }) => {
      if (hasDatabase) {
        const rows = await ctx.db
          .select()
          .from(posts)
          .where(eq(posts.published, true))
          .orderBy(desc(posts.publishedAt))
          .limit(input.limit)
          .catch(() => []);

        if (rows.length > 0) {
          return rows.map((post) => ({
            id: post.id,
            slug: post.slug,
            title: post.title,
            excerpt: post.excerpt,
            content: post.content,
            coverImage: post.coverImage,
            category: post.category,
            mood: post.mood,
            tags: post.tags,
            readingMinutes: post.readingMinutes,
            viewCount: post.viewCount,
            likeCount: post.likeCount,
            featured: post.featured,
            publishedAt: post.publishedAt.toISOString(),
          }));
        }
      }

      return seedPosts.slice(0, input.limit).map(toPreview);
    }),

  postBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(120) }))
    .query(async ({ ctx, input }) => {
      if (hasDatabase) {
        const [post] = await ctx.db
          .select()
          .from(posts)
          .where(eq(posts.slug, input.slug))
          .limit(1)
          .catch(() => []);

        if (post?.published) {
          return {
            id: post.id,
            slug: post.slug,
            title: post.title,
            excerpt: post.excerpt,
            content: post.content,
            coverImage: post.coverImage,
            category: post.category,
            mood: post.mood,
            tags: post.tags,
            readingMinutes: post.readingMinutes,
            viewCount: post.viewCount,
            likeCount: post.likeCount,
            featured: post.featured,
            publishedAt: post.publishedAt.toISOString(),
            updatedAt: post.updatedAt.toISOString(),
          };
        }
      }

      const seedPost = seedPosts.find((post) => post.slug === input.slug);

      return seedPost ? toPreview(seedPost) : null;
    }),

  moments: publicProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(8).default(4),
        })
        .default({ limit: 4 }),
    )
    .query(async ({ ctx, input }) => {
      if (hasDatabase) {
        const rows = await ctx.db
          .select()
          .from(moments)
          .where(eq(moments.published, true))
          .orderBy(desc(moments.createdAt))
          .limit(input.limit)
          .catch(() => []);

        if (rows.length > 0) {
          return rows.map((moment) => ({
            id: moment.id,
            body: moment.body,
            location: moment.location ?? "Now",
            accent: moment.accent,
            createdAt: moment.createdAt.toISOString(),
          }));
        }
      }

      return seedMoments.slice(0, input.limit).map(toMoment);
    }),

  dashboard: publicProcedure.query(async ({ ctx }) => {
    const r2 = getR2Status();

    if (hasDatabase) {
      const [postStats] = await ctx.db
        .select({
          count: sql<number>`count(*)::int`,
          views: sql<number>`coalesce(sum(${posts.viewCount}), 0)::int`,
          likes: sql<number>`coalesce(sum(${posts.likeCount}), 0)::int`,
        })
        .from(posts)
        .where(eq(posts.published, true))
        .catch(() => [{ count: 0, views: 0, likes: 0 }]);
      const [momentStats] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(moments)
        .where(eq(moments.published, true))
        .catch(() => [{ count: 0 }]);
      const [commentStats] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(comments)
        .where(eq(comments.status, "approved"))
        .catch(() => [{ count: 0 }]);

      return {
        postCount: postStats?.count ?? 0,
        momentCount: momentStats?.count ?? 0,
        commentCount: commentStats?.count ?? 0,
        totalViews: postStats?.views ?? 0,
        totalLikes: postStats?.likes ?? 0,
        stack: [
          "Next.js",
          "tRPC",
          "TanStack",
          "Drizzle",
          "Neon",
          "Better Auth",
          "Cloudflare R2",
        ],
        databaseMode: "Neon Postgres",
        storageMode: r2.configured ? "Cloudflare R2" : "R2 pending",
      };
    }

    const views = seedPosts.reduce((total, post) => total + post.viewCount, 0);
    const likes = seedPosts.reduce((total, post) => total + post.likeCount, 0);

    return {
      postCount: seedPosts.length,
      momentCount: seedMoments.length,
      commentCount: seedComments.length,
      totalViews: views,
      totalLikes: likes,
      stack: [
        "Next.js",
        "tRPC",
        "TanStack",
        "Drizzle",
        "Neon",
        "Better Auth",
        "Cloudflare R2",
      ],
      databaseMode: hasDatabase ? "Neon Postgres" : "Seed preview",
      storageMode: r2.configured ? "Cloudflare R2" : "R2 pending",
    };
  }),
});
