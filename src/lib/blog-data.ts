import { and, asc, desc, eq, sql } from "drizzle-orm";

import { blogConfig } from "@/config/site";
import { seedComments, seedMoments, seedPosts } from "@/content/seed";
import {
  withZhCommentOverride,
  withZhPostOverride,
} from "@/content/public-overrides";
import { db, hasDatabase } from "@/db";
import { comments, mediaAssets, moments, posts } from "@/db/schema";
import {
  buildStorageObjectUrl,
  resolveStorageObjectUrl,
  rewriteStorageObjectUrlsInText,
} from "@/lib/storage-object-url";

export type PublicPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  mood: string;
  tags: string[];
  readingMinutes: number;
  viewCount: number;
  likeCount: number;
  featured: boolean;
  publishedAt: string;
  updatedAt?: string;
};

export type PublicComment = {
  id: string;
  postSlug: string;
  parentId: string | null;
  authorName: string;
  body: string;
  status: string;
  createdAt: string;
};

export type PublicMoment = {
  id: string;
  body: string;
  location: string;
  accent: string;
  createdAt: string;
};

export type PublicGalleryItem = {
  id: string;
  url: string;
  alt: string;
};

export type PublicDashboard = {
  postCount: number;
  momentCount: number;
  commentCount: number;
  totalViews: number;
  totalLikes: number;
};

const zhMomentOverrides: Record<string, { body: string; location: string }> = {
  "moment-01": {
    body: "今天把首页收拾成了一间靠海的二次元书房：窗外有晴空与樱花，桌上有文章与留白。",
    location: "窗边书桌",
  },
  "moment-02": {
    body: "有些工程判断需要写成笔记，过几周再回来看，才知道当时的犹豫有没有意义。",
    location: "笔记本",
  },
  "moment-03": {
    body: "希望这个地方轻一点，但不要空；安静一点，但仍然有人正在认真生活。",
    location: "午后微风",
  },
};

function normalizeCoverUrl(value: string | null | undefined) {
  const resolved = resolveStorageObjectUrl(value ?? "");

  return resolved || blogConfig.images.defaultCover;
}

function seedToPublicPost(post: (typeof seedPosts)[number]): PublicPost {
  return withZhPostOverride({
    ...post,
    content: rewriteStorageObjectUrlsInText(post.content),
    coverImage: normalizeCoverUrl(post.coverImage),
    publishedAt: post.publishedAt.toISOString(),
  });
}

function rowToPublicPost(post: typeof posts.$inferSelect): PublicPost {
  return withZhPostOverride({
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: rewriteStorageObjectUrlsInText(post.content),
    coverImage: normalizeCoverUrl(post.coverImage),
    category: post.category,
    mood: post.mood,
    tags: post.tags,
    readingMinutes: post.readingMinutes,
    viewCount: post.viewCount,
    likeCount: post.likeCount,
    featured: post.featured,
    publishedAt: post.publishedAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  });
}

function seedToPublicComment(
  comment: (typeof seedComments)[number],
): PublicComment {
  return withZhCommentOverride({
    ...comment,
    parentId: comment.parentId ?? null,
    createdAt: comment.createdAt.toISOString(),
  });
}

function rowToPublicComment(
  comment: typeof comments.$inferSelect,
): PublicComment {
  return withZhCommentOverride({
    id: comment.id,
    postSlug: comment.postSlug,
    parentId: comment.parentId,
    authorName: comment.authorName,
    body: comment.body,
    status: comment.status,
    createdAt: comment.createdAt.toISOString(),
  });
}

function seedToPublicMoment(
  moment: (typeof seedMoments)[number],
): PublicMoment {
  const override = zhMomentOverrides[moment.id];

  return {
    id: moment.id,
    body: override?.body ?? moment.body,
    location: override?.location ?? moment.location,
    accent: moment.accent,
    createdAt: moment.createdAt.toISOString(),
  };
}

export async function getPublishedPosts(limit = 12): Promise<PublicPost[]> {
  if (hasDatabase) {
    const rows = await db
      .select()
      .from(posts)
      .where(eq(posts.published, true))
      .orderBy(desc(posts.publishedAt))
      .limit(limit)
      .catch(() => []);

    if (rows.length > 0) {
      return rows.map(rowToPublicPost);
    }
  }

  return seedPosts.slice(0, limit).map(seedToPublicPost);
}

export async function getPublishedPostBySlug(slug: string) {
  if (hasDatabase) {
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.slug, slug))
      .limit(1)
      .catch(() => []);

    if (post?.published) {
      return rowToPublicPost(post);
    }
  }

  const post = seedPosts.find((item) => item.slug === slug);
  return post ? seedToPublicPost(post) : null;
}

