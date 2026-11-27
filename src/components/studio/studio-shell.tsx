"use client";

import {
  BarChart3,
  Bell,
  ChevronRight,
  FileText,
  GalleryHorizontalEnd,
  Home,
  LogOut,
  MessageSquareText,
  Music2,
  PenLine,
  Plus,
  Rocket,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import type { StudioStats, StudioView } from "@/components/studio/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { blogConfig } from "@/config/site";
import { cn } from "@/lib/utils";

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
    description: "概览与动态",
    icon: BarChart3,
  },
  {
    id: "posts",
    label: "文章管理",
    description: "列表与草稿",
    icon: FileText,
  },
  {
    id: "editor",
    label: "写作台",
    description: "富文本与排版",
    icon: PenLine,
  },
  {
    id: "media",
    label: "媒体库",
    description: "R2 封面与素材",
    icon: GalleryHorizontalEnd,
  },
  {
    id: "music",
    label: "音乐库",
    description: "曲库与在线源",
    icon: Music2,
  },
  {
    id: "comments",
    label: "评论审核",
    description: "审核与作者回复",
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
    <section className="relative z-10 mx-auto mt-4 w-full max-w-[1600px] space-y-4 lg:mt-5 lg:grid lg:grid-cols-[256px_minmax(0,1fr)] lg:items-start lg:gap-5 lg:space-y-0">
      {/* Compact Mobile Console Bar */}
      <div className="studio-panel overflow-hidden p-3.5 lg:hidden">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-500 text-white shadow-sm">
              <CurrentIcon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-400">
                {userName || "Author"} · Studio
              </p>
              <h2 className="truncate font-serif text-base font-bold">
                {current.label}
              </h2>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Button type="button" size="sm" onClick={onNewPost}>
              <Plus className="size-3.5" />
              写文章
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
              className="rounded-xl bg-surface-muted/80 px-2 py-2 text-center dark:bg-white/[0.04]"
            >
              <div className="font-mono text-sm font-bold leading-none">
                {value}
              </div>
              <div className="mt-1 text-[10px] font-medium text-slate-400">
                {label}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  isActive
                    ? "border-accent-500 bg-accent-500 text-white shadow-sm"
                    : "border-slate-200/80 bg-surface text-slate-600 hover:border-accent-200 hover:text-accent-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300",
                )}
              >
                <Icon className="size-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Sticky Sidebar */}
      <aside className="hidden space-y-4 lg:sticky lg:top-5 lg:block">
        <div className="studio-panel p-4">
          <div className="flex items-center gap-3">
            <div className="relative size-11 shrink-0 overflow-hidden rounded-full ring-2 ring-accent-200 dark:ring-accent-400/35">
              <Image
                src={blogConfig.images.avatar}
                alt={userName || "Author"}
                fill
                sizes="44px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-accent-600 dark:text-accent-300">
                Creator Studio
              </p>
              <h1 className="truncate font-serif text-base font-bold">
                {userName || "Author"}
              </h1>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {summaryStats.map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl bg-surface-muted/80 px-3 py-2.5 dark:bg-white/[0.04]"
              >
                <div className="font-mono text-lg font-bold leading-tight">
                  {value}
                </div>
                <div className="mt-0.5 text-[11px] font-medium text-slate-400">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <nav className="studio-panel space-y-1 p-2.5" aria-label="创作室导航">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition duration-200",
                  isActive
                    ? "bg-accent-500 text-white shadow-sm shadow-accent-500/25"
                    : "text-slate-600 hover:bg-surface-muted hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white",
                )}
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-lg transition",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-surface-muted text-slate-500 group-hover:text-accent-600 dark:bg-white/[0.06] dark:text-slate-300 dark:group-hover:text-accent-300",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-tight">
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block truncate text-[11px]",
                      isActive
                        ? "text-white/80"
                        : "text-slate-400 dark:text-slate-500",
                    )}
                  >
                    {item.description}
                  </span>
                </span>
                <ChevronRight
                  className={cn(
                    "size-4 shrink-0 transition",
                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-60",
                  )}
                />
              </button>
            );
          })}
        </nav>

        <div className="studio-panel space-y-2.5 p-3.5">
          <Button type="button" className="w-full" onClick={onNewPost}>
            <Plus className="size-4" />
            新建文章
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button asChild type="button" variant="glass" size="sm">
              <Link href="/">
                <Home className="size-3.5" />
                前台
              </Link>
            </Button>
            <Button type="button" variant="glass" size="sm" onClick={onSignOut}>
              <LogOut className="size-3.5" />
              退出
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Stage */}
      <div className="min-w-0 space-y-4">
        <header className="studio-panel hidden items-center justify-between gap-4 px-5 py-3.5 lg:flex">
          <div className="flex items-center gap-3.5">
            <span className="grid size-10 place-items-center rounded-xl bg-accent-100 text-accent-600 dark:bg-accent-500/20 dark:text-accent-200">
              <CurrentIcon className="size-5" />
            </span>
            <div>
              <p className="text-[11px] font-medium text-slate-400">
                {blogConfig.brandPrefix} Console · {current.description}
              </p>
              <h2 className="font-serif text-xl font-bold leading-tight">
                {current.label}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className="gap-1.5">
              <Bell className="size-3" />
              {operations.length} 条记录
            </Badge>
            <Badge className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/15 dark:text-emerald-200">
              <Rocket className="size-3" />
              Cloudflare Ready
            </Badge>
          </div>
        </header>

        {children}
      </div>
    </section>
  );
}
