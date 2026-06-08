"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { CommentsSection } from "@/components/home/comments-section";
import { copy, localizedMoments } from "@/components/home/copy";
import { GallerySystemSection } from "@/components/home/gallery-system-section";
import { HeroSection } from "@/components/home/hero-section";
import { HomeNav } from "@/components/home/home-nav";
import { PostsMomentsSection } from "@/components/home/posts-moments-section";
import type {
  AmbientMode,
  DashboardData,
  Locale,
} from "@/components/home/types";
import { DynamicBackdrop } from "@/components/dynamic-backdrop";
import {
  withZhCommentOverride,
  withZhPostOverride,
} from "@/content/public-overrides";
import { seedComments, seedMoments, seedPosts } from "@/content/seed";
import { trpc } from "@/trpc/client";

const gallery = [
  "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1516542076529-1ea3854896f2?auto=format&fit=crop&w=900&q=80",
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function getFallbackDashboard(): DashboardData {
  return {
    postCount: seedPosts.length,
    momentCount: seedMoments.length,
    commentCount: seedComments.length,
    totalViews: seedPosts.reduce((total, post) => total + post.viewCount, 0),
    totalLikes: seedPosts.reduce((total, post) => total + post.likeCount, 0),
  };
}

export function HomeExperience() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const postsQuery = trpc.blog.feed.useQuery({ limit: 6 });
  const momentsQuery = trpc.blog.moments.useQuery({ limit: 4 });
  const dashboardQuery = trpc.blog.dashboard.useQuery();
  const commentsQuery = trpc.comments.recent.useQuery({ limit: 5 });
  const createComment = trpc.comments.create.useMutation({
    onSuccess: async () => {
      setCommentBody("");
      await utils.comments.recent.invalidate();
    },
  });

  const [locale, setLocale] = useState<Locale>("zh");
  const [ambientMode, setAmbientMode] = useState<AmbientMode>("day");
  const [commentName, setCommentName] = useState("");
  const [commentEmail, setCommentEmail] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const t = copy[locale];

  const rawPosts =
    postsQuery.data ??
    seedPosts.map((post) => ({
      ...post,
      publishedAt: post.publishedAt.toISOString(),
    }));
  const posts =
    locale === "zh" ? rawPosts.map(withZhPostOverride) : rawPosts;

  const rawMoments =
    momentsQuery.data ??
    seedMoments.map((moment) => ({
      ...moment,
      createdAt: moment.createdAt.toISOString(),
    }));
  const moments = rawMoments.map((moment) => ({
    ...moment,
    ...(localizedMoments[locale][moment.id] ?? {}),
  }));

  const rawComments =
    commentsQuery.data ??
    seedComments.map((comment) => ({
      ...comment,
      parentId: comment.parentId ?? null,
      createdAt: comment.createdAt.toISOString(),
    }));
  const comments =
    locale === "zh"
      ? rawComments.map((comment) => withZhCommentOverride(comment))
      : rawComments;

  const dashboard = dashboardQuery.data ?? getFallbackDashboard();
  const featured = posts.find((post) => post.featured) ?? posts[0];

  useEffect(() => {
    if (window.location.hash === "#studio") {
      router.replace("/studio");
    }
  }, [router]);

  function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    createComment.mutate({
      postSlug: featured.slug,
      authorName: commentName,
      authorEmail: commentEmail,
      body: commentBody,
    });
  }

  return (
    <main className="home-shell relative min-h-screen overflow-hidden px-4 pb-16 pt-6 text-slate-950 dark:text-white sm:px-6 lg:px-8">
      <DynamicBackdrop ambientMode={ambientMode} />
      <HomeNav
        ambientMode={ambientMode}
        locale={locale}
        t={t}
        onAmbientToggle={() =>
          setAmbientMode((current) => (current === "day" ? "night" : "day"))
        }
        onLocaleToggle={() =>
          setLocale((current) => (current === "zh" ? "en" : "zh"))
        }
      />
      <HeroSection dashboard={dashboard} featured={featured} t={t} />
      <PostsMomentsSection
        formatDate={formatDate}
        moments={moments}
        posts={posts}
        t={t}
      />
      <GallerySystemSection gallery={gallery} t={t} />
      <CommentsSection
        commentBody={commentBody}
        commentEmail={commentEmail}
        commentName={commentName}
        comments={comments}
        featured={featured}
        formatDate={formatDate}
        isPending={createComment.isPending}
        onBodyChange={setCommentBody}
        onEmailChange={setCommentEmail}
        onNameChange={setCommentName}
        onSubmit={submitComment}
        t={t}
      />
    </main>
  );
}
