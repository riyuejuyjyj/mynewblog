"use client";

import { RotateCcw } from "lucide-react";

import type {
  StudioMusicDownload,
  StudioMusicLibraryItem,
  StudioMusicPlaylist,
} from "@/components/studio/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MusicMemoryList } from "./music-memory-list";

export type DownloadStorageFilter =
  | "all"
  | "ready"
  | "repair"
  | "record-only"
  | "missing";

export const downloadStorageFilters: Array<{
  key: DownloadStorageFilter;
  label: string;
}> = [
  { key: "all", label: "全部" },
  { key: "ready", label: "R2 ready" },
  { key: "repair", label: "待修复" },
  { key: "record-only", label: "PG only" },
  { key: "missing", label: "Missing" },
];

export type DownloadStorageCounts = {
  all: number;
  missing: number;
  ready: number;
  recordOnly: number;
  repair: number;
};

type MusicDownloadsPanelProps = {
  counts: DownloadStorageCounts;
  deletingDownloadId?: string | null;
  downloads: StudioMusicDownload[];
  emptyText: string;
  filter: DownloadStorageFilter;
  isRepairDisabled: boolean;
  likedKeys: Set<string>;
  playlists: StudioMusicPlaylist[];
  repairableCount: number;
  repairingDownloads: boolean;
  onAddToPlaylist: (item: StudioMusicLibraryItem, playlistId: string) => void;
  onDeleteDownload: (item: StudioMusicDownload) => void;
  onDownload: (item: StudioMusicLibraryItem) => void;
  onFilterChange: (filter: DownloadStorageFilter) => void;
  onLike: (item: StudioMusicLibraryItem) => void;
  onPlay: (item: StudioMusicLibraryItem) => void;
  onRepair: () => void;
  onSwitchSource?: (item: StudioMusicLibraryItem) => void;
};

function getFilterCount(
  filter: DownloadStorageFilter,
  counts: DownloadStorageCounts,
) {
  if (filter === "all") return counts.all;
  if (filter === "ready") return counts.ready;
  if (filter === "repair") return counts.repair;
  if (filter === "record-only") return counts.recordOnly;

  return counts.missing;
}

export function getDownloadFilterEmptyText(filter: DownloadStorageFilter) {
  if (filter === "ready") return "还没有完整保存到 R2 的音乐。";
  if (filter === "repair") return "没有需要修复的下载记录。";
  if (filter === "record-only") return "没有仅存在 PG 记录的音乐。";
  if (filter === "missing") return "没有确认缺失 R2 对象的音乐。";

  return "还没有下载记录。";
}

export function MusicDownloadsPanel({
  counts,
  deletingDownloadId = null,
  downloads,
  emptyText,
  filter,
  isRepairDisabled,
  likedKeys,
  playlists,
  repairableCount,
  repairingDownloads,
  onAddToPlaylist,
  onDeleteDownload,
  onDownload,
  onFilterChange,
  onLike,
  onPlay,
  onRepair,
  onSwitchSource,
}: MusicDownloadsPanelProps) {
  return (
    <MusicMemoryList
      action={
        <>
          <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-slate-200 bg-white/80 p-1 shadow-sm dark:border-white/10 dark:bg-white/6">
            {downloadStorageFilters.map((item) => (
              <button
                className={cn(
                  "rounded-xl px-3 py-2 text-xs font-black transition",
                  filter === item.key
                    ? "bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950"
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10",
                )}
                key={item.key}
                type="button"
                onClick={() => onFilterChange(item.key)}
              >
                {item.label}{" "}
                <span className="opacity-70">{getFilterCount(item.key, counts)}</span>
              </button>
            ))}
          </div>
          <Button
            disabled={isRepairDisabled}
            type="button"
            variant="glass"
            onClick={onRepair}
          >
            <RotateCcw className="size-4" />
            {repairingDownloads ? "修复中" : `修复云端 ${repairableCount}`}
          </Button>
        </>
      }
      deletingItemId={deletingDownloadId}
      emptyText={emptyText}
      items={downloads}
      likedKeys={likedKeys}
      playlists={playlists}
      subtitle="Downloaded"
      title="下载"
      onAddToPlaylist={onAddToPlaylist}
      onDeleteDownload={onDeleteDownload}
      onDownload={onDownload}
      onLike={onLike}
      onPlay={onPlay}
      onSwitchSource={onSwitchSource}
    />
  );
}
