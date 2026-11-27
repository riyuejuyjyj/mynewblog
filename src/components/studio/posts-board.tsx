"use client";

/* eslint-disable @next/next/no-img-element */

import { Edit3, FilePlus2, Search, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { formatStudioDate } from "@/components/studio/studio-utils";
import type { StudioPost } from "@/components/studio/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

type PostsBoardProps = {
  isLoading: boolean;
  posts: StudioPost[];
  onEdit: (post: StudioPost) => void;
  onNew: () => void;
  onDelete: (post: StudioPost) => void;
};

export function PostsBoard({
  isLoading,
  posts,
  onEdit,
  onNew,
  onDelete,
}: PostsBoardProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [pendingDeletePost, setPendingDeletePost] = useState<StudioPost | null>(
    null,
  );

  const visiblePosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return posts.filter((post) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "published" && post.published) ||
        (filter === "draft" && !post.published);
      const matchesQuery =
        !normalizedQuery ||
        [post.title, post.slug, post.excerpt, post.category, ...post.tags]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [filter, posts, query]);

  function confirmDeletePost() {
    if (!pendingDeletePost) return;
    onDelete(pendingDeletePost);
    setPendingDeletePost(null);
  }

  return (
    <section className="studio-panel overflow-hidden">
      <div className="flex flex-col gap-3.5 border-b border-slate-200/70 p-4 dark:border-white/8 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
            Archive
          </p>
          <h2 className="mt-0.5 font-serif text-xl font-bold sm:text-2xl">
            文章与草稿
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full border border-slate-200/80 bg-surface-muted/70 px-3 text-xs text-slate-500 dark:border-white/10 dark:bg-white/[0.05] lg:w-56 lg:flex-none">
            <Search className="size-3.5 shrink-0 text-accent-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索标题 / 标签..."
              className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-slate-400"
            />
          </label>

          <div className="inline-flex rounded-full border border-slate-200/80 bg-surface-muted/70 p-0.5 dark:border-white/10 dark:bg-white/[0.05]">
            {(
              [
                ["all", "全部"],
                ["published", "已发布"],
                ["draft", "草稿"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  filter === value
                    ? "bg-accent-500 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <Button type="button" size="sm" onClick={onNew}>
            <FilePlus2 className="size-3.5" />
            新建文章
          </Button>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:p-5">
        {isLoading ? (
          <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400 dark:border-white/10">
            正在读取文章...
          </p>
        ) : null}

        {!isLoading && posts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400 dark:border-white/10">
            还没有文章，先从写作台开始第一篇吧。
          </p>
        ) : null}

        {!isLoading && posts.length > 0 && visiblePosts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400 dark:border-white/10">
            没有匹配的文章。
          </p>
        ) : null}

        {visiblePosts.map((post) => (
          <article
            key={post.id}
            className="group grid gap-3.5 rounded-2xl border border-slate-200/75 bg-surface p-3.5 transition hover:border-accent-300 hover:shadow-md dark:border-white/8 dark:bg-white/[0.03] dark:hover:border-accent-400/35 sm:p-4 lg:grid-cols-[176px_minmax(0,1fr)_auto]"
          >
            <div className="aspect-[16/10] overflow-hidden rounded-xl bg-surface-muted">
              <img
                src={post.coverImage}
                alt=""
                className="size-full object-cover transition duration-500 group-hover:scale-105"
              />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  className={
                    post.published
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/15 dark:text-emerald-200"
                      : ""
                  }
                >
                  {post.published ? "已发布" : "草稿"}
                </Badge>
                {post.featured ? (
                  <Badge className="gap-1">
                    <Star className="size-3" />
                    精选
                  </Badge>
                ) : null}
                <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-white/[0.06] dark:text-slate-300">
                  {post.category}
                </span>
              </div>

              <h3 className="mt-2 line-clamp-1 font-serif text-lg font-bold text-slate-900 dark:text-white">
                {post.title}
              </h3>
              <p className="mt-1 line-clamp-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
                {post.excerpt}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2 font-mono text-[11px] text-slate-400">
                <span>/{post.slug}</span>
                <span>·</span>
                <span>{formatStudioDate(post.updatedAt)}</span>
                <span>·</span>
                <span>{post.viewCount} views</span>
              </div>
            </div>

            <div className="flex items-center gap-2 lg:flex-col lg:justify-center">
              <Button
                type="button"
                className="flex-1 lg:w-24 lg:flex-none"
                variant="soft"
                size="sm"
                onClick={() => onEdit(post)}
              >
                <Edit3 className="size-3.5" />
                编辑
              </Button>
              <button
                type="button"
                onClick={() => setPendingDeletePost(post)}
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/15 lg:w-24 lg:flex-none"
              >
                <Trash2 className="size-3.5" />
                删除
              </button>
            </div>
          </article>
        ))}
      </div>

      <ConfirmDialog
        confirmLabel="删除文章"
        description={`这会删除《${pendingDeletePost?.title ?? "这篇文章"}》及其评论关联数据，操作完成后不可从后台直接撤回。`}
        open={Boolean(pendingDeletePost)}
        title="删除这篇文章？"
        onConfirm={confirmDeletePost}
        onOpenChange={(open) => {
          if (!open) setPendingDeletePost(null);
        }}
      />
    </section>
  );
}
