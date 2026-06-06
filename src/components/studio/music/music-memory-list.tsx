"use client";

/* eslint-disable @next/next/no-img-element */

import { Download, Heart, Play, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import type {
  StudioMusicDownload,
  StudioMusicFavorite,
  StudioMusicLibraryItem,
  StudioMusicPlaylist,
  StudioMusicPlayHistory,
} from "@/components/studio/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  pluginProviderBadgeClass,
  pluginProviderLabels,
  providerLabels,
} from "./music-model";
import { MusicPlaylistPicker } from "./music-playlist-picker";

type MusicMemoryItem =
  | StudioMusicDownload
  | StudioMusicFavorite
  | StudioMusicPlayHistory;

type MusicMemoryListProps = {
  action?: ReactNode;
  deletingItemId?: string | null;
  emptyText: string;
  likedKeys: Set<string>;
  items: MusicMemoryItem[];
  playlists: StudioMusicPlaylist[];
  subtitle: string;
  title: string;
  onDeleteDownload?: (item: StudioMusicDownload) => void;
  onDownload: (item: MusicMemoryItem) => void;
  onLike: (item: StudioMusicLibraryItem) => void;
  onAddToPlaylist: (item: MusicMemoryItem, playlistId: string) => void;
  onPlay: (item: MusicMemoryItem) => void;
  onSwitchSource?: (item: MusicMemoryItem) => void;
};

const fallbackCover =
  "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=900&q=80";

function getProviderLabel(item: MusicMemoryItem) {
  return item.provider === "bilibili"
    ? pluginProviderLabels.bilibili
    : providerLabels[item.provider];
}

function getProviderClass(item: MusicMemoryItem) {
  return item.provider === "bilibili"
    ? pluginProviderBadgeClass.bilibili
    : "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/8 dark:text-slate-200";
}

function getMetaTime(item: MusicMemoryItem) {
  if (!("playedAt" in item)) return "";

  try {
    return new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(item.playedAt));
  } catch {
    return "";
  }
}

function isDownloadItem(item: MusicMemoryItem): item is StudioMusicDownload {
  return "downloadedAt" in item;
}

function getDownloadStatusLabel(item: StudioMusicDownload) {
  if (item.storageStatus === "ready") return "R2 ready";
  if (item.storageStatus === "missing") return "R2 missing";
  if (item.storageStatus === "record-only") return "PG only";

  return "Unchecked";
}

function getDownloadStatusClass(item: StudioMusicDownload) {
  if (item.storageStatus === "ready") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/30 dark:bg-emerald-400/12 dark:text-emerald-100";
  }

  if (item.storageStatus === "missing") {
    return "border-coral-200 bg-coral-50 text-coral-700 dark:border-coral-300/30 dark:bg-coral-400/12 dark:text-coral-100";
  }

  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-300/30 dark:bg-amber-400/12 dark:text-amber-100";
}

