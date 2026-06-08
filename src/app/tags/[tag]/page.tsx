import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PostsIndex } from "@/components/posts/posts-index";
import { getPublishedPosts } from "@/lib/blog-data";
import { decodeTaxonomyParam, getTagPath } from "@/lib/blog-taxonomy";
import { siteConfig } from "@/lib/site-metadata";

type TagPageProps = {
  params: Promise<{
    tag: string;
  }>;
};

export async function generateMetadata({
  params,
}: TagPageProps): Promise<Metadata> {
  const { tag: rawTag } = await params;
  const tag = decodeTaxonomyParam(rawTag);
  const title = `标签：${tag}`;

  return {
    alternates: {
      canonical: getTagPath(tag),
    },
    description: `MyNewBlog 中带有「${tag}」标签的公开文章。`,
    openGraph: {
      description: `MyNewBlog 中带有「${tag}」标签的公开文章。`,
      locale: siteConfig.locale,
      siteName: siteConfig.name,
      title,
      type: "website",
      url: getTagPath(tag),
    },
    title,
    twitter: {
      card: "summary_large_image",
      description: `MyNewBlog 中带有「${tag}」标签的公开文章。`,
      title,
    },
  };
}

export default async function TagPage({ params }: TagPageProps) {
  const { tag: rawTag } = await params;
  const tag = decodeTaxonomyParam(rawTag);
  const posts = await getPublishedPosts(100);

  if (!posts.some((post) => post.tags.includes(tag))) {
    notFound();
  }

  return (
    <PostsIndex
      description={`所有带有「${tag}」标签的公开文章。`}
      eyebrow="标签"
      initialTag={tag}
      posts={posts}
      title={`#${tag}`}
    />
  );
}
