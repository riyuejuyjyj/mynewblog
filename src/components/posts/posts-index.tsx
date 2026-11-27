"use client";

import {
  ArrowRight,
  CalendarDays,
  Clock3,
  FolderOpen,
  Heart,
  LayoutGrid,
  List,
  Rss,
  Search,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { WritingHeatmap } from "@/components/home/writing-heatmap";
import { FloatingDock } from "@/components/layout/floating-dock";
import { HeroWaves } from "@/components/layout/hero-waves";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { blogConfig } from "@/config/site";
import type { PublicPost } from "@/lib/blog-data";
import { getCategoryPath, getTagPath } from "@/lib/blog-taxonomy";
import { cn } from "@/lib/utils";

type PostsIndexProps = {
  description?: string;
  eyebrow?: string;
  initialCategory?: string;
  initialQuery?: string;
  initialTag?: string;
  posts: PublicPost[];
  syncUrl?: boolean;
  title?: string;
};

const allFilter = "全部";

function formatArchiveDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatMonthDay(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function includesKeyword(post: PublicPost, keyword: string) {
  if (!keyword) return true;

  const text = [
    post.category,
    post.excerpt,
    post.mood,
    post.title,
    ...post.tags,
  ]
    .join(" ")
    .toLowerCase();

  return text.includes(keyword);
}

function readBrowserFilters() {
  const params = new URLSearchParams(window.location.search);

  return {
    category: params.get("category") || allFilter,
    query: params.get("q") ?? "",
    tag: params.get("tag"),
  };
}

function writeBrowserFilters({
  category,
  query,
  tag,
}: {
  category: string;
  query: string;
  tag: string | null;
}) {
  const params = new URLSearchParams(window.location.search);
  const trimmedQuery = query.trim();

  if (category === allFilter) {
    params.delete("category");
  } else {
    params.set("category", category);
  }

  if (tag) {
    params.set("tag", tag);
  } else {
    params.delete("tag");
  }

  if (trimmedQuery) {
    params.set("q", trimmedQuery);
  } else {
    params.delete("q");
  }

  const nextSearch = params.toString();
  const nextPath = nextSearch
    ? `${window.location.pathname}?${nextSearch}`
    : window.location.pathname;
  const currentPath = `${window.location.pathname}${window.location.search}`;

  if (nextPath !== currentPath) {
    window.history.replaceState(null, "", nextPath);
  }
}

export function PostsIndex({
  description = "把研究笔记、工程思考、读书札记与日常碎片，按时间和主题整整齐齐收进书架。",
  eyebrow = "文章归档",
  initialCategory,
  initialQuery,
  initialTag,
  posts,
  syncUrl = false,
  title = "晴空书房 · 全部文章",
}: PostsIndexProps) {
  const [activeCategory, setActiveCategory] = useState(
    initialCategory ?? allFilter,
  );
  const [activeTag, setActiveTag] = useState<string | null>(initialTag ?? null);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [viewMode, setViewMode] = useState<"cards" | "timeline">("cards");

  const categories = useMemo(
    () => [allFilter, ...Array.from(new Set(posts.map((post) => post.category)))],
    [posts],
  );
  const popularTags = useMemo(() => {
    const tagCounts = posts.reduce<Map<string, number>>((counts, post) => {
      post.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
      return counts;
    }, new Map());

    return Array.from(tagCounts.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 14)
      .map(([tag]) => tag);
  }, [posts]);

  const visiblePosts = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return posts.filter((post) => {
      const categoryMatch =
        activeCategory === allFilter || post.category === activeCategory;
      const tagMatch = !activeTag || post.tags.includes(activeTag);

      return categoryMatch && tagMatch && includesKeyword(post, keyword);
    });
  }, [activeCategory, activeTag, posts, query]);

  const postsByYear = useMemo(() => {
    const grouped = new Map<string, PublicPost[]>();

    for (const post of visiblePosts) {
      const year = String(new Date(post.publishedAt).getFullYear());
      const bucket = grouped.get(year) ?? [];
      bucket.push(post);
      grouped.set(year, bucket);
    }

    return Array.from(grouped.entries()).sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [visiblePosts]);

  const featured = posts.find((post) => post.featured) ?? posts[0] ?? null;
  const totalViews = posts.reduce((total, post) => total + post.viewCount, 0);
  const totalLikes = posts.reduce((total, post) => total + post.likeCount, 0);
  const hasFilters =
    activeCategory !== allFilter || Boolean(activeTag) || query.trim().length > 0;

  function clearFilters() {
    setActiveCategory(allFilter);
    setActiveTag(null);
    setQuery("");
  }

  useEffect(() => {
    if (!syncUrl) return;

    function syncFromHistory() {
      const filters = readBrowserFilters();
      setActiveCategory(filters.category);
      setActiveTag(filters.tag);
      setQuery(filters.query);
    }

    window.addEventListener("popstate", syncFromHistory);

    return () => window.removeEventListener("popstate", syncFromHistory);
  }, [syncUrl]);

  useEffect(() => {
    if (!syncUrl) return;

    writeBrowserFilters({
      category: activeCategory,
      query,
      tag: activeTag,
    });
  }, [activeCategory, activeTag, query, syncUrl]);

  return (
    <div className="home-shell anime-page-bg min-h-screen bg-background text-foreground">
      <SiteHeader overlayHero />

      {/* Compact Scenic Anime Banner */}
      <header className="relative isolate flex min-h-[290px] w-full flex-col items-center justify-center overflow-hidden pt-24 pb-20 sm:min-h-[330px] sm:pb-24">
        <Image
          src={blogConfig.images.heroDay}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center transition-opacity duration-700 dark:opacity-0"
        />
        <Image
          src={blogConfig.images.heroNight}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-0 transition-opacity duration-700 dark:opacity-100"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/42 via-slate-950/28 to-slate-950/58 dark:from-[#080b16]/52 dark:via-[#080b16]/35 dark:to-[#0d111e]/78" />

        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center text-white">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/16 px-3.5 py-1 text-xs font-medium text-white/95 backdrop-blur-md">
            <Sparkles className="size-3.5 text-pink-200 dark:text-sky-200" />
            {eyebrow}
          </p>
          <h1 className="mt-4 font-serif text-3xl font-bold leading-tight drop-shadow sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/88 sm:text-base">
            {description}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 font-mono text-xs text-white/85">
            <span className="rounded-full bg-white/14 px-3 py-1 backdrop-blur-md">
              {posts.length} 篇文章
            </span>
            <span className="rounded-full bg-white/14 px-3 py-1 backdrop-blur-md">
              {totalViews} 阅读
            </span>
            <span className="rounded-full bg-white/14 px-3 py-1 backdrop-blur-md">
              {totalLikes} 喜欢
            </span>
          </div>
        </div>

        <HeroWaves />
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6">
        {/* Search + Filter + View Toggle Card */}
        <section className="anime-card p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex h-10 flex-1 items-center gap-2.5 rounded-full border border-slate-200/80 bg-surface-muted/65 px-4 transition focus-within:border-accent-400 focus-within:bg-surface dark:border-white/10 dark:bg-white/[0.05]">
              <Search className="size-4 shrink-0 text-accent-500" />
              <span className="sr-only">搜索文章</span>
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索标题、摘要、分类或标签..."
                value={query}
              />
              {query ? (
                <button
                  aria-label="清空搜索"
                  className="grid size-6 place-items-center rounded-full text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                  onClick={() => setQuery("")}
                  type="button"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </label>

            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <div className="inline-flex rounded-full border border-slate-200/80 bg-surface-muted/70 p-1 dark:border-white/10 dark:bg-white/[0.05]">
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    viewMode === "cards"
                      ? "bg-accent-500 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
                  )}
                >
                  <LayoutGrid className="size-3.5" />
                  卡片
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("timeline")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    viewMode === "timeline"
                      ? "bg-accent-500 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
                  )}
                >
                  <List className="size-3.5" />
                  时间轴
                </button>
              </div>

              {hasFilters ? (
                <Button size="sm" type="button" variant="ghost" onClick={clearFilters}>
                  <X className="size-3.5" />
                  重置
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {categories.map((category) => (
              <button
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                  activeCategory === category
                    ? "bg-accent-500 text-white shadow-sm"
                    : "bg-surface-muted text-slate-600 hover:bg-accent-50 hover:text-accent-700 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-accent-500/18 dark:hover:text-accent-200",
                )}
                key={category}
                onClick={() => setActiveCategory(category)}
                type="button"
              >
                {category}
              </button>
            ))}
          </div>

          {popularTags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3 dark:border-white/8">
              {popularTags.map((tag) => (
                <button
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition",
                    activeTag === tag
                      ? "bg-accent-500 text-white shadow-sm"
                      : "border border-slate-200/80 bg-surface text-slate-600 hover:border-accent-300 hover:text-accent-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:border-accent-400/40 dark:hover:text-accent-200",
                  )}
                  key={tag}
                  onClick={() =>
                    setActiveTag((current) => (current === tag ? null : tag))
                  }
                  type="button"
                >
                  <Tag className="size-3" />
                  {tag}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        {/* Main Archive Content + Sidebar */}
        <section className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <div className="min-w-0">
            {visiblePosts.length === 0 ? (
              <div className="anime-card p-12 text-center">
                <p className="font-serif text-lg font-bold">没有匹配的文章</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  换个关键词或清空当前筛选看看吧。
                </p>
                <Button
                  className="mt-5"
                  type="button"
                  variant="soft"
                  onClick={clearFilters}
                >
                  清空筛选
                </Button>
              </div>
            ) : viewMode === "timeline" ? (
              <div className="anime-card p-5 sm:p-7">
                <div className="space-y-8">
                  {postsByYear.map(([year, yearPosts]) => (
                    <div key={year}>
                      <div className="mb-4 flex items-center gap-3">
                        <span className="font-mono text-2xl font-bold text-accent-600 dark:text-accent-300">
                          {year}
                        </span>
                        <span className="h-px flex-1 bg-slate-200/80 dark:bg-white/10" />
                        <span className="font-mono text-xs text-slate-400">
                          {yearPosts.length} 篇
                        </span>
                      </div>

                      <ol className="relative space-y-3 border-l-2 border-accent-200/80 pl-5 dark:border-accent-500/25">
                        {yearPosts.map((post) => (
                          <li key={post.id} className="relative">
                            <span className="absolute -left-[26px] top-3.5 size-2.5 rounded-full bg-accent-500 ring-4 ring-surface" />
                            <Link
                              href={`/posts/${post.slug}`}
                              className="group flex flex-col gap-1.5 rounded-2xl px-3.5 py-2.5 transition hover:bg-surface-muted/85 dark:hover:bg-white/[0.05] sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="shrink-0 font-mono text-xs text-slate-400">
                                  {formatMonthDay(post.publishedAt)}
                                </span>
                                <span className="truncate font-serif text-base font-bold text-slate-900 transition group-hover:text-accent-600 dark:text-white dark:group-hover:text-accent-300">
                                  {post.title}
                                </span>
                              </div>
                              <div className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
                                <Badge>{post.category}</Badge>
                                <span className="font-mono">
                                  {post.readingMinutes}m
                                </span>
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {visiblePosts.map((post) => (
                  <article
                    className="anime-card group overflow-hidden"
                    key={post.id}
                  >
                    <div className="grid md:grid-cols-[240px_minmax(0,1fr)]">
                      <Link
                        aria-label={`阅读：${post.title}`}
                        className="shoka-cover-left relative aspect-[16/10] overflow-hidden bg-surface-muted md:aspect-auto md:min-h-[200px]"
                        href={`/posts/${post.slug}`}
                      >
                        <Image
                          alt={post.title}
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                          fill
                          sizes="(min-width: 1024px) 240px, 100vw"
                          src={post.coverImage}
                        />
                        {post.featured ? (
                          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-accent-500 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow">
                            <Sparkles className="size-3" />
                            精选
                          </span>
                        ) : null}
                      </Link>
                      <div className="flex min-w-0 flex-col justify-between p-5">
                        <div>
                          <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs text-slate-400">
                            <Link href={getCategoryPath(post.category)}>
                              <Badge>{post.category}</Badge>
                            </Link>
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="size-3.5 text-accent-500" />
                              {formatArchiveDate(post.publishedAt)}
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
                            <h2 className="mt-3 font-serif text-xl font-bold leading-snug text-slate-900 transition group-hover:text-accent-600 dark:text-white dark:group-hover:text-accent-300">
                              {post.title}
                            </h2>
                          </Link>
                          <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                            {post.excerpt}
                          </p>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-2">
                          <div className="flex flex-wrap gap-1.5">
                            {post.tags.slice(0, 4).map((tag) => (
                              <Link
                                className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[11px] font-medium text-slate-600 transition hover:bg-accent-50 hover:text-accent-700 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-accent-500/18 dark:hover:text-accent-200"
                                href={getTagPath(tag)}
                                key={tag}
                              >
                                #{tag}
                              </Link>
                            ))}
                          </div>
                          <Link
                            className="inline-flex items-center gap-1 text-xs font-semibold text-accent-600 transition hover:translate-x-0.5 dark:text-accent-300"
                            href={`/posts/${post.slug}`}
                          >
                            阅读全文
                            <ArrowRight className="size-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-20">
            <WritingHeatmap
              dates={posts.map((post) => post.publishedAt)}
              weeks={15}
            />

            {featured ? (
              <section className="anime-card overflow-hidden">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    alt={featured.title}
                    className="object-cover"
                    fill
                    sizes="300px"
                    src={featured.coverImage}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/78 via-slate-950/20 to-transparent" />
                  <div className="absolute bottom-0 p-4 text-white">
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-500 px-2.5 py-0.5 text-[11px] font-semibold">
                      <Sparkles className="size-3" />
                      精选推荐
                    </span>
                    <h2 className="mt-2 line-clamp-2 font-serif text-lg font-bold leading-snug">
                      {featured.title}
                    </h2>
                  </div>
                </div>
                <div className="p-4">
                  <p className="line-clamp-3 text-xs leading-6 text-slate-600 dark:text-slate-300">
                    {featured.excerpt}
                  </p>
                  <Button asChild className="mt-4 w-full" size="sm">
                    <Link href={`/posts/${featured.slug}`}>
                      阅读精选
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </section>
            ) : null}

            <section className="anime-card p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <FolderOpen className="size-4 text-accent-500" />
                分类索引
              </h2>
              <div className="mt-3 space-y-1.5">
                {categories.slice(1).map((category) => {
                  const count = posts.filter((post) => post.category === category).length;

                  return (
                    <Link
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-accent-50 hover:text-accent-700 dark:text-slate-300 dark:hover:bg-accent-500/15 dark:hover:text-accent-200"
                      href={getCategoryPath(category)}
                      key={category}
                    >
                      <span>{category}</span>
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 font-mono text-[11px] text-slate-400 dark:bg-white/8">
                        {count}
                      </span>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4 dark:border-white/8">
                <Button asChild size="sm" variant="glass" className="w-full">
                  <Link href="/feed.xml">
                    <Rss className="size-3.5 text-accent-500" />
                    订阅 RSS Feed
                  </Link>
                </Button>
              </div>
            </section>
          </aside>
        </section>
      </main>

      <FloatingDock />
      <SiteFooter />
    </div>
  );
}
