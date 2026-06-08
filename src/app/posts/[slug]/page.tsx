import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PostArticle } from "@/components/post/post-article";
import {
  getApprovedCommentsByPost,
  getPublishedPostBySlug,
  getPublishedPosts,
  type PublicPost,
} from "@/lib/blog-data";
import {
  absoluteSiteUrl,
  siteConfig,
  toAbsoluteUrl,
} from "@/lib/site-metadata";

type PostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);

  if (!post) {
    return {
      title: "Post not found",
    };
  }

  const canonicalPath = `/posts/${post.slug}`;
  const imageUrl = toAbsoluteUrl(post.coverImage);

  return {
    alternates: {
      canonical: canonicalPath,
    },
    authors: [{ name: siteConfig.author }],
    description: post.excerpt,
    keywords: post.tags,
    openGraph: {
      authors: [siteConfig.author],
      description: post.excerpt,
      images: imageUrl
        ? [
            {
              alt: post.title,
              url: imageUrl,
            },
          ]
        : undefined,
      locale: siteConfig.locale,
      modifiedTime: post.updatedAt ?? post.publishedAt,
      publishedTime: post.publishedAt,
      siteName: siteConfig.name,
      tags: post.tags,
      title: post.title,
      type: "article",
      url: canonicalPath,
    },
    title: post.title,
    twitter: {
      card: "summary_large_image",
      description: post.excerpt,
      images: imageUrl ? [imageUrl] : undefined,
      title: post.title,
    },
  };
}

function stringifyJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function getArticleJsonLd(post: PublicPost) {
  const url = absoluteSiteUrl(`/posts/${post.slug}`);
  const imageUrl = toAbsoluteUrl(post.coverImage);

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    articleSection: post.category,
    author: {
      "@type": "Organization",
      name: siteConfig.author,
    },
    dateModified: post.updatedAt ?? post.publishedAt,
    datePublished: post.publishedAt,
    description: post.excerpt,
    headline: post.title,
    image: imageUrl ? [imageUrl] : undefined,
    inLanguage: "zh-CN",
    keywords: post.tags,
    mainEntityOfPage: {
      "@id": url,
      "@type": "WebPage",
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.author,
    },
    url,
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const [post, posts, comments] = await Promise.all([
    getPublishedPostBySlug(slug),
    getPublishedPosts(24),
    getApprovedCommentsByPost(slug),
  ]);

  if (!post) {
    notFound();
  }

  const currentIndex = posts.findIndex((item) => item.slug === post.slug);
  const previousPost = currentIndex > 0 ? posts[currentIndex - 1] : null;
  const nextPost =
    currentIndex >= 0 && currentIndex < posts.length - 1
      ? posts[currentIndex + 1]
      : null;

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: stringifyJsonLd(getArticleJsonLd(post)),
        }}
        type="application/ld+json"
      />
      <PostArticle
        comments={comments}
        nextPost={nextPost}
        post={post}
        previousPost={previousPost}
      />
    </>
  );
}
