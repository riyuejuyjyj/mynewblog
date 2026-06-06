import { and, desc, eq } from "drizzle-orm";

import { seedPosts } from "@/content/seed";
import { db, hasDatabase } from "@/db";
import { comments, posts } from "@/db/schema";

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
  return {
    ...post,
    publishedAt: post.publishedAt.toISOString(),
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
        updatedAt: post.updatedAt.toISOString(),
      }));
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
      } satisfies PublicPost;
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

    return rows.map((comment) => ({
        id: comment.id,
        postSlug: comment.postSlug,
        authorName: comment.authorName,
        body: comment.body,
        status: comment.status,
        createdAt: comment.createdAt.toISOString(),
      }));
  }

  return [];
}
