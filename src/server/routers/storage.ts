import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { hasDatabase } from "@/db";
import { mediaAssets } from "@/db/schema";
import {
  createR2UploadUrl,
  createR2PreviewUrl,
  deleteR2Object,
  getR2Bucket,
  getPublicR2Url,
  getR2Status,
  isR2Configured,
  makeR2ObjectKey,
  r2ObjectExists,
} from "@/lib/r2";
import {
  createTRPCRouter,
  publicProcedure,
  studioProcedure,
} from "@/server/trpc";

const uploadInput = z.object({
  folder: z.enum(["covers", "gallery", "attachments", "music"]).default("attachments"),
  fileName: z.string().min(1).max(160),
  contentType: z.string().min(3).max(120),
  sizeBytes: z.number().int().min(1).max(25 * 1024 * 1024),
  altText: z.string().max(180).optional(),
});

const completeUploadInput = uploadInput.extend({
  bucket: z.string().min(1).max(120),
  objectKey: z.string().min(1).max(500),
  publicUrl: z.string().url().nullable().optional(),
});

export const storageRouter = createTRPCRouter({
  status: publicProcedure.query(() => getR2Status()),

  assets: studioProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(60).default(24),
        })
        .default({ limit: 24 }),
    )
    .query(async ({ ctx, input }) => {
      if (!hasDatabase) {
        return [];
      }

      const rows = await ctx.db
        .select({
          id: mediaAssets.id,
          objectKey: mediaAssets.objectKey,
          folder: mediaAssets.folder,
          publicUrl: mediaAssets.publicUrl,
          contentType: mediaAssets.contentType,
          sizeBytes: mediaAssets.sizeBytes,
          altText: mediaAssets.altText,
          createdAt: mediaAssets.createdAt,
        })
        .from(mediaAssets)
        .orderBy(desc(mediaAssets.createdAt))
        .limit(input.limit);

      return Promise.all(
        rows.map(async (asset) => {
          const publicUrl = asset.publicUrl ?? getPublicR2Url(asset.objectKey);
          const exists =
            asset.contentType.startsWith("image/")
              ? await r2ObjectExists(asset.objectKey)
              : null;

          return {
            ...asset,
            exists,
            publicUrl,
            previewUrl:
              asset.contentType.startsWith("image/") && exists !== false
                ? publicUrl ?? (await createR2PreviewUrl(asset.objectKey))
                : publicUrl,
            createdAt: asset.createdAt.toISOString(),
          };
        }),
      );
    }),

  createUploadUrl: studioProcedure
    .input(uploadInput)
    .mutation(async ({ input }) => {
      if (!isR2Configured()) {
        const objectKey = makeR2ObjectKey(input);

        return {
          configured: false,
          bucket: null,
          objectKey,
          uploadUrl: null,
          publicUrl: getPublicR2Url(objectKey),
          expiresIn: 0,
        };
      }

      const upload = await createR2UploadUrl(input);

      if (!upload) {
        throw new Error("R2 upload URL could not be created.");
      }

      return {
        configured: true,
        ...upload,
      };
    }),

  completeUpload: studioProcedure
    .input(completeUploadInput)
    .mutation(async ({ ctx, input }) => {
      if (!hasDatabase) {
        return {
          ok: true,
          id: null,
        };
      }

      const exists = await r2ObjectExists(input.objectKey);

      if (exists === false) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "R2 object does not exist, so the media record was not saved.",
        });
      }

      const [asset] = await ctx.db
        .insert(mediaAssets)
        .values({
          bucket: input.bucket,
          objectKey: input.objectKey,
          folder: input.folder,
          publicUrl: input.publicUrl ?? getPublicR2Url(input.objectKey),
          contentType: input.contentType,
          sizeBytes: input.sizeBytes,
          altText: input.altText,
          uploadedBy: ctx.session.user.id,
        })
        .onConflictDoUpdate({
          target: [mediaAssets.bucket, mediaAssets.objectKey],
          set: {
            publicUrl: input.publicUrl ?? getPublicR2Url(input.objectKey),
            contentType: input.contentType,
            sizeBytes: input.sizeBytes,
            altText: input.altText,
          },
        })
        .returning({ id: mediaAssets.id });

      return {
        ok: true,
        id: asset?.id ?? null,
      };
    }),

  deleteAsset: studioProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!hasDatabase) {
        return {
          ok: true,
          deletedObject: false,
          missingObject: false,
        };
      }

      const [asset] = await ctx.db
        .select({
          bucket: mediaAssets.bucket,
          objectKey: mediaAssets.objectKey,
        })
        .from(mediaAssets)
        .where(eq(mediaAssets.id, input.id))
        .limit(1);

      if (!asset) {
        return {
          ok: true,
          deletedObject: false,
          missingObject: true,
        };
      }

      const currentBucket = getR2Bucket();
      const deletion =
        currentBucket && currentBucket === asset.bucket
          ? await deleteR2Object(asset.objectKey)
          : { deleted: false, missing: false };

      await ctx.db.delete(mediaAssets).where(eq(mediaAssets.id, input.id));

      return {
        ok: true,
        deletedObject: deletion.deleted,
        missingObject: deletion.missing,
      };
    }),
});