export async function getApprovedCommentsByPost(slug: string) {
  if (hasDatabase) {
    const rows = await db
      .select()
      .from(comments)
      .where(and(eq(comments.postSlug, slug), eq(comments.status, "approved")))
      .orderBy(asc(comments.createdAt))
      .limit(50)
      .catch(() => []);

    if (rows.length === 0) {
      return seedComments
        .filter((comment) => comment.postSlug === slug)
        .map(seedToPublicComment);
    }

    return rows.map(rowToPublicComment);
  }

  return seedComments
    .filter((comment) => comment.postSlug === slug)
    .map(seedToPublicComment);
}

export async function getPublishedMoments(limit = 5): Promise<PublicMoment[]> {
  if (hasDatabase) {
    const rows = await db
      .select()
      .from(moments)
      .where(eq(moments.published, true))
      .orderBy(desc(moments.createdAt))
      .limit(limit)
      .catch(() => []);

    if (rows.length > 0) {
      return rows.map((row) => ({
        id: row.id,
        body: row.body,
        location: row.location ?? "此刻",
        accent: row.accent,
        createdAt: row.createdAt.toISOString(),
      }));
    }
  }

  return seedMoments.slice(0, limit).map(seedToPublicMoment);
}

export async function getRecentApprovedComments(
  limit = 6,
): Promise<PublicComment[]> {
  if (hasDatabase) {
    const rows = await db
      .select()
      .from(comments)
      .where(eq(comments.status, "approved"))
      .orderBy(desc(comments.createdAt))
      .limit(limit)
      .catch(() => []);

    if (rows.length > 0) {
      return rows.map(rowToPublicComment);
    }
  }

  return seedComments.slice(0, limit).map(seedToPublicComment);
}

export async function getPublicGallery(
  limit = 6,
): Promise<PublicGalleryItem[]> {
  if (!hasDatabase) {
    return [];
  }

  const rows = await db
    .select({
      id: mediaAssets.id,
      objectKey: mediaAssets.objectKey,
      publicUrl: mediaAssets.publicUrl,
      contentType: mediaAssets.contentType,
      altText: mediaAssets.altText,
    })
    .from(mediaAssets)
    .where(eq(mediaAssets.folder, "gallery"))
    .orderBy(desc(mediaAssets.createdAt))
    .limit(limit)
    .catch(() => []);

  return rows
    .filter((row) => row.contentType.startsWith("image/"))
    .map((row) => {
      const url = resolveStorageObjectUrl(
        buildStorageObjectUrl(row.objectKey) ?? row.publicUrl ?? "",
      );

      return {
        id: row.id,
        url,
        alt: row.altText?.trim() || "相册影像",
      };
    })
    .filter((item) => Boolean(item.url));
}

export async function getPublicDashboard(): Promise<PublicDashboard> {
  if (hasDatabase) {
    const [postStats] = await db
      .select({
        count: sql<number>`count(*)::int`,
        views: sql<number>`coalesce(sum(${posts.viewCount}), 0)::int`,
        likes: sql<number>`coalesce(sum(${posts.likeCount}), 0)::int`,
      })
      .from(posts)
      .where(eq(posts.published, true))
      .catch(() => [{ count: 0, views: 0, likes: 0 }]);
    const [momentStats] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(moments)
      .where(eq(moments.published, true))
      .catch(() => [{ count: 0 }]);
    const [commentStats] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(comments)
      .where(eq(comments.status, "approved"))
      .catch(() => [{ count: 0 }]);

    if (postStats?.count || momentStats?.count) {
      return {
        postCount: postStats?.count ?? 0,
        momentCount: momentStats?.count ?? 0,
        commentCount: commentStats?.count ?? 0,
        totalViews: postStats?.views ?? 0,
        totalLikes: postStats?.likes ?? 0,
      };
    }
  }

  return {
    postCount: seedPosts.length,
    momentCount: seedMoments.length,
    commentCount: seedComments.length,
    totalViews: seedPosts.reduce((total, post) => total + post.viewCount, 0),
    totalLikes: seedPosts.reduce((total, post) => total + post.likeCount, 0),
  };
}

export async function getHomePageData() {
  const [postsList, momentsList, recentComments, gallery, dashboard] =
    await Promise.all([
      getPublishedPosts(12),
      getPublishedMoments(5),
      getRecentApprovedComments(6),
      getPublicGallery(6),
      getPublicDashboard(),
    ]);

  return {
    dashboard,
    gallery,
    moments: momentsList,
    posts: postsList,
    recentComments,
  };
}
