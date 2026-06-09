"use client";

import {
  BarChart3,
  Bell,
  ChevronRight,
  FileText,
  GalleryHorizontalEnd,
  Home,
  LogOut,
  Music2,
  MessageSquareText,
  PenLine,
  Plus,
  Rocket,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StudioStats, StudioView } from "@/components/studio/types";

type StudioShellProps = {
  activeView: StudioView;
  children: ReactNode;
  operations: string[];
  stats: StudioStats;
  userName: string;
  onNewPost: () => void;
  onSignOut: () => void;
  onViewChange: (view: StudioView) => void;
};

const navItems = [
  {
    id: "dashboard",
    label: "工作台",
    description: "概览、队列、状态",
    icon: BarChart3,
  },
  {
    id: "posts",
    label: "文章管理",
    description: "列表、筛选、编辑",
    icon: FileText,
  },
  {
    id: "editor",
    label: "写作台",
    description: "Markdown 编辑",
    icon: PenLine,
  },
  {
    id: "media",
    label: "媒体库",
    description: "封面与附件",
    icon: GalleryHorizontalEnd,
  },
  {
    id: "music",
    label: "音乐库",
    description: "曲库与音源",
    icon: Music2,
  },
  {
    id: "comments",
    label: "评论审核",
    description: "回复与状态",
    icon: MessageSquareText,
  },
] as const satisfies ReadonlyArray<{
  id: StudioView;
  label: string;
  description: string;
  icon: typeof BarChart3;
}>;

export function StudioShell({
  activeView,
  children,
  operations,
  stats,
  userName,
  onNewPost,
  onSignOut,
  onViewChange,
}: StudioShellProps) {
  const current = navItems.find((item) => item.id === activeView) ?? navItems[0];
  const CurrentIcon = current.icon;
  const summaryStats = [
    ["文章", stats.total],
    ["草稿", stats.drafts],
    ["发布", stats.published],
    ["浏览", stats.views],
  ] as const;

  return (
    <section className="relative z-10 mx-auto mt-4 w-full max-w-[1600px] space-y-4 lg:mt-6 lg:grid lg:grid-cols-[280px_1fr] lg:gap-5 lg:space-y-0">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="studio-panel overflow-hidden p-3 lg:hidden"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
              <CurrentIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase text-slate-400">
                MyNewBlog Console
              </p>
              <h2 className="truncate text-lg font-black tracking-[0]">
                {current.label}
              </h2>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" size="icon" title="新建文章" onClick={onNewPost}>
              <Plus className="size-4" />
            </Button>
            <Button asChild type="button" variant="glass" size="icon" title="首页">
              <Link href="/">
                <Home className="size-4" />
              </Link>
            </Button>
            <Button
              type="button"
              variant="glass"
              size="icon"
              title="退出登录"
              onClick={onSignOut}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          {summaryStats.map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-white/45 bg-white/35 px-2 py-2 text-center dark:border-white/10 dark:bg-white/10"
            >
              <div className="text-base font-black leading-none">{value}</div>
              <div className="mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-300">
                {label}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "flex min-w-[74px] shrink-0 flex-col items-center gap-1 rounded-2xl border px-3 py-2 text-xs font-black transition",
                  isActive
                    ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/15 dark:border-white dark:bg-white dark:text-slate-950"
                    : "border-white/45 bg-white/25 text-slate-600 hover:bg-white/50 dark:border-white/10 dark:bg-white/10 dark:text-slate-300",
                )}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-300">
          <span>{operations.length} 个待处理</span>
          <span>Cloudflare ready</span>
        </div>
      </motion.div>

      <motion.aside
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="hidden space-y-4 lg:block"
      >
        <div className="studio-panel overflow-hidden p-4">
          <div className="flex items-center gap-4">
            <div className="relative grid size-12 place-items-center rounded-2xl bg-slate-950 text-white shadow-2xl shadow-slate-950/20 dark:bg-white dark:text-slate-950">
              <PenLine className="size-5" />
              <span className="absolute -right-1 -top-1 size-4 rounded-full border-2 border-white bg-emerald-400 dark:border-slate-950" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase text-coral-700 dark:text-coral-200">
                Studio Admin
              </p>
              <h1 className="mt-1 truncate text-xl font-black tracking-[0]">
                {userName || "Author"}
              </h1>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {summaryStats.map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/45 bg-white/35 p-3 dark:border-white/10 dark:bg-white/10"
              >
                <div className="text-xl font-black">{value}</div>
                <div className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-300">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="studio-panel p-3">
          <div className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onViewChange(item.id)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition duration-300",
                    isActive
                      ? "bg-slate-950 text-white shadow-xl shadow-slate-950/15 dark:bg-white dark:text-slate-950"
                      : "text-slate-600 hover:bg-white/50 dark:text-slate-300 dark:hover:bg-white/10",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-xl transition",
                      isActive
                        ? "bg-white/15 dark:bg-slate-950/10"
                        : "bg-slate-950/5 text-slate-500 group-hover:bg-white/70 dark:bg-white/10 dark:text-slate-300",
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black">{item.label}</span>
                    <span
                      className={cn(
                        "mt-0.5 block truncate text-[11px] font-semibold",
                        isActive
                          ? "text-white/70 dark:text-slate-700"
                          : "text-slate-400 dark:text-slate-500",
                      )}
                    >
                      {item.description}
                    </span>
                  </span>
                  <ChevronRight
                    className={cn(
                      "size-4 transition",
                      isActive ? "opacity-100" : "opacity-0 group-hover:opacity-60",
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="studio-panel p-4">
          <Button type="button" className="w-full" onClick={onNewPost}>
            <Plus className="size-4" />
            新建文章
          </Button>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button asChild type="button" variant="glass" size="sm">
              <Link href="/">
                <Home className="size-4" />
                首页
              </Link>
            </Button>
            <Button type="button" variant="glass" size="sm" onClick={onSignOut}>
              <LogOut className="size-4" />
              退出
            </Button>
          </div>
        </div>
      </motion.aside>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1] }}
        className="min-w-0 space-y-4 lg:space-y-5"
      >
        <header className="studio-panel hidden flex-col gap-4 p-4 lg:flex lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid size-12 place-items-center rounded-2xl bg-coral-100 text-coral-700 dark:bg-coral-400/15 dark:text-coral-200">
              <CurrentIcon className="size-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase text-slate-400">
                MyNewBlog Console
              </p>
              <h2 className="text-2xl font-black tracking-[0]">
                {current.label}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className="gap-2">
              <Bell className="size-3.5" />
              {operations.length} 个待处理
            </Badge>
            <Badge className="gap-2">
              <Rocket className="size-3.5" />
              Cloudflare ready
            </Badge>
          </div>
        </header>

        {children}
      </motion.div>
    </section>
  );
}
