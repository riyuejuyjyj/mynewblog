"use client";

/* eslint-disable @next/next/no-img-element */

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Clock3,
  Eye,
  Heart,
  ListTree,
  Sparkles,
  Tag,
} from "lucide-react";
import { motion, useScroll, useSpring } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { HeroWaves } from "@/components/layout/hero-waves";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { PostComments } from "@/components/post/post-comments";
import { MarkdownPreview } from "@/components/studio/markdown-preview";
import { blogConfig } from "@/config/site";
import type { PublicComment, PublicPost } from "@/lib/blog-data";
import { getCategoryPath, getTagPath } from "@/lib/blog-taxonomy";
import { extractMarkdownHeadings } from "@/lib/markdown";
import { cn } from "@/lib/utils";

type PostArticleProps = {
  comments: PublicComment[];
  nextPost: PublicPost | null;
  post: PublicPost;
  previousPost: PublicPost | null;
};

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function PostArticle({
  comments,
  nextPost,
  post,
  previousPost,
}: PostArticleProps) {
  const headings = useMemo(
    () => extractMarkdownHeadings(post.content),
    [post.content],
  );
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const [activeHeadingId, setActiveHeadingId] = useState(
    headings[0]?.id ?? "",
  );
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    damping: 30,
    stiffness: 180,
  });

  useEffect(() => {
    if (headings.length === 0) return;

    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]?.target.id) {
          setActiveHeadingId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-90px 0px -65% 0px",
        threshold: 0.1,
      },
    );

    for (const element of elements) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [headings]);

  return (
    <div className="home-shell anime-page-bg min-h-screen bg-background text-foreground">
      <SiteHeader overlayHero />

      {/* Top reading progress line */}
      <motion.div
        className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-gradient-to-r from-accent-500 via-sky-400 to-violet-400"
        style={{ scaleX }}
      />

      {/* Full-bleed Article Cover Hero */}
      <header className="relative isolate flex min-h-[380px] w-full flex-col justify-end overflow-hidden pt-24 pb-20 sm:min-h-[450px] sm:pb-24">
        <img
          alt={post.title}
          className="absolute inset-0 size-full object-cover object-center"
          src={post.coverImage}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/48 via-slate-950/38 to-slate-950/82" />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 text-white sm:px-6">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={getCategoryPath(post.category)}
                className="inline-flex items-center rounded-full bg-accent-500 px-3 py-1 text-xs font-semibold text-white shadow transition hover:bg-accent-600"
              >
                {post.category}
              </Link>
              {post.featured ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/16 px-3 py-1 text-xs font-medium backdrop-blur-md">
                  <Sparkles className="size-3 text-pink-200" />
                  精选
                </span>
              ) : null}
              <span className="rounded-full border border-white/25 bg-white/14 px-3 py-1 text-xs font-medium backdrop-blur-md">
                {post.mood}
              </span>
            </div>

            <h1 className="mt-4 text-balance font-serif text-3xl font-bold leading-tight drop-shadow sm:text-4xl lg:text-5xl">
              {post.title}
            </h1>

            <p className="mt-3 max-w-3xl text-pretty text-sm leading-7 text-white/85 sm:text-base sm:leading-8">
              {post.excerpt}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2.5 font-mono text-xs text-white/85">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/14 px-3 py-1.5 backdrop-blur-md">
                <CalendarDays className="size-3.5 text-pink-200" />
                {formatLongDate(post.publishedAt)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/14 px-3 py-1.5 backdrop-blur-md">
                <Clock3 className="size-3.5" />
                {post.readingMinutes} 分钟阅读
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/14 px-3 py-1.5 backdrop-blur-md">
                <Eye className="size-3.5" />
                {post.viewCount}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/14 px-3 py-1.5 backdrop-blur-md">
                <Heart className="size-3.5 text-pink-200" />
                {post.likeCount}
              </span>
            </div>
          </div>
        </div>

        <HeroWaves />
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_272px] lg:items-start">
          {/* Mobile Collapsible TOC */}
          {headings.length > 0 ? (
            <section className="anime-card p-3.5 lg:hidden">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-1 text-left"
                aria-expanded={mobileTocOpen}
                onClick={() => setMobileTocOpen((current) => !current)}
              >
                <span className="inline-flex items-center gap-2 text-sm font-bold">
                  <ListTree className="size-4 text-accent-500" />
                  文章目录
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-400">
                  {headings.length} 节
                  <ChevronDown
                    className={cn(
                      "size-4 transition-transform",
                      mobileTocOpen && "rotate-180",
                    )}
                  />
                </span>
              </button>

              {mobileTocOpen ? (
                <nav className="mt-3 space-y-1 border-t border-slate-100 pt-3 dark:border-white/8">
                  {headings.map((heading) => (
                    <a
                      key={heading.id}
                      href={`#${heading.id}`}
                      onClick={() => setMobileTocOpen(false)}
                      className={cn(
                        "block rounded-xl px-3 py-1.5 text-sm transition",
                        heading.level === 2 && "pl-5",
                        heading.level === 3 && "pl-7 text-xs",
                        activeHeadingId === heading.id
                          ? "bg-accent-50 font-semibold text-accent-700 dark:bg-accent-500/18 dark:text-accent-200"
                          : "text-slate-600 hover:bg-surface-muted dark:text-slate-300",
                      )}
                    >
                      {heading.text}
                    </a>
                  ))}
                </nav>
              ) : null}
            </section>
          ) : null}

          {/* Main Reading Paper */}
          <div className="min-w-0 space-y-6">
            <article className="anime-card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/8 sm:px-8">
                <Link
                  href="/posts"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-accent-600 dark:text-slate-400 dark:hover:text-accent-300"
                >
                  <ArrowLeft className="size-3.5" />
                  返回文章归档
                </Link>

                <div className="flex flex-wrap items-center gap-1.5">
                  {post.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={getTagPath(tag)}
                      className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2.5 py-1 text-xs font-medium text-accent-700 transition hover:bg-accent-100 dark:bg-accent-500/15 dark:text-accent-200 dark:hover:bg-accent-500/25"
                    >
                      <Tag className="size-3" />
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>

              <div
                id="article-content"
                className="article-prose mx-auto max-w-[74ch] px-5 py-7 sm:px-9 sm:py-9"
              >
                <MarkdownPreview interactiveImages value={post.content} />
              </div>

              <div className="border-t border-slate-100 bg-surface-muted/45 px-5 py-4 text-xs text-slate-500 dark:border-white/8 dark:bg-white/[0.02] dark:text-slate-400 sm:px-8">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>发布于 {formatShortDate(post.publishedAt)}</span>
                  {post.updatedAt ? (
                    <span>最后更新于 {formatShortDate(post.updatedAt)}</span>
                  ) : null}
                </div>
              </div>
            </article>

            {/* Previous / Next Navigation Cards */}
            {previousPost || nextPost ? (
              <nav
                aria-label="上下篇导航"
                className="grid gap-4 sm:grid-cols-2"
              >
                {previousPost ? (
                  <Link
                    href={`/posts/${previousPost.slug}`}
                    className="anime-card group flex items-center gap-3.5 p-4"
                  >
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-surface-muted">
                      <img
                        src={previousPost.coverImage}
                        alt=""
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                        <ArrowLeft className="size-3" />
                        上一篇
                      </p>
                      <h3 className="mt-0.5 line-clamp-1 font-serif text-sm font-bold text-slate-900 transition group-hover:text-accent-600 dark:text-white dark:group-hover:text-accent-300">
                        {previousPost.title}
                      </h3>
                    </div>
                  </Link>
                ) : (
                  <div className="hidden sm:block" />
                )}

                {nextPost ? (
                  <Link
                    href={`/posts/${nextPost.slug}`}
                    className="anime-card group flex items-center justify-end gap-3.5 p-4 text-right"
                  >
                    <div className="min-w-0">
                      <p className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                        下一篇
                        <ArrowRight className="size-3" />
                      </p>
                      <h3 className="mt-0.5 line-clamp-1 font-serif text-sm font-bold text-slate-900 transition group-hover:text-accent-600 dark:text-white dark:group-hover:text-accent-300">
                        {nextPost.title}
                      </h3>
                    </div>
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-surface-muted">
                      <img
                        src={nextPost.coverImage}
                        alt=""
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  </Link>
                ) : null}
              </nav>
            ) : null}

            {/* Threaded Comments */}
            <PostComments initialComments={comments} postSlug={post.slug} />
          </div>

          {/* Right Sticky Author & Scroll-Spy TOC Sidebar */}
          <aside className="hidden space-y-5 lg:sticky lg:top-20 lg:block">
            <section className="anime-card p-4">
              <div className="flex items-center gap-3">
                <div className="relative size-11 shrink-0 overflow-hidden rounded-full ring-2 ring-accent-200 dark:ring-accent-400/30">
                  <Image
                    src={blogConfig.images.avatar}
                    alt={blogConfig.author}
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-serif text-sm font-bold text-slate-900 dark:text-white">
                    {blogConfig.author}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">
                    {blogConfig.brandSuffix}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 divide-x divide-slate-100 rounded-xl bg-surface-muted/75 py-2 text-center dark:divide-white/8 dark:bg-white/[0.04]">
                <div>
                  <p className="font-mono text-sm font-bold">
                    {post.readingMinutes}m
                  </p>
                  <p className="text-[10px] text-slate-400">阅读</p>
                </div>
                <div>
                  <p className="font-mono text-sm font-bold">
                    {post.viewCount}
                  </p>
                  <p className="text-[10px] text-slate-400">浏览</p>
                </div>
                <div>
                  <p className="font-mono text-sm font-bold">
                    {post.likeCount}
                  </p>
                  <p className="text-[10px] text-slate-400">喜欢</p>
                </div>
              </div>
            </section>

            {headings.length > 0 ? (
              <section className="anime-card max-h-[68vh] overflow-y-auto p-4">
                <div className="mb-3 flex items-center gap-2">
                  <ListTree className="size-4 text-accent-500" />
                  <h2 className="text-sm font-bold">文章目录</h2>
                </div>
                <nav className="space-y-1 border-l border-slate-200/80 pl-2.5 dark:border-white/10">
                  {headings.map((heading) => {
                    const isActive = activeHeadingId === heading.id;

                    return (
                      <a
                        key={heading.id}
                        href={`#${heading.id}`}
                        className={cn(
                          "block rounded-lg px-2.5 py-1.5 text-xs leading-5 transition",
                          heading.level === 2 && "ml-1.5",
                          heading.level === 3 && "ml-3 text-[11px]",
                          isActive
                            ? "bg-accent-50 font-semibold text-accent-700 dark:bg-accent-500/18 dark:text-accent-200"
                            : "text-slate-500 hover:bg-surface-muted hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white",
                        )}
                      >
                        {heading.text}
                      </a>
                    );
                  })}
                </nav>
              </section>
            ) : null}
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
