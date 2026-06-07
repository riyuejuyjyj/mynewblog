import { and, desc, eq } from "drizzle-orm";

import { seedComments, seedPosts } from "@/content/seed";
import {
  withZhCommentOverride,
  withZhPostOverride,
} from "@/content/public-overrides";
import { db, hasDatabase } from "@/db";
import { comments, posts } from "@/db/schema";
import {
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
  authorName: string;
  body: string;
  status: string;
  createdAt: string;
};

function seedToPublicPost(post: (typeof seedPosts)[number]): PublicPost {
  return withZhPostOverride({
    ...post,
    content: rewriteStorageObjectUrlsInText(post.content),
    coverImage: resolveStorageObjectUrl(post.coverImage),
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
    coverImage: resolveStorageObjectUrl(post.coverImage),
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
    createdAt: comment.createdAt.toISOString(),
  });
}

function rowToPublicComment(comment: typeof comments.$inferSelect): PublicComment {
  return withZhCommentOverride({
    id: comment.id,
    postSlug: comment.postSlug,
    authorName: comment.authorName,
    body: comment.body,
    status: comment.status,
    createdAt: comment.createdAt.toISOString(),
  });
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
      .orderBy(desc(comments.createdAt))
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
