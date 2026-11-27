"use client";

import {
  Activity,
  Cloud,
  Database,
  Eye,
  FileText,
  MessageSquareText,
  PenLine,
} from "lucide-react";

import type { StorageStatus } from "@/components/home/types";
import { formatStudioDate } from "@/components/studio/studio-utils";
import type {
  StudioPost,
  StudioStats,
  StudioView,
} from "@/components/studio/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type StudioDashboardProps = {
  commentsCount: number;
  operations: string[];
  posts: StudioPost[];
  stats: StudioStats;
  storage: StorageStatus;
  onViewChange: (view: StudioView) => void;
};

const metricCards = [
  { label: "文章总数", key: "total", icon: FileText },
  { label: "已发布", key: "published", icon: Activity },
  { label: "总浏览", key: "views", icon: Eye },
] as const;

export function StudioDashboard({
  commentsCount,
  operations,
  posts,
  stats,
  storage,
  onViewChange,
}: StudioDashboardProps) {
  const recentPosts = posts.slice(0, 5);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
      <section className="studio-panel p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge className="gap-1.5">
              <Activity className="size-3" />
              工作台概览
            </Badge>
            <h2 className="mt-3 font-serif text-2xl font-bold">
              内容与发布状态
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              快速浏览文章发布进度、读者评论、R2 媒体与近期操作。
            </p>
          </div>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => onViewChange("editor")}
          >
            <PenLine className="size-4" />
            开始写作
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            ...metricCards.map((card) => ({
              label: card.label,
              value: stats[card.key],
              icon: card.icon,
            })),
            { label: "评论", value: commentsCount, icon: MessageSquareText },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-200/70 bg-surface-muted/65 p-4 transition hover:border-accent-300 dark:border-white/8 dark:bg-white/[0.04]"
            >
              <Icon className="size-4 text-accent-500" />
              <div className="mt-3 font-mono text-2xl font-bold">{value}</div>
              <div className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="studio-panel p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
              Operations
            </p>
            <h2 className="mt-0.5 font-serif text-lg font-bold">近期动态</h2>
          </div>
          <Badge>{operations.length}</Badge>
        </div>
        <div className="mt-4 space-y-2">
          {operations.map((operation, index) => (
            <div
              key={`${operation}-${index}`}
              className="rounded-xl bg-surface-muted/75 px-3.5 py-2.5 text-xs font-medium text-slate-700 dark:bg-white/[0.04] dark:text-slate-200"
            >
              {operation}
            </div>
          ))}
        </div>
      </section>

      <section className="studio-panel p-5 xl:col-span-2">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-serif text-lg font-bold">最近文章</h2>
              <Button
                type="button"
                variant="glass"
                size="sm"
                onClick={() => onViewChange("posts")}
              >
                查看全部
              </Button>
            </div>
            <div className="mt-3.5 divide-y divide-slate-100 rounded-2xl border border-slate-200/70 bg-surface dark:divide-white/8 dark:border-white/8 dark:bg-white/[0.02]">
              {recentPosts.length > 0 ? (
                recentPosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <h3 className="line-clamp-1 font-serif text-sm font-bold text-slate-900 dark:text-white">
                        {post.title}
                      </h3>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                        /{post.slug} · {formatStudioDate(post.updatedAt)}
                      </p>
                    </div>
                    <Badge
                      className={
                        post.published
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/15 dark:text-emerald-200"
                          : ""
                      }
                    >
                      {post.published ? "已发布" : "草稿"}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="p-8 text-center text-sm text-slate-400">
                  还没有数据库文章，可以先写第一篇。
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-surface-muted/65 p-4 dark:border-white/8 dark:bg-white/[0.04]">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                <Cloud className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold">R2 存储状态</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {storage.configured ? "签名上传已就绪" : "等待 R2 完整配置"}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Provider</span>
                <span className="font-semibold">{storage.provider}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Bucket</span>
                <span className="truncate font-mono font-semibold">
                  {storage.bucket ?? "未配置"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Database</span>
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <Database className="size-3.5 text-emerald-500" />
                  Neon Postgres
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
