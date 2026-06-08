import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PostsIndex } from "@/components/posts/posts-index";
import { getPublishedPosts } from "@/lib/blog-data";
import {
  decodeTaxonomyParam,
  getCategoryPath,
} from "@/lib/blog-taxonomy";
import { siteConfig } from "@/lib/site-metadata";

type CategoryPageProps = {
  params: Promise<{
    category: string;
  }>;
};

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { category: rawCategory } = await params;
  const category = decodeTaxonomyParam(rawCategory);
  const title = `分类：${category}`;

  return {
    alternates: {
      canonical: getCategoryPath(category),
    },
    description: `MyNewBlog 中「${category}」分类下的公开文章。`,
    openGraph: {
      description: `MyNewBlog 中「${category}」分类下的公开文章。`,
      locale: siteConfig.locale,
      siteName: siteConfig.name,
      title,
      type: "website",
      url: getCategoryPath(category),
    },
    title,
    twitter: {
      card: "summary_large_image",
      description: `MyNewBlog 中「${category}」分类下的公开文章。`,
      title,
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category: rawCategory } = await params;
  const category = decodeTaxonomyParam(rawCategory);
  const posts = await getPublishedPosts(100);

  if (!posts.some((post) => post.category === category)) {
    notFound();
  }

  return (
    <PostsIndex
      description={`所有归入「${category}」分类的公开文章。`}
      eyebrow="分类"
      initialCategory={category}
      posts={posts}
      title={category}
    />
  );
}
