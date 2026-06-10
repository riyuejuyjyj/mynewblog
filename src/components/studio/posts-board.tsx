"use client";

/* eslint-disable @next/next/no-img-element */

import { Edit3, FilePlus2, Search, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { StudioPost } from "@/components/studio/types";
import { formatStudioDate } from "@/components/studio/studio-utils";

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
    if (!pendingDeletePost) {
      return;
    }

    onDelete(pendingDeletePost);
    setPendingDeletePost(null);
  }

  return (
    <section className="studio-panel overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-white/35 p-4 dark:border-white/10 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-slate-400">Archive</p>
          <h2 className="mt-1 text-2xl font-black tracking-[0] sm:text-3xl">
            文章与草稿
          </h2>
        </div>
        <div className="grid w-full grid-cols-3 gap-2 lg:w-auto lg:flex lg:flex-wrap lg:justify-end">
          <label className="col-span-3 flex h-10 min-w-0 items-center gap-2 rounded-full border border-white/45 bg-white/35 px-3 text-sm font-bold text-slate-500 dark:border-white/10 dark:bg-white/10 lg:col-span-1 lg:w-56">
            <Search className="size-4" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索标题 / 标签"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400"
            />
          </label>
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
              className={`h-10 rounded-full px-3 text-xs font-black transition ${
                filter === value
                  ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                  : "bg-white/35 text-slate-600 hover:bg-white/60 dark:bg-white/10 dark:text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
          <Button type="button" className="col-span-3 lg:col-span-1" onClick={onNew}>
            <FilePlus2 className="size-4" />
            新建
          </Button>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:p-5">
        {isLoading ? (
          <p className="rounded-2xl border border-dashed border-white/45 p-8 text-center text-sm font-bold text-slate-400 dark:border-white/10">
            正在读取文章...
          </p>
        ) : null}

        {!isLoading && posts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/45 p-8 text-center text-sm font-bold text-slate-400 dark:border-white/10">
            还没有文章，先从 Markdown 写作台开始。
          </p>
        ) : null}

        {!isLoading && posts.length > 0 && visiblePosts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/45 p-8 text-center text-sm font-bold text-slate-400 dark:border-white/10">
            没有匹配的文章。
          </p>
        ) : null}

        {visiblePosts.map((post) => (
          <article
            key={post.id}
            className="group grid gap-3 rounded-2xl border border-white/45 bg-white/30 p-3 transition hover:bg-white/45 hover:shadow-xl hover:shadow-slate-950/10 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15 sm:p-4 lg:grid-cols-[200px_1fr_auto]"
          >
            <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-slate-950/5 dark:bg-white/10">
              <img
                src={post.coverImage}
                alt=""
                className="size-full object-cover transition duration-500 group-hover:scale-105"
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{post.published ? "Live" : "Draft"}</Badge>
                {post.featured ? (
                  <Badge className="gap-1">
                    <Star className="size-3" />
                    Featured
                  </Badge>
                ) : null}
              </div>
              <h3 className="mt-3 line-clamp-1 text-lg font-black tracking-[0] sm:mt-4 sm:text-2xl">
                {post.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {post.excerpt}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-500 dark:text-slate-300">
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
                className="flex-1 lg:flex-none"
                variant="glass"
                size="sm"
                onClick={() => onEdit(post)}
              >
                <Edit3 className="size-4" />
                编辑
              </Button>
              <button
                type="button"
                onClick={() => setPendingDeletePost(post)}
                className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-full px-4 text-xs font-black text-coral-700 transition hover:bg-coral-100 dark:text-coral-200 dark:hover:bg-coral-400/10 lg:flex-none"
              >
                <Trash2 className="size-4" />
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
          if (!open) {
            setPendingDeletePost(null);
          }
        }}
      />
    </section>
  );
}
