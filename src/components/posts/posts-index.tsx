"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  Heart,
  Rss,
  Search,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { DynamicBackdrop } from "@/components/dynamic-backdrop";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PublicPost } from "@/lib/blog-data";
import { getCategoryPath, getTagPath } from "@/lib/blog-taxonomy";

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
  description = "研究、工程、阅读和日常碎片按时间收拢，也可以直接按分类、标签和关键词进入。",
  eyebrow = "文章归档",
  initialCategory,
  initialQuery,
  initialTag,
  posts,
  syncUrl = false,
  title = "把所有公开笔记放在一张可检索的书桌上。",
}: PostsIndexProps) {
  const [activeCategory, setActiveCategory] = useState(
    initialCategory ?? allFilter,
  );
  const [activeTag, setActiveTag] = useState<string | null>(initialTag ?? null);
  const [query, setQuery] = useState(initialQuery ?? "");

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
      .slice(0, 10)
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
    <main className="home-shell relative min-h-screen overflow-hidden px-4 pb-16 pt-5 text-slate-950 dark:text-white sm:px-6 lg:px-8">
      <DynamicBackdrop ambientMode="day" />

      <nav className="relative z-30 mx-auto flex w-full max-w-7xl items-center justify-between rounded-full border border-white/45 bg-white/42 px-3 py-2 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/34">
        <Button asChild size="sm" variant="glass">
          <Link href="/">
            <ArrowLeft className="size-4" />
            返回首页
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="glass">
            <Link href="/feed.xml">
              <Rss className="size-4" />
              RSS
            </Link>
          </Button>
          <Badge>{visiblePosts.length} 篇文章</Badge>
        </div>
      </nav>

      <header className="relative z-10 mx-auto mt-10 w-full max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/45 bg-white/42 px-4 py-2 text-xs font-black text-coral-700 shadow-lg shadow-slate-900/10 backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-coral-100">
              <Sparkles className="size-4" />
              {eyebrow}
            </p>
            <h1 className="mt-5 max-w-4xl text-balance text-4xl font-black leading-[1.06] sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="mt-5 max-w-3xl text-pretty text-base leading-8 text-slate-700 dark:text-slate-200 sm:text-lg">
              {description}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              ["文章", posts.length],
              ["浏览", totalViews],
              ["喜欢", totalLikes],
            ].map(([label, value]) => (
              <div
                className="rounded-3xl border border-white/45 bg-white/46 p-4 text-center shadow-lg shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-white/10"
                key={label}
              >
                <p className="text-2xl font-black">{value}</p>
                <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-300">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto mt-8 w-full max-w-7xl rounded-[2rem] border border-white/45 bg-white/46 p-4 shadow-2xl shadow-slate-950/12 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/48 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <label className="flex min-h-12 items-center gap-3 rounded-full border border-white/45 bg-white/64 px-4 shadow-inner shadow-white/30 dark:border-white/10 dark:bg-white/10">
            <Search className="size-4 text-coral-600 dark:text-coral-200" />
            <span className="sr-only">搜索文章</span>
            <input
              className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索标题、摘要、分类或标签"
              value={query}
            />
            {query ? (
              <button
                aria-label="清空搜索"
                className="grid size-7 place-items-center rounded-full bg-slate-950/5 text-slate-500 transition hover:bg-slate-950/10 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15"
                onClick={() => setQuery("")}
                type="button"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </label>

          {hasFilters ? (
            <Button size="sm" type="button" variant="ghost" onClick={clearFilters}>
              <X className="size-4" />
              重置
            </Button>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              className={`rounded-full px-4 py-2 text-xs font-black transition ${
                activeCategory === category
                  ? "bg-slate-950 text-white shadow-lg shadow-slate-950/15 dark:bg-white dark:text-slate-950"
                  : "bg-white/54 text-slate-600 hover:bg-white/80 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
              }`}
              key={category}
              onClick={() => setActiveCategory(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>

        {popularTags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {popularTags.map((tag) => (
              <button
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  activeTag === tag
                    ? "bg-coral-500 text-white shadow-lg shadow-coral-500/20"
                    : "bg-coral-100/70 text-coral-800 hover:bg-coral-100 dark:bg-coral-400/12 dark:text-coral-100 dark:hover:bg-coral-400/20"
                }`}
                key={tag}
                onClick={() =>
                  setActiveTag((current) => (current === tag ? null : tag))
                }
                type="button"
              >
                <Tag className="size-3.5" />
                {tag}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="relative z-10 mx-auto mt-6 grid w-full max-w-7xl gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-5">
          {visiblePosts.map((post) => (
            <article
              className="group overflow-hidden rounded-[1.75rem] border border-white/45 bg-white/52 shadow-xl shadow-slate-950/10 backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:bg-white/70 dark:border-white/10 dark:bg-slate-900/52 dark:hover:bg-slate-900/72"
              key={post.id}
            >
              <div className="grid gap-0 md:grid-cols-[280px_minmax(0,1fr)]">
                <Link
                  aria-label={`阅读：${post.title}`}
                  className="relative aspect-[16/10] overflow-hidden md:aspect-auto md:min-h-56"
                  href={`/posts/${post.slug}`}
                >
                  <Image
                    alt={post.title}
                    className="object-cover transition duration-700 ease-out group-hover:scale-105"
                    fill
                    sizes="(min-width: 1024px) 280px, 100vw"
                    src={post.coverImage}
                  />
                </Link>
                <div className="flex min-w-0 flex-col justify-between p-5 sm:p-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-300">
                      <Link href={getCategoryPath(post.category)}>
                        <Badge>{post.category}</Badge>
                      </Link>
                      {post.featured ? <Badge>精选</Badge> : null}
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3.5" />
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
                      <h2 className="mt-4 text-2xl font-black leading-tight tracking-[0] transition group-hover:text-coral-700 dark:group-hover:text-coral-100 sm:text-3xl">
                        {post.title}
                      </h2>
                    </Link>
                    <p className="mt-3 line-clamp-2 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
                      {post.excerpt}
                    </p>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      {post.tags.slice(0, 4).map((tag) => (
                        <Link
                          className="rounded-full bg-slate-950/5 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300"
                          href={getTagPath(tag)}
                          key={tag}
                        >
                          {tag}
                        </Link>
                      ))}
                    </div>
                    <Link
                      className="inline-flex items-center gap-1 text-sm font-black text-coral-700 transition hover:translate-x-1 dark:text-coral-100"
                      href={`/posts/${post.slug}`}
                    >
                      阅读
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}

          {visiblePosts.length === 0 ? (
            <div className="rounded-[1.75rem] border border-white/45 bg-white/52 p-10 text-center shadow-xl shadow-slate-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/52">
              <p className="text-lg font-black">没有匹配的文章</p>
              <Button className="mt-5" type="button" variant="soft" onClick={clearFilters}>
                清空筛选
              </Button>
            </div>
          ) : null}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          {featured ? (
            <section className="overflow-hidden rounded-[1.75rem] border border-white/45 bg-white/52 shadow-xl shadow-slate-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/52">
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  alt={featured.title}
                  className="object-cover"
                  fill
                  sizes="(min-width: 1024px) 340px, 100vw"
                  src={featured.coverImage}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/78 via-slate-950/24 to-transparent" />
                <div className="absolute bottom-0 p-5 text-white">
                  <Badge className="border-white/25 bg-white/20 text-white">
                    精选
                  </Badge>
                  <h2 className="mt-3 line-clamp-2 text-2xl font-black leading-tight">
                    {featured.title}
                  </h2>
                </div>
              </div>
              <div className="p-5">
                <p className="line-clamp-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {featured.excerpt}
                </p>
                <Button asChild className="mt-5 w-full" variant="default">
                  <Link href={`/posts/${featured.slug}`}>
                    阅读精选
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </section>
          ) : null}

          <section className="rounded-[1.75rem] border border-white/45 bg-white/52 p-5 shadow-xl shadow-slate-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/52">
            <h2 className="text-sm font-black text-slate-500 dark:text-slate-300">
              分类索引
            </h2>
            <div className="mt-4 space-y-2">
              {categories.slice(1).map((category) => {
                const count = posts.filter((post) => post.category === category).length;

                return (
                  <Link
                    className="flex w-full items-center justify-between rounded-2xl bg-white/46 px-4 py-3 text-left text-sm font-bold transition hover:bg-white/72 dark:bg-white/10 dark:hover:bg-white/15"
                    href={getCategoryPath(category)}
                    key={category}
                  >
                    <span>{category}</span>
                    <span className="text-slate-400">{count}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
