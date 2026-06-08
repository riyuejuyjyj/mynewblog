import type { Metadata } from "next";

import { PostsIndex } from "@/components/posts/posts-index";
import { getPublishedPosts } from "@/lib/blog-data";
import { siteConfig } from "@/lib/site-metadata";

type PostsPageProps = {
  searchParams: Promise<{
    category?: string | string[];
    q?: string | string[];
    tag?: string | string[];
  }>;
};

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanSearchParam(value: string | string[] | undefined) {
  const param = firstSearchParam(value)?.trim();

  return param || undefined;
}

export const metadata: Metadata = {
  alternates: {
    canonical: "/posts",
  },
  description:
    "Browse every public MyNewBlog article across research notes, engineering essays, reading traces, and daily fragments.",
  openGraph: {
    description:
      "Browse every public MyNewBlog article across research notes, engineering essays, reading traces, and daily fragments.",
    locale: siteConfig.locale,
    siteName: siteConfig.name,
    title: "文章归档",
    type: "website",
    url: "/posts",
  },
  title: "文章归档",
  twitter: {
    card: "summary_large_image",
    description:
      "Browse every public MyNewBlog article across research notes, engineering essays, reading traces, and daily fragments.",
    title: "文章归档",
  },
};

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const params = await searchParams;
  const posts = await getPublishedPosts(100);

  return (
    <PostsIndex
      initialCategory={cleanSearchParam(params.category)}
      initialQuery={cleanSearchParam(params.q)}
      initialTag={cleanSearchParam(params.tag)}
      posts={posts}
      syncUrl
    />
  );
}
