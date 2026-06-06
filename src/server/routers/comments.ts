import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { hasDatabase } from "@/db";
import { comments } from "@/db/schema";
import { seedComments } from "@/content/seed";
import {
  createTRPCRouter,
  publicProcedure,
  studioProcedure,
} from "@/server/trpc";

const commentInput = z.object({
  postSlug: z.string().min(1).max(120),
  authorName: z.string().min(1).max(80),
  authorEmail: z.string().email().max(160),
  authorUrl: z.string().url().max(240).optional().or(z.literal("")),
  body: z.string().min(2).max(1200),
});

function toComment(comment: typeof seedComments[number]) {
  return {
    ...comment,
    createdAt: comment.createdAt.toISOString(),
  };
}

export const commentsRouter = createTRPCRouter({
  recent: publicProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(12).default(5),
        })
        .default({ limit: 5 }),
    )
    .query(async ({ ctx, input }) => {
      if (hasDatabase) {
        const rows = await ctx.db
          .select()
          .from(comments)
          .where(eq(comments.status, "approved"))
          .orderBy(desc(comments.createdAt))
          .limit(input.limit)
          .catch(() => []);

        return rows.map((comment) => ({
          id: comment.id,
          postSlug: comment.postSlug,
          authorName: comment.authorName,
          body: comment.body,
          status: comment.status,
          createdAt: comment.createdAt.toISOString(),
        }));
      }

      return seedComments.slice(0, input.limit).map(toComment);
    }),

  byPost: publicProcedure
    .input(
      z.object({
        postSlug: z.string().min(1).max(120),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (hasDatabase) {
        const rows = await ctx.db
          .select()
          .from(comments)
          .where(
            and(
              eq(comments.postSlug, input.postSlug),
              eq(comments.status, "approved"),
            ),
          )
          .orderBy(desc(comments.createdAt))
          .limit(input.limit)
          .catch(() => []);

        return rows.map((comment) => ({
          id: comment.id,
          postSlug: comment.postSlug,
          authorName: comment.authorName,
          body: comment.body,
          status: comment.status,
          createdAt: comment.createdAt.toISOString(),
        }));
      }

      return seedComments
        .filter((comment) => comment.postSlug === input.postSlug)
        .slice(0, input.limit)
        .map(toComment);
    }),

  create: publicProcedure.input(commentInput).mutation(async ({ ctx, input }) => {
    const normalized = {
      ...input,
      authorName: input.authorName.trim(),
      authorUrl: input.authorUrl?.trim() || null,
      body: input.body.trim(),
      status: "pending",
    };

    if (hasDatabase) {
      const [created] = await ctx.db
        .insert(comments)
        .values(normalized)
        .returning({
          id: comments.id,
          postSlug: comments.postSlug,
          authorName: comments.authorName,
          body: comments.body,
          status: comments.status,
          createdAt: comments.createdAt,
        });

      return {
        ...created,
        createdAt: created.createdAt.toISOString(),
      };
    }

    return {
      id: crypto.randomUUID(),
      postSlug: normalized.postSlug,
      authorName: normalized.authorName,
      body: normalized.body,
      status: normalized.status,
      createdAt: new Date().toISOString(),
    };
  }),

  studioList: studioProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(80).default(30),
          status: z
            .enum(["all", "approved", "pending", "spam"])
            .default("all"),
        })
        .default({ limit: 30, status: "all" }),
    )
    .query(async ({ ctx, input }) => {
      if (!hasDatabase) {
        return seedComments.slice(0, input.limit).map(toComment);
      }

      const rows = await ctx.db
        .select()
        .from(comments)
        .where(
          input.status === "all"
            ? undefined
            : eq(comments.status, input.status),
        )
        .orderBy(desc(comments.createdAt))
        .limit(input.limit)
        .catch((error) => {
          if (process.env.NODE_ENV !== "production") {
            console.warn(
              "[comments] studioList query failed; returning an empty moderation list.",
              error instanceof Error ? error.message : error,
            );
          }

          return [];
        });

      return rows.map((comment) => ({
        id: comment.id,
        postSlug: comment.postSlug,
        authorName: comment.authorName,
        authorEmail: comment.authorEmail,
        authorUrl: comment.authorUrl,
        body: comment.body,
        status: comment.status,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
      }));
    }),

  updateStatus: studioProcedure
    .input(
      z.object({
        id: z.string().min(1),
        status: z.enum(["approved", "pending", "spam"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!hasDatabase) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Comment moderation needs DATABASE_URL.",
        });
      }

      const [updated] = await ctx.db
        .update(comments)
        .set({
          status: input.status,
          updatedAt: new Date(),
        })
        .where(eq(comments.id, input.id))
        .returning({
          id: comments.id,
          status: comments.status,
          updatedAt: comments.updatedAt,
        });

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comment not found.",
        });
      }

      return {
        ...updated,
        updatedAt: updated.updatedAt.toISOString(),
      };
    }),

  delete: studioProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!hasDatabase) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Comment deletion needs DATABASE_URL.",
        });
      }

      await ctx.db.delete(comments).where(eq(comments.id, input.id));

      return {
        ok: true,
      };
    }),
});
