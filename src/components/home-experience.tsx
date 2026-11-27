"use client";

import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Feather,
  FolderOpen,
  Heart,
  Image as ImageIcon,
  MapPin,
  Megaphone,
  MessageCircle,
  PenLine,
  Send,
  Sparkles,
  Tag,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { AnimeHero } from "@/components/home/anime-hero";
import { WritingHeatmap } from "@/components/home/writing-heatmap";
import { FloatingDock } from "@/components/layout/floating-dock";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { blogConfig } from "@/config/site";
import type {
  PublicComment,
  PublicDashboard,
  PublicGalleryItem,
  PublicMoment,
  PublicPost,
} from "@/lib/blog-data";
import { getCategoryPath, getTagPath } from "@/lib/blog-taxonomy";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";

type HomeExperienceProps = {
  initialDashboard: PublicDashboard;
  initialGallery: PublicGalleryItem[];
  initialMoments: PublicMoment[];
  initialPosts: PublicPost[];
  initialRecentComments: PublicComment[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function HomeExperience({
  initialDashboard,
  initialGallery,
  initialMoments,
  initialPosts,
  initialRecentComments,
}: HomeExperienceProps) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [commentName, setCommentName] = useState("");
  const [commentEmail, setCommentEmail] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [commentNotice, setCommentNotice] = useState("");
  const [commentError, setCommentError] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);

  const createComment = trpc.comments.create.useMutation({
    onSuccess: async () => {
      setCommentBody("");
      setCommentError("");
      setCommentNotice("评论已提交，审核通过后会显示在文章评论区。");
      setComposerOpen(false);
      await utils.comments.recent.invalidate();
    },
    onError: (error) => {
      setCommentNotice("");
      setCommentError(error.message || "提交失败，请检查昵称、邮箱与内容后重试。");
    },
  });

  useEffect(() => {
    if (window.location.hash === "#studio") {
      router.replace("/studio");
    }
  }, [router]);

  const featured = useMemo(
    () => initialPosts.find((post) => post.featured) ?? initialPosts[0] ?? null,
    [initialPosts],
  );

  const feedPosts = useMemo(() => {
    if (!featured) return initialPosts;

    const rest = initialPosts.filter((post) => post.id !== featured.id);
    return rest.length > 0 ? rest : initialPosts;
  }, [featured, initialPosts]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();

    for (const post of initialPosts) {
      counts.set(post.category, (counts.get(post.category) ?? 0) + 1);
    }

    return Array.from(counts.entries()).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
  }, [initialPosts]);

  const popularTags = useMemo(() => {
    const counts = new Map<string, number>();

    for (const post of initialPosts) {
      for (const tag of post.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 14)
      .map(([tag]) => tag);
  }, [initialPosts]);

  const postTitleBySlug = useMemo(
    () => new Map(initialPosts.map((post) => [post.slug, post.title])),
    [initialPosts],
  );

  const activityDates = useMemo(
    () => [
      ...initialPosts.map((post) => post.publishedAt),
      ...initialMoments.map((moment) => moment.createdAt),
    ],
    [initialMoments, initialPosts],
  );

  function submitQuickComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!featured) return;

    setCommentError("");
    setCommentNotice("");
    createComment.mutate({
      postSlug: featured.slug,
      authorName: commentName,
      authorEmail: commentEmail,
      body: commentBody,
    });
  }

  return (
    <div className="home-shell anime-page-bg min-h-screen bg-background text-foreground">
      <SiteHeader overlayHero />
      <AnimeHero />

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 lg:pt-10">
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          {/* Primary Left Column */}
          <div className="min-w-0 space-y-9">
            {/* Soft Pink-Blue Announcement Ribbon */}
            <div className="anime-card flex items-center gap-3 border-accent-200/70 bg-gradient-to-r from-accent-50/90 via-surface to-sky-50/70 px-4 py-3 text-xs leading-6 text-slate-600 dark:border-accent-400/20 dark:from-accent-500/12 dark:via-surface dark:to-sky-500/10 dark:text-slate-300">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-500 text-white shadow-sm">
                <Megaphone className="size-3.5" />
              </span>
              <p className="min-w-0 flex-1">{blogConfig.announcement}</p>
            </div>

            {/* Featured Spotlight */}
            {featured ? (
              <section aria-label="精选推荐">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-accent-500 to-sky-400" />
                    <h2 className="font-serif text-xl font-bold">精选推荐</h2>
                  </div>
                  <span className="font-mono text-xs text-slate-400">
                    FEATURED
                  </span>
                </div>

                <article className="anime-card group overflow-hidden">
                  <Link
                    href={`/posts/${featured.slug}`}
                    className="grid md:grid-cols-[1.15fr_1fr]"
                  >
                    <div className="shoka-cover-left relative aspect-[16/10] overflow-hidden bg-surface-muted md:aspect-auto md:min-h-[260px]">
                      <Image
                        src={featured.coverImage}
                        alt={featured.title}
                        fill
                        sizes="(min-width: 1024px) 460px, 100vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                      <div className="absolute left-3.5 top-3.5 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent-500 px-3 py-1 text-xs font-semibold text-white shadow-md">
                          <Sparkles className="size-3" />
                          精选
                        </span>
                        <span className="rounded-full bg-slate-950/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
                          {featured.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between p-5 sm:p-6">
                      <div>
                        <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="size-3.5 text-accent-500" />
                            {formatDate(featured.publishedAt)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="size-3.5" />
                            {featured.readingMinutes} 分钟
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Heart className="size-3.5 text-accent-400" />
                            {featured.likeCount}
                          </span>
                        </div>

                        <h3 className="mt-3 font-serif text-xl font-bold leading-snug text-slate-900 transition-colors group-hover:text-accent-600 dark:text-white dark:group-hover:text-accent-300 sm:text-2xl">
                          {featured.title}
                        </h3>

                        <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                          {featured.excerpt}
                        </p>
                      </div>

                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-white/8">
                        <div className="flex flex-wrap gap-1.5">
                          {featured.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent-600 transition-transform group-hover:translate-x-1 dark:text-accent-300">
                          阅读全文
                          <ArrowRight className="size-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </article>
              </section>
            ) : null}

            {/* Latest Posts — ShokaX Alternating Media Cards */}
            <section id="posts" className="scroll-mt-24">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-5 w-1.5 rounded-full bg-accent-500" />
                  <h2 className="font-serif text-xl font-bold">最新文章</h2>
                </div>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/posts">
                    全部文章
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>

              <div className="space-y-5">
                {feedPosts.slice(0, 6).map((post, index) => {
                  const reverseDesktop = index % 2 === 1;

                  return (
                    <article
                      key={post.id}
                      className="anime-card group overflow-hidden"
                    >
                      <div className="grid md:grid-cols-12">
                        <Link
                          href={`/posts/${post.slug}`}
                          aria-label={`阅读 ${post.title}`}
                          className={cn(
                            "relative aspect-[16/10] overflow-hidden bg-surface-muted md:col-span-5 md:aspect-auto md:min-h-[210px]",
                            reverseDesktop
                              ? "shoka-cover-right md:order-2"
                              : "shoka-cover-left",
                          )}
                        >
                          <Image
                            src={post.coverImage}
                            alt={post.title}
                            fill
                            sizes="(min-width: 1024px) 340px, 100vw"
                            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                          />
                          <span className="absolute left-3 top-3 rounded-full bg-slate-950/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                            {post.category}
                          </span>
                        </Link>

                        <div
                          className={cn(
                            "flex min-w-0 flex-col justify-between p-5 md:col-span-7",
                            reverseDesktop && "md:order-1",
                          )}
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-slate-400">
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays className="size-3.5 text-accent-500" />
                                {formatDate(post.publishedAt)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock3 className="size-3.5" />
                                {post.readingMinutes} 分钟
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Heart className="size-3.5" />
                                {post.likeCount}
                              </span>
                            </div>

                            <Link href={`/posts/${post.slug}`}>
                              <h3 className="mt-2.5 font-serif text-lg font-bold leading-snug text-slate-900 transition-colors group-hover:text-accent-600 dark:text-white dark:group-hover:text-accent-300 sm:text-xl">
                                {post.title}
                              </h3>
                            </Link>

                            <p className="mt-2.5 line-clamp-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                              {post.excerpt}
                            </p>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-3">
                            <div className="flex flex-wrap gap-1.5">
                              {post.tags.slice(0, 3).map((tag) => (
                                <Link
                                  key={tag}
                                  href={getTagPath(tag)}
                                  className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[11px] font-medium text-slate-600 transition hover:bg-accent-50 hover:text-accent-700 dark:text-slate-300 dark:hover:bg-accent-500/18 dark:hover:text-accent-200"
                                >
                                  #{tag}
                                </Link>
                              ))}
                            </div>
                            <Link
                              href={`/posts/${post.slug}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-accent-600 transition-transform hover:translate-x-0.5 dark:text-accent-300"
                            >
                              阅读
                              <ArrowRight className="size-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            {/* Moments / 随笔气泡流 */}
            <section id="moments" className="scroll-mt-24">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-5 w-1.5 rounded-full bg-accent-500" />
                  <h2 className="font-serif text-xl font-bold">随笔碎片</h2>
                </div>
                <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-400">
                  <Feather className="size-3.5 text-accent-400" />
                  {initialMoments.length} 条记录
                </span>
              </div>

              <div className="anime-card p-5 sm:p-6">
                <ol className="relative space-y-5 border-l-2 border-accent-200/80 pl-5 dark:border-accent-500/25">
                  {initialMoments.map((moment) => (
                    <li key={moment.id} className="relative">
                      <span className="absolute -left-[27px] top-1.5 size-3 rounded-full border-2 border-surface bg-accent-500 ring-4 ring-accent-100 dark:ring-accent-500/20" />
                      <div className="rounded-2xl bg-surface-muted/75 p-4 dark:bg-white/[0.04]">
                        <p className="font-serif text-sm leading-7 text-slate-700 dark:text-slate-200">
                          {moment.body}
                        </p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3 text-accent-400" />
                            {moment.location}
                          </span>
                          <span className="font-mono">
                            {formatShortDate(moment.createdAt)}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            {/* R2 Real Gallery Strip (only shown when R2 gallery has real uploaded images) */}
            {initialGallery.length > 0 ? (
              <section id="gallery" className="scroll-mt-24">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-1.5 rounded-full bg-accent-500" />
                    <h2 className="font-serif text-xl font-bold">相册剪影</h2>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                    <ImageIcon className="size-3.5 text-accent-400" />
                    R2 实景素材
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {initialGallery.map((item) => (
                    <figure
                      key={item.id}
                      className="anime-card group relative aspect-[4/3] overflow-hidden"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt={item.alt}
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </figure>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          {/* Right Sticky Anime Profile & Navigation Sidebar */}
          <aside className="space-y-5 lg:sticky lg:top-20">
            {/* Author Profile Card */}
            <section className="anime-card overflow-hidden">
              <div className="relative h-24 overflow-hidden">
                <Image
                  src={blogConfig.images.heroDay}
                  alt=""
                  fill
                  sizes="320px"
                  className="object-cover dark:opacity-0"
                />
                <Image
                  src={blogConfig.images.heroNight}
                  alt=""
                  fill
                  sizes="320px"
                  className="object-cover opacity-0 dark:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-slate-950/20" />
              </div>

              <div className="-mt-11 px-5 pb-5 text-center">
                <div className="relative mx-auto size-20 overflow-hidden rounded-full border-4 border-surface bg-surface shadow-lg ring-2 ring-accent-200 transition-transform duration-500 hover:rotate-6 dark:ring-accent-400/35">
                  <Image
                    src={blogConfig.images.avatar}
                    alt={blogConfig.author}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>

                <h2 className="mt-3 font-serif text-lg font-bold text-slate-900 dark:text-white">
                  {blogConfig.author}
                </h2>
                <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                  {blogConfig.bio}
                </p>

                <div className="mt-4 grid grid-cols-3 divide-x divide-slate-100 rounded-2xl bg-surface-muted/75 py-2.5 dark:divide-white/8 dark:bg-white/[0.04]">
                  <Link href="/posts" className="group block">
                    <div className="font-mono text-base font-bold text-slate-900 transition group-hover:text-accent-600 dark:text-white dark:group-hover:text-accent-300">
                      {initialDashboard.postCount}
                    </div>
                    <div className="text-[11px] text-slate-400">文章</div>
                  </Link>
                  <a href="#moments" className="group block">
                    <div className="font-mono text-base font-bold text-slate-900 transition group-hover:text-accent-600 dark:text-white dark:group-hover:text-accent-300">
                      {initialDashboard.momentCount}
                    </div>
                    <div className="text-[11px] text-slate-400">随笔</div>
                  </a>
                  <div>
                    <div className="font-mono text-base font-bold text-slate-900 dark:text-white">
                      {compactNumber(initialDashboard.totalViews)}
                    </div>
                    <div className="text-[11px] text-slate-400">浏览</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button asChild size="sm" variant="soft">
                    <Link href="/posts">
                      <BookOpen className="size-3.5" />
                      归档
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="glass">
                    <Link href="/studio">
                      <PenLine className="size-3.5" />
                      创作室
                    </Link>
                  </Button>
                </div>
              </div>
            </section>

            {/* Annual Writing Activity Heatmap */}
            <WritingHeatmap dates={activityDates} weeks={15} />

            {/* Categories Card */}
            <section className="anime-card p-5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                  <FolderOpen className="size-4 text-accent-500" />
                  文章分类
                </h3>
                <span className="font-mono text-xs text-slate-400">
                  {categories.length}
                </span>
              </div>
              <div className="mt-3 space-y-1.5">
                {categories.map(([category, count]) => (
                  <Link
                    key={category}
                    href={getCategoryPath(category)}
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-accent-50 hover:text-accent-700 dark:text-slate-300 dark:hover:bg-accent-500/15 dark:hover:text-accent-200"
                  >
                    <span>{category}</span>
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 font-mono text-[11px] text-slate-500 dark:bg-white/8 dark:text-slate-400">
                      {count}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            {/* Tag Cloud Card */}
            {popularTags.length > 0 ? (
              <section className="anime-card p-5">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                  <Tag className="size-4 text-accent-500" />
                  热门标签
                </h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {popularTags.map((tag) => (
                    <Link
                      key={tag}
                      href={getTagPath(tag)}
                      className="rounded-full border border-slate-200/80 bg-surface-muted/70 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-accent-300 hover:bg-accent-50 hover:text-accent-700 dark:border-white/8 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:border-accent-400/40 dark:hover:text-accent-200"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Recent Reader Comments Card */}
            <section id="comments" className="anime-card scroll-mt-24 p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                  <MessageCircle className="size-4 text-accent-500" />
                  最新评论
                </h3>
                <Badge>{initialDashboard.commentCount} 条</Badge>
              </div>

              <div className="mt-3 space-y-2.5">
                {initialRecentComments.slice(0, 4).map((comment) => (
                  <Link
                    key={comment.id}
                    href={`/posts/${comment.postSlug}#comments`}
                    className="block rounded-xl bg-surface-muted/75 p-3 transition hover:bg-accent-50/75 dark:bg-white/[0.04] dark:hover:bg-accent-500/12"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                      <span className="truncate font-semibold text-slate-700 dark:text-slate-200">
                        {comment.authorName}
                      </span>
                      <span className="shrink-0 font-mono">
                        {formatShortDate(comment.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                      {comment.body}
                    </p>
                    <p className="mt-1.5 truncate text-[10px] text-accent-600 dark:text-accent-300">
                      评于《{postTitleBySlug.get(comment.postSlug) ?? comment.postSlug}》
                    </p>
                  </Link>
                ))}
              </div>

              {commentNotice ? (
                <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
                  <span>{commentNotice}</span>
                </p>
              ) : null}

              {commentError ? (
                <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-500/15 dark:text-rose-200">
                  {commentError}
                </p>
              ) : null}

              {featured ? (
                <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/8">
                  {!composerOpen ? (
                    <Button
                      type="button"
                      variant="soft"
                      size="sm"
                      className="w-full"
                      onClick={() => setComposerOpen(true)}
                    >
                      <Send className="size-3.5" />
                      快速写一条评论
                    </Button>
                  ) : (
                    <form onSubmit={submitQuickComment} className="space-y-2">
                      <p className="text-[11px] text-slate-400">
                        将发布至《{featured.title}》评论区
                      </p>
                      <input
                        value={commentName}
                        onChange={(event) => setCommentName(event.target.value)}
                        required
                        placeholder="昵称"
                        className="studio-input h-9 rounded-xl px-3 text-xs"
                      />
                      <input
                        value={commentEmail}
                        onChange={(event) => setCommentEmail(event.target.value)}
                        required
                        type="email"
                        placeholder="邮箱（不会公开）"
                        className="studio-input h-9 rounded-xl px-3 text-xs"
                      />
                      <textarea
                        value={commentBody}
                        onChange={(event) => setCommentBody(event.target.value)}
                        required
                        rows={3}
                        placeholder="写下你的想法..."
                        className="studio-input resize-none rounded-xl px-3 py-2 text-xs leading-5"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                          onClick={() => setComposerOpen(false)}
                        >
                          取消
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={createComment.isPending}
                          className="flex-1"
                        >
                          <Send className="size-3.5" />
                          {createComment.isPending ? "发送中..." : "发布"}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              ) : null}
            </section>
          </aside>
        </div>
      </main>

      <FloatingDock />
      <SiteFooter />
    </div>
  );
}
