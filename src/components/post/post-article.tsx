"use client";

/* eslint-disable @next/next/no-img-element */

import {
  ArrowLeft,
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
import Link from "next/link";
import { useState } from "react";

import { DynamicBackdrop } from "@/components/dynamic-backdrop";
import { PostComments } from "@/components/post/post-comments";
import { MarkdownPreview } from "@/components/studio/markdown-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PublicComment, PublicPost } from "@/lib/blog-data";
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
  const headings = extractMarkdownHeadings(post.content);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const relatedPosts = [previousPost, nextPost].filter(
    (item): item is PublicPost => Boolean(item),
  );
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    damping: 28,
    stiffness: 160,
  });

  return (
    <main className="home-shell relative min-h-screen overflow-hidden px-4 pb-16 pt-5 text-slate-950 dark:text-white sm:px-6 lg:px-8">
      <DynamicBackdrop ambientMode="night" />
      <motion.div
        className="fixed left-0 right-0 top-0 z-[80] h-1 origin-left bg-gradient-to-r from-coral-400 via-teal-300 to-indigo-300"
        style={{ scaleX }}
      />

      <nav className="relative z-30 mx-auto flex w-full max-w-6xl items-center justify-between rounded-full border border-white/45 bg-white/40 px-3 py-2 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/34">
        <Button asChild size="sm" variant="glass">
          <Link href="/#posts">
            <ArrowLeft className="size-4" />
            返回文章
          </Link>
        </Button>
        <div className="flex min-w-0 items-center gap-2">
          <Badge>{post.category}</Badge>
          {post.featured ? <Badge>精选</Badge> : null}
        </div>
      </nav>

      <article className="relative z-10 mx-auto mt-7 w-full max-w-6xl">
        <motion.header
          animate={{ opacity: 1, y: 0 }}
          className="group relative isolate min-h-[360px] overflow-hidden rounded-[1.35rem] border border-white/35 shadow-2xl shadow-slate-950/20 dark:border-white/10 sm:min-h-[520px] sm:rounded-[2rem]"
          initial={false}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <img
            alt={post.title}
            className="absolute inset-0 size-full object-cover opacity-95 transition-transform duration-[1400ms] ease-out group-hover:scale-[1.045]"
            src={post.coverImage}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/8" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 lg:p-10">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl"
              initial={false}
              transition={{ delay: 0.12, duration: 0.55 }}
            >
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/25 bg-white/18 px-2.5 py-1 text-[11px] font-black text-white shadow-lg backdrop-blur-md sm:px-3 sm:text-xs">
                  {post.mood}
                </span>
                <span className="rounded-full border border-white/25 bg-white/18 px-2.5 py-1 text-[11px] font-black text-white shadow-lg backdrop-blur-md sm:px-3 sm:text-xs">
                  {post.readingMinutes} 分钟阅读
                </span>
              </div>

              <h1 className="mt-4 text-balance text-3xl font-black leading-[1.08] text-white drop-shadow-2xl sm:mt-5 sm:text-5xl lg:text-6xl">
                {post.title}
              </h1>
              <p className="mt-4 max-w-3xl text-pretty text-sm leading-7 text-white/82 sm:mt-5 sm:text-lg sm:leading-8">
                {post.excerpt}
              </p>

              <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-black text-white/82 sm:mt-7 sm:gap-3 sm:text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/16 px-3 py-2 backdrop-blur-md">
                  <CalendarDays className="size-4" />
                  {formatLongDate(post.publishedAt)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/16 px-3 py-2 backdrop-blur-md">
                  <Eye className="size-4" />
                  {post.viewCount}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/16 px-3 py-2 backdrop-blur-md">
                  <Heart className="size-4" />
                  {post.likeCount}
                </span>
              </div>
            </motion.div>
          </div>
        </motion.header>

        <div className="relative z-20 mt-[-34px] grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          {headings.length > 0 ? (
            <section className="rounded-[1.25rem] border border-white/45 bg-white/64 p-3 shadow-xl shadow-slate-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/66 lg:hidden">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-2xl px-2 py-1 text-left"
                aria-expanded={mobileTocOpen}
                onClick={() => setMobileTocOpen((current) => !current)}
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <ListTree className="size-4 shrink-0 text-coral-500" />
                  <span className="text-sm font-black">文章目录</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-2 text-xs font-black text-slate-500 dark:text-slate-300">
                  {headings.length} 节
                  <ChevronDown
                    className={cn(
                      "size-4 transition-transform",
                      mobileTocOpen ? "rotate-180" : "",
                    )}
                  />
                </span>
              </button>

              {mobileTocOpen ? (
                <nav className="mt-3 space-y-1 border-t border-slate-200/80 pt-3 dark:border-white/10">
                  {headings.map((heading) => (
                    <a
                      className={`block rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-white/65 hover:text-coral-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-coral-100 ${
                        heading.level === 2 ? "pl-5" : ""
                      } ${heading.level === 3 ? "pl-7 text-xs" : ""}`}
                      href={`#${heading.id}`}
                      key={heading.id}
                      onClick={() => setMobileTocOpen(false)}
                    >
                      {heading.text}
                    </a>
                  ))}
                </nav>
              ) : null}
            </section>
          ) : null}

          <motion.section
            animate={{ opacity: 1, y: 0 }}
            className="article-paper overflow-hidden rounded-[2rem] border border-white/45 bg-white/68 shadow-2xl shadow-slate-950/12 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/62"
            initial={false}
            transition={{ delay: 0.18, duration: 0.55 }}
          >
            <div className="border-b border-slate-200/65 px-5 py-4 dark:border-white/10 sm:px-8">
              <div className="flex flex-wrap items-center gap-2 text-xs font-black text-slate-500 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/5 px-3 py-1.5 dark:bg-white/10">
                  <Clock3 className="size-3.5" />
                  发布日期：{formatShortDate(post.publishedAt)}
                </span>
                {post.updatedAt ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/5 px-3 py-1.5 dark:bg-white/10">
                    <CalendarDays className="size-3.5" />
                    更新：{formatShortDate(post.updatedAt)}
                  </span>
                ) : null}
                {post.tags.map((tag) => (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-coral-100/70 px-3 py-1.5 text-coral-700 dark:bg-coral-400/12 dark:text-coral-100"
                    key={tag}
                  >
                    <Tag className="size-3.5" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div
              className="article-prose px-5 py-7 text-slate-800 dark:text-slate-100 sm:px-8 lg:px-12 lg:py-10"
              id="article-content"
            >
              <MarkdownPreview value={post.content} />
            </div>
          </motion.section>

          <aside className="space-y-5 lg:sticky lg:top-24">
            <motion.section
              animate={{ opacity: 1, x: 0 }}
              className="rounded-[1.6rem] border border-white/45 bg-white/58 p-5 shadow-xl shadow-slate-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/58"
              initial={false}
              transition={{ delay: 0.24, duration: 0.5 }}
            >
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                  <Sparkles className="size-5" />
                </span>
                <div>
                  <p className="text-[10px] font-black text-slate-400">
                    阅读导航
                  </p>
                  <h2 className="text-lg font-black">阅读信息</h2>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-white/55 p-3 dark:bg-white/10">
                  <p className="text-lg font-black">{post.readingMinutes}</p>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    分钟
                  </p>
                </div>
                <div className="rounded-2xl bg-white/55 p-3 dark:bg-white/10">
                  <p className="text-lg font-black">{post.viewCount}</p>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    浏览
                  </p>
                </div>
                <div className="rounded-2xl bg-white/55 p-3 dark:bg-white/10">
                  <p className="text-lg font-black">{post.likeCount}</p>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    喜欢
                  </p>
                </div>
              </div>
            </motion.section>

            {relatedPosts.length > 0 ? (
              <motion.section
                animate={{ opacity: 1, x: 0 }}
                className="rounded-[1.6rem] border border-white/45 bg-white/58 p-5 shadow-xl shadow-slate-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/58"
                initial={false}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <h2 className="border-l-4 border-coral-400 pl-3 text-sm font-black">
                  相邻文章
                </h2>
                <div className="mt-4 space-y-3">
                  {relatedPosts.map((item) => (
                    <Link
                      className="group block rounded-2xl bg-white/45 p-3 transition duration-300 hover:-translate-y-0.5 hover:bg-white/70 dark:bg-white/10 dark:hover:bg-white/15"
                      href={`/posts/${item.slug}`}
                      key={item.id}
                    >
                      <h3 className="line-clamp-2 text-sm font-black transition-colors group-hover:text-coral-700 dark:group-hover:text-coral-100">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-[10px] font-bold text-slate-400">
                        {formatShortDate(item.publishedAt)}
                      </p>
                    </Link>
                  ))}
                </div>
              </motion.section>
            ) : null}

            {headings.length > 0 ? (
              <motion.section
                animate={{ opacity: 1, x: 0 }}
                className="hidden max-h-[68vh] overflow-y-auto rounded-[1.6rem] border border-white/45 bg-white/58 p-5 shadow-xl shadow-slate-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/58 lg:block"
                initial={false}
                transition={{ delay: 0.36, duration: 0.5 }}
              >
                <div className="mb-4 flex items-center gap-2">
                  <ListTree className="size-4 text-coral-500" />
                  <h2 className="text-sm font-black">
                    文章目录
                  </h2>
                </div>
                <nav className="relative space-y-1 border-l border-slate-200/80 pl-3 dark:border-white/10">
                  {headings.map((heading) => (
                    <a
                      className={`block rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-500 transition duration-300 hover:translate-x-1 hover:bg-white/55 hover:text-coral-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-coral-100 ${
                        heading.level === 2 ? "ml-2" : ""
                      } ${heading.level === 3 ? "ml-4 text-xs" : ""}`}
                      href={`#${heading.id}`}
                      key={heading.id}
                    >
                      {heading.text}
                    </a>
                  ))}
                </nav>
              </motion.section>
            ) : null}
          </aside>
        </div>

        <PostComments initialComments={comments} postSlug={post.slug} />
      </article>
    </main>
  );
}
