import { and, desc, eq, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { hasDatabase } from "@/db";
import { comments, posts } from "@/db/schema";
import { createTRPCRouter, studioProcedure } from "@/server/trpc";

const postInput = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens."),
  title: z.string().min(1).max(180),
  excerpt: z.string().min(1).max(420),
  content: z.string().min(1).max(50000),
  coverImage: z.string().url().max(500),
  category: z.string().min(1).max(80).default("essay"),
  mood: z.string().min(1).max(60).default("quiet"),
  tags: z.array(z.string().min(1).max(40)).max(12).default([]),
  readingMinutes: z.number().int().min(1).max(120).default(4),
  featured: z.boolean().default(false),
  published: z.boolean().default(false),
});

function assertDatabase() {
  if (!hasDatabase) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Studio needs DATABASE_URL to write posts.",
    });
  }
}

export const studioRouter = createTRPCRouter({
  overview: studioProcedure.query(async ({ ctx }) => {
    assertDatabase();

    const rows = await ctx.db
      .select({
        id: posts.id,
        slug: posts.slug,
        title: posts.title,
        excerpt: posts.excerpt,
        content: posts.content,
        coverImage: posts.coverImage,
        category: posts.category,
        tags: posts.tags,
        featured: posts.featured,
        published: posts.published,
        readingMinutes: posts.readingMinutes,
        viewCount: posts.viewCount,
        likeCount: posts.likeCount,
        publishedAt: posts.publishedAt,
        updatedAt: posts.updatedAt,
      })
      .from(posts)
      .orderBy(desc(posts.updatedAt))
      .limit(100);

    const publishedCount = rows.filter((post) => post.published).length;
    const draftCount = rows.length - publishedCount;

    return {
      posts: rows.map((post) => ({
        ...post,
        publishedAt: post.publishedAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      })),
      stats: {
        total: rows.length,
        published: publishedCount,
        drafts: draftCount,
        views: rows.reduce((total, post) => total + post.viewCount, 0),
      },
    };
  }),

  byId: studioProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      assertDatabase();

      const [post] = await ctx.db
        .select()
        .from(posts)
        .where(eq(posts.id, input.id))
        .limit(1);

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found.",
        });
      }

      return {
        ...post,
        publishedAt: post.publishedAt.toISOString(),
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      };
    }),

  upsertPost: studioProcedure.input(postInput).mutation(async ({ ctx, input }) => {
    assertDatabase();

    const slugConflict = await ctx.db
      .select({ id: posts.id })
      .from(posts)
      .where(
        input.id
          ? and(eq(posts.slug, input.slug), ne(posts.id, input.id))
          : eq(posts.slug, input.slug),
      )
      .limit(1);

    if (slugConflict.length > 0) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This slug is already used.",
      });
    }

    const values = {
      slug: input.slug,
      title: input.title.trim(),
      excerpt: input.excerpt.trim(),
      content: input.content.trim(),
      coverImage: input.coverImage,
      category: input.category.trim(),
      mood: input.mood.trim(),
      tags: input.tags.map((tag) => tag.trim()).filter(Boolean),
      readingMinutes: input.readingMinutes,
      featured: input.featured,
      published: input.published,
      authorId: ctx.session.user.id,
      publishedAt: new Date(),
    };

    if (input.id) {
      const [updated] = await ctx.db
        .update(posts)
        .set(values)
        .where(eq(posts.id, input.id))
        .returning();

      return {
        id: updated.id,
      };
    }

    const [created] = await ctx.db.insert(posts).values(values).returning();

    return {
      id: created.id,
    };
  }),

  deletePost: studioProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      assertDatabase();

      const [post] = await ctx.db
        .select({ slug: posts.slug })
        .from(posts)
        .where(eq(posts.id, input.id))
        .limit(1);

      if (post) {
        await ctx.db.delete(comments).where(eq(comments.postSlug, post.slug));
      }

      await ctx.db.delete(posts).where(eq(posts.id, input.id));

      return {
        ok: true,
      };
    }),
});
