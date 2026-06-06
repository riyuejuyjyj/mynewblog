"use client";

import {
  Activity,
  Cloud,
  Database,
  Eye,
  FileText,
  MessageSquareText,
  PenLine,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StorageStatus } from "@/components/home/types";
import type {
  StudioPost,
  StudioStats,
  StudioView,
} from "@/components/studio/types";
import { formatStudioDate } from "@/components/studio/studio-utils";

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
  const recentPosts = posts.slice(0, 4);

  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="studio-panel p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge className="gap-2">
              <Sparkles className="size-3.5" />
              System pulse
            </Badge>
            <h2 className="mt-5 text-4xl font-black tracking-[0]">
              写作系统状态良好。
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              后台已经接入 Better Auth、邀请码门禁、Neon 数据层和 R2 上传签名。
              现在可以从这里进入文章、媒体、评论与发布流程。
            </p>
          </div>
          <Button type="button" onClick={() => onViewChange("editor")}>
            <PenLine className="size-4" />
            开始写作
          </Button>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ...metricCards.map((card) => ({
              label: card.label,
              value: stats[card.key],
              icon: card.icon,
            })),
            { label: "评论", value: commentsCount, icon: MessageSquareText },
          ].map(({ label, value, icon: Icon }) => (
            <motion.div
              key={label}
              whileHover={{ y: -6, scale: 1.015 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
              className="rounded-3xl border border-white/45 bg-white/35 p-5 dark:border-white/10 dark:bg-white/10"
            >
              <Icon className="size-5 text-coral-500" />
              <div className="mt-5 text-3xl font-black">{value}</div>
              <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-300">
                {label}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="studio-panel p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-slate-400">
              Deploy queue
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-[0]">待处理操作</h2>
          </div>
          <Badge>{operations.length}</Badge>
        </div>
        <div className="mt-5 space-y-3">
          {operations.map((operation, index) => (
            <div
              key={`${operation}-${index}`}
              className="rounded-2xl border border-white/45 bg-white/35 px-4 py-3 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
            >
              {operation}
            </div>
          ))}
        </div>
      </section>

      <section className="studio-panel p-6 xl:col-span-2">
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-black tracking-[0]">最近文章</h2>
              <Button type="button" variant="glass" onClick={() => onViewChange("posts")}>
                查看全部
              </Button>
            </div>
            <div className="mt-5 grid gap-3">
              {recentPosts.length > 0 ? (
                recentPosts.map((post) => (
                  <div
                    key={post.id}
                    className="rounded-3xl border border-white/45 bg-white/30 p-4 dark:border-white/10 dark:bg-white/10"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="line-clamp-1 text-base font-black">
                          {post.title}
                        </h3>
                        <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-300">
                          /{post.slug} · {formatStudioDate(post.updatedAt)}
                        </p>
                      </div>
                      <Badge>{post.published ? "Live" : "Draft"}</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-3xl border border-dashed border-white/45 p-8 text-center text-sm font-bold text-slate-400 dark:border-white/10">
                  还没有数据库文章，可以先写第一篇。
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/45 bg-white/30 p-5 dark:border-white/10 dark:bg-white/10">
            <div className="flex items-center gap-3">
              <Cloud className="size-6 text-emerald-500" />
              <div>
                <h3 className="text-lg font-black tracking-[0]">R2 存储状态</h3>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-300">
                  {storage.configured ? "签名上传已就绪" : "等待 R2 完整配置"}
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm font-bold">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-300">Provider</span>
                <span>{storage.provider}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-300">Bucket</span>
                <span>{storage.bucket ?? "未配置"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-300">Database</span>
                <span className="inline-flex items-center gap-2">
                  <Database className="size-4 text-emerald-500" />
                  Neon
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
