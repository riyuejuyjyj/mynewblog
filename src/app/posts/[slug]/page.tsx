import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PostArticle } from "@/components/post/post-article";
import {
  getApprovedCommentsByPost,
  getPublishedPostBySlug,
  getPublishedPosts,
} from "@/lib/blog-data";

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
      title: "Post not found | MyNewBlog",
    };
  }

  return {
    title: `${post.title} | MyNewBlog`,
    description: post.excerpt,
    openGraph: {
      description: post.excerpt,
      images: [post.coverImage],
      title: post.title,
      type: "article",
    },
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
      <PostArticle
        comments={comments}
        nextPost={nextPost}
        post={post}
        previousPost={previousPost}
      />
    </>
  );
}
