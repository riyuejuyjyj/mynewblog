"use client";

/* eslint-disable @next/next/no-img-element */

import {
  Clock3,
  Compass,
  Download,
  Heart,
  Home,
  ListMusic,
  Radio,
  Settings2,
} from "lucide-react";

import type { StudioMusicTrack } from "@/components/studio/types";
import { cn } from "@/lib/utils";
import { getPlayerCover } from "./music-model";

export type MusicSidebarView =
  | "library"
  | "favorites"
  | "history"
  | "downloads"
  | "playlists"
  | "sources";

const navItems = [
  { icon: Home, label: "首页", value: "library" },
  { icon: Compass, label: "发现", value: "library" },
  { icon: Heart, label: "喜欢", value: "favorites" },
  { icon: Clock3, label: "最近", value: "history" },
  { icon: Download, label: "下载", value: "downloads" },
  { icon: ListMusic, label: "歌单", value: "playlists" },
  { icon: Settings2, label: "音源配置", value: "sources" },
] satisfies Array<{
  icon: typeof Home;
  label: string;
  value: MusicSidebarView;
}>;

type MusicStudioSidebarProps = {
  activeView: MusicSidebarView;
  tracks: StudioMusicTrack[];
  onViewChange: (view: MusicSidebarView) => void;
};

export function MusicStudioSidebar({
  activeView,
  tracks,
  onViewChange,
}: MusicStudioSidebarProps) {
  return (
    <aside className="hidden w-[72px] shrink-0 flex-col items-center border-r border-slate-200 bg-slate-50/90 py-4 dark:border-white/10 dark:bg-slate-950/70 md:flex">
      <div className="grid size-10 place-items-center rounded-2xl bg-white shadow-sm dark:bg-white/10">
        <Radio className="size-5 text-emerald-500" />
      </div>

      <nav className="mt-6 flex flex-col gap-3">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              aria-label={item.label}
              className={cn(
                "grid size-12 place-items-center rounded-2xl text-slate-600 transition hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
                activeView === item.value &&
                  "bg-slate-200 text-slate-950 shadow-sm dark:bg-white/12 dark:text-white",
              )}
              key={item.label}
              onClick={() => onViewChange(item.value)}
              title={item.label}
              type="button"
            >
              <Icon className="size-5" />
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex max-h-64 flex-col gap-3 overflow-hidden">
        {tracks.slice(0, 5).map((track) => (
          <img
            alt=""
            className="size-9 rounded-xl object-cover shadow-sm"
            key={track.id}
            src={getPlayerCover(track)}
          />
        ))}
      </div>
    </aside>
  );
}