export function MusicMemoryList({
  action,
  deletingItemId = null,
  emptyText,
  likedKeys,
  items,
  playlists,
  subtitle,
  title,
  onDeleteDownload,
  onDownload,
  onLike,
  onAddToPlaylist,
  onPlay,
  onSwitchSource,
}: MusicMemoryListProps) {
  return (
    <section className="pb-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold text-slate-400">{subtitle}</p>
          <h1 className="text-5xl font-black tracking-[0]">{title}</h1>
          <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-300">
            {items.length} 首音乐
          </p>
        </div>
        {action ? (
          <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
            {action}
          </div>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 px-6 py-16 text-center text-sm font-bold text-slate-500 dark:border-white/10 dark:text-slate-300">
          {emptyText}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/50">
          <div className="grid grid-cols-[minmax(260px,1fr)_220px_120px_188px] items-center border-b border-slate-100 px-5 py-3 text-xs font-bold text-slate-400 dark:border-white/10">
            <span>歌曲/歌手</span>
            <span>专辑</span>
            <span>来源</span>
            <span className="text-right">操作</span>
          </div>
          <div className="max-h-[560px] overflow-y-auto">
            {items.map((item) => {
              const liked = likedKeys.has(item.itemKey);
              const metaTime = getMetaTime(item);
              const deleting = deletingItemId === item.id;
              const needsRetry =
                isDownloadItem(item) && item.storageStatus !== "ready";
              const canSwitchSource =
                Boolean(onSwitchSource) && item.itemKind === "candidate";

              return (
                <div
                  className="group grid grid-cols-[minmax(260px,1fr)_220px_120px_188px] items-center px-5 py-3 transition hover:bg-slate-50 dark:hover:bg-white/6"
                  key={item.id}
                >
                  <button
                    className="flex min-w-0 items-center gap-3 text-left"
                    type="button"
                    onClick={() => onPlay(item)}
                  >
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-white/10">
                      <img
                        alt={item.title}
                        className="size-full object-cover"
                        src={item.coverUrl || fallbackCover}
                      />
                      <span className="absolute inset-0 grid place-items-center bg-slate-950/0 text-white opacity-0 transition group-hover:bg-slate-950/35 group-hover:opacity-100">
                        <Play className="size-4" />
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                        {item.title}
                      </span>
                      <span className="mt-1 block truncate text-xs font-medium text-slate-500 dark:text-slate-300">
                        {item.artist || "Unknown"}
                        {metaTime ? ` · ${metaTime}` : ""}
                      </span>
                    </span>
                  </button>

                  <span className="truncate text-sm text-slate-500 dark:text-slate-300">
                    {item.album || "-"}
                  </span>
                  <div className="flex min-w-0 flex-col items-start gap-1">
                    <span
                      className={cn(
                        "mr-2 inline-flex w-fit rounded-full border px-2 py-0.5 text-[11px] font-black",
                        getProviderClass(item),
                      )}
                    >
                      {getProviderLabel(item)}
                    </span>
                    {isDownloadItem(item) ? (
                      <span
                        className={cn(
                          "inline-flex w-fit rounded-full border px-2 py-0.5 text-[10px] font-black",
                          getDownloadStatusClass(item),
                        )}
                      >
                        {getDownloadStatusLabel(item)}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      type="button"
                      variant="ghost"
                      title="喜欢"
                      onClick={() => onLike(item)}
                    >
                      <Heart
                        className={cn(
                          "size-4",
                          liked
                            ? "fill-coral-500 text-coral-500"
                            : "text-slate-400",
                        )}
                      />
                    </Button>
                    <Button
                      aria-label={needsRetry ? "Retry R2 save" : "Save to R2"}
                      size="icon"
                      type="button"
                      variant="ghost"
                      title="下载"
                      onClick={() => onDownload(item)}
                    >
                      {needsRetry ? (
                        <RotateCcw className="size-4" />
                      ) : (
                        <Download className="size-4" />
                      )}
                    </Button>
                    <MusicPlaylistPicker
                      playlists={playlists}
                      onAdd={(playlistId) => onAddToPlaylist(item, playlistId)}
                    />
                    {canSwitchSource ? (
                      <Button
                        size="icon"
                        type="button"
                        variant="ghost"
                        title="换源播放"
                        onClick={() => onSwitchSource?.(item)}
                      >
                        <RefreshCw className="size-4" />
                      </Button>
                    ) : null}
                    {isDownloadItem(item) && onDeleteDownload ? (
                      <Button
                        disabled={deleting}
                        size="icon"
                        type="button"
                        variant="ghost"
                        title="删除下载"
                        onClick={() => onDeleteDownload(item)}
                      >
                        <Trash2 className="size-4 text-coral-500" />
                      </Button>
                    ) : null}
                    <Button
                      size="icon"
                      type="button"
                      variant="ghost"
                      title="播放"
                      onClick={() => onPlay(item)}
                    >
                      <Play className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
