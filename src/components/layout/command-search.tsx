"use client";

import {
  ArrowRight,
  BookOpen,
  Compass,
  FileText,
  Search,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { blogConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";

type CommandSearchProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type SearchItem = {
  badge: string;
  href: string;
  id: string;
  kind: "page" | "post";
  subtitle: string;
  title: string;
};

export function CommandSearch({ open, onOpenChange }: CommandSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const postsQuery = trpc.blog.feed.useQuery(
    { limit: 60 },
    {
      enabled: open,
      staleTime: 1000 * 60 * 5,
    },
  );

  useEffect(() => {
    function handleGlobalKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      } else if (event.key === "Escape" && open) {
        event.preventDefault();
        onOpenChange(false);
      }
    }

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [onOpenChange, open]);

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 20);

    return () => window.clearTimeout(timer);
  }, [open]);

  const results = useMemo<SearchItem[]>(() => {
    const keyword = query.trim().toLowerCase();
    const pageShortcuts: SearchItem[] = blogConfig.navLinks.map((item) => ({
      badge: "页面",
      href: item.href,
      id: `page:${item.href}`,
      kind: "page",
      subtitle: `前往 ${item.label}`,
      title: item.label,
    }));

    const postItems: SearchItem[] = (postsQuery.data ?? []).map((post) => ({
      badge: post.category,
      href: `/posts/${post.slug}`,
      id: `post:${post.id}`,
      kind: "post",
      subtitle: `${post.excerpt} · ${post.tags.map((t) => `#${t}`).join(" ")}`,
      title: post.title,
    }));

    if (!keyword) {
      return [...postItems.slice(0, 6), ...pageShortcuts];
    }

    const matchedPosts = postItems.filter((item) =>
      `${item.title} ${item.badge} ${item.subtitle}`
        .toLowerCase()
        .includes(keyword),
    );
    const matchedPages = pageShortcuts.filter((item) =>
      `${item.title} ${item.subtitle}`.toLowerCase().includes(keyword),
    );

    return [...matchedPosts.slice(0, 10), ...matchedPages];
  }, [postsQuery.data, query]);

  const safeIndex =
    results.length === 0 ? 0 : Math.min(activeIndex, results.length - 1);

  function navigateTo(href: string) {
    onOpenChange(false);
    setQuery("");
    router.push(href);
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        results.length === 0 ? 0 : (current + 1) % results.length,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        results.length === 0
          ? 0
          : (current - 1 + results.length) % results.length,
      );
    } else if (event.key === "Enter" && results[safeIndex]) {
      event.preventDefault();
      navigateTo(results[safeIndex].href);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="全站快捷搜索"
      onClick={() => onOpenChange(false)}
      className="fixed inset-0 z-[85] flex items-start justify-center bg-slate-950/55 px-4 pt-[12vh] backdrop-blur-md"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="anime-card w-full max-w-xl overflow-hidden shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-slate-200/75 px-4 py-3.5 dark:border-white/10">
          <Search className="size-4 shrink-0 text-accent-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="搜索文章标题、摘要、标签或页面..."
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-slate-400"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="grid size-7 place-items-center rounded-full text-slate-400 hover:bg-surface-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <kbd className="hidden rounded-md border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 dark:border-white/12 sm:inline">
              ESC
            </kbd>
          )}
        </div>

        <div className="max-h-[58vh] overflow-y-auto p-2">
          {postsQuery.isLoading ? (
            <p className="p-6 text-center text-xs text-slate-400">
              正在检索书房目录...
            </p>
          ) : results.length === 0 ? (
            <div className="p-8 text-center">
              <Sparkles className="mx-auto size-7 text-accent-400" />
              <p className="mt-2 text-sm font-semibold">没有找到相关内容</p>
              <p className="mt-1 text-xs text-slate-400">
                试试其他关键词，或去文章归档页按标签浏览。
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((item, index) => {
                const active = index === safeIndex;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => navigateTo(item.href)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                      active
                        ? "bg-accent-50 text-accent-700 dark:bg-accent-500/18 dark:text-accent-200"
                        : "text-slate-700 hover:bg-surface-muted dark:text-slate-200 dark:hover:bg-white/[0.05]",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-lg",
                        active
                          ? "bg-accent-500 text-white"
                          : "bg-surface-muted text-slate-400 dark:bg-white/[0.06]",
                      )}
                    >
                      {item.kind === "post" ? (
                        <FileText className="size-4" />
                      ) : (
                        <Compass className="size-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">
                          {item.title}
                        </span>
                        <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-white/10 dark:text-slate-300">
                          {item.badge}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-400">
                        {item.subtitle}
                      </span>
                    </span>
                    <ArrowRight
                      className={cn(
                        "size-4 shrink-0 transition",
                        active ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-surface-muted/50 px-4 py-2 text-[11px] text-slate-400 dark:border-white/8 dark:bg-white/[0.02]">
          <span className="inline-flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <BookOpen className="size-3" /> ↑↓ 选择
            </span>
            <span className="inline-flex items-center gap-1">
              <Tag className="size-3" /> Enter 打开
            </span>
          </span>
          <span className="font-mono">Ctrl / ⌘ + K</span>
        </div>
      </div>
    </div>
  );
}
