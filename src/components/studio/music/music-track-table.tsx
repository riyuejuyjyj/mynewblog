"use client";

/* eslint-disable @next/next/no-img-element */

import {
  Download,
  Edit3,
  Heart,
  MoreHorizontal,
  Pause,
  Play,
  Trash2,
} from "lucide-react";

import type {
  StudioMusicPlaylist,
  StudioMusicSearchCandidate,
  StudioMusicTrack,
} from "@/components/studio/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getPlayerCover,
  pluginProviderBadgeClass,
  pluginProviderLabels,
  providerLabels,
} from "./music-model";
import { MusicPlaylistPicker } from "./music-playlist-picker";

type MusicTrackTableProps = {
  currentTrack: StudioMusicTrack | null;
  likedKeys: Set<string>;
  isLoading: boolean;
  isPlaying: boolean;
  resolvingTrackId: string | null;
  playlists: StudioMusicPlaylist[];
  searchCandidates: StudioMusicSearchCandidate[];
  searchKeyword: string;
  searchLoading: boolean;
  tracks: StudioMusicTrack[];
  onDelete: (track: StudioMusicTrack) => void;
  onDownloadCandidate: (candidate: StudioMusicSearchCandidate) => void;
  onDownloadTrack: (track: StudioMusicTrack) => void;
  onEdit: (track: StudioMusicTrack) => void;
  onAddCandidateToPlaylist: (
    candidate: StudioMusicSearchCandidate,
    playlistId: string,
  ) => void;
  onAddTrackToPlaylist: (track: StudioMusicTrack, playlistId: string) => void;
  onLikeCandidate: (candidate: StudioMusicSearchCandidate) => void;
  onLikeTrack: (track: StudioMusicTrack) => void;
  onPlayCandidate: (candidate: StudioMusicSearchCandidate) => void;
  onPlay: (track: StudioMusicTrack, index: number) => void;
};

export function MusicTrackTable({
  currentTrack,
  likedKeys,
  isLoading,
  isPlaying,
  resolvingTrackId,
  playlists,
  searchCandidates,
  searchKeyword,
  searchLoading,
  tracks,
  onDelete,
  onDownloadCandidate,
  onDownloadTrack,
  onEdit,
  onAddCandidateToPlaylist,
  onAddTrackToPlaylist,
  onLikeCandidate,
  onLikeTrack,
  onPlayCandidate,
  onPlay,
}: MusicTrackTableProps) {
  const showingSearch = searchKeyword.trim().length >= 2;

  if (showingSearch) {
    return (
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/50">
        <div className="grid grid-cols-[minmax(260px,1fr)_220px_90px_176px] items-center border-b border-slate-100 px-5 py-3 text-xs font-bold text-slate-400 dark:border-white/10">
          <span>远程搜索结果</span>
          <span>来源</span>
          <span>时长</span>
          <span className="text-right">操作</span>
        </div>

        <div className="max-h-[520px] overflow-y-auto">
          {searchLoading ? (
            <p className="p-6 text-sm font-bold text-slate-500">
              正在搜索远端插件...
            </p>
          ) : null}
          {!searchLoading && searchCandidates.length === 0 ? (
            <p className="p-6 text-sm font-bold text-slate-500">
              已并行搜索远程音源，但当前没有返回可播放的音乐结果。
            </p>
          ) : null}
          {searchCandidates.map((candidate) => {
            const isResolving =
              resolvingTrackId === `candidate:${candidate.source}:${candidate.id}`;
            const liked = likedKeys.has(`candidate:${candidate.source}:${candidate.id}`);

            return (
              <div
                className="group grid grid-cols-[minmax(260px,1fr)_220px_90px_176px] items-center px-5 py-3 transition hover:bg-slate-50 dark:hover:bg-white/6"
                key={`${candidate.source}-${candidate.id}`}
              >
                <button
                  className="flex min-w-0 items-center gap-3 text-left"
                  type="button"
                  onClick={() => onPlayCandidate(candidate)}
                >
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-white/10">
                    {candidate.artwork ? (
                      <img
                        alt={candidate.title}
                        className="size-full object-cover"
                        src={candidate.artwork}
                      />
                    ) : null}
                    <span className="absolute inset-0 grid place-items-center bg-slate-950/0 text-white opacity-0 transition group-hover:bg-slate-950/35 group-hover:opacity-100">
                      <Play className="size-4" />
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                        {candidate.title}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em]",
                          pluginProviderBadgeClass[candidate.source],
                        )}
                      >
                        {pluginProviderLabels[candidate.source]}
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-xs font-medium text-slate-500 dark:text-slate-300">
                      {candidate.artist || "Unknown"}
                      {isResolving ? " · 解析中" : ""}
                    </span>
                  </span>
                </button>
                <span className="truncate text-sm text-slate-500 dark:text-slate-300">
                  <span
                    className={cn(
                      "mr-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-black",
                      pluginProviderBadgeClass[candidate.source],
                    )}
                  >
                    {pluginProviderLabels[candidate.source]}
                  </span>
                  {candidate.album || "-"}
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-300">
                  {candidate.duration
                    ? `${Math.floor(candidate.duration / 60)}:${Math.floor(
                        candidate.duration % 60,
                      )
                        .toString()
                        .padStart(2, "0")}`
                    : "--:--"}
                </span>
                <div className="flex justify-end gap-1">
                  <Button
                    size="icon"
                    type="button"
                    variant="ghost"
                    title="喜欢"
                    onClick={() => onLikeCandidate(candidate)}
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
                    size="icon"
                    type="button"
                    variant="ghost"
                    title="下载"
                    onClick={() => onDownloadCandidate(candidate)}
                  >
                    <Download className="size-4" />
                  </Button>
                  <MusicPlaylistPicker
                    playlists={playlists}
                    onAdd={(playlistId) =>
                      onAddCandidateToPlaylist(candidate, playlistId)
                    }
                  />
                  <Button
                    size="icon"
                    type="button"
                    variant="ghost"
                    title="播放"
                    onClick={() => onPlayCandidate(candidate)}
                  >
                    <Play className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl bg-slate-100 px-6 py-12 text-center text-sm font-bold text-slate-500 dark:bg-white/8 dark:text-slate-300">
        正在同步曲库...
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 px-6 py-16 text-center text-sm font-bold text-slate-500 dark:border-white/10 dark:text-slate-300">
        还没有音乐，先添加一首本地/R2 歌曲或平台音源。
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/50">
      <div className="grid grid-cols-[minmax(260px,1fr)_220px_90px_188px] items-center border-b border-slate-100 px-5 py-3 text-xs font-bold text-slate-400 dark:border-white/10">
        <span>歌名/歌手</span>
        <span>专辑</span>
        <span>时长</span>
        <span className="text-right">操作</span>
      </div>

      <div className="max-h-[520px] overflow-y-auto">
        {tracks.map((track, index) => {
          const active = currentTrack?.id === track.id;
          const isResolving = resolvingTrackId === track.id;
          const liked = likedKeys.has(`track:${track.id}`);

          return (
            <div
              className={cn(
                "group grid grid-cols-[minmax(260px,1fr)_220px_90px_188px] items-center px-5 py-3 transition",
                active
                  ? "bg-emerald-50 dark:bg-emerald-400/10"
                  : "bg-white hover:bg-slate-50 dark:bg-transparent dark:hover:bg-white/6",
              )}
              key={track.id}
            >
              <button
                className="flex min-w-0 items-center gap-3 text-left"
                type="button"
                onClick={() => onPlay(track, index)}
              >
                <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-white/10">
                  <img
                    alt={track.title}
                    className="size-full object-cover"
                    src={getPlayerCover(track)}
                  />
                  <span className="absolute inset-0 grid place-items-center bg-slate-950/0 text-white opacity-0 transition group-hover:bg-slate-950/35 group-hover:opacity-100">
                    {active && isPlaying ? (
                      <Pause className="size-4" />
                    ) : (
                      <Play className="size-4" />
                    )}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                      {track.title}
                    </span>
                    {track.quality === "flac" ? (
                      <span className="rounded border border-amber-300 px-1.5 py-0.5 text-[10px] font-black text-amber-600">
                        Hi-Res
                      </span>
                    ) : null}
                    {track.provider !== "manual" ? (
                      <span className="rounded border border-emerald-300 px-1.5 py-0.5 text-[10px] font-black text-emerald-600">
                        VIP
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block truncate text-xs font-medium text-slate-500 dark:text-slate-300">
                    {track.artist} · {providerLabels[track.provider]}
                    {isResolving ? " · 解析中" : ""}
                  </span>
                </span>
              </button>

              <span className="truncate text-sm text-slate-500 dark:text-slate-300">
                {track.album || "-"}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-300">
                --:--
              </span>
              <div
                className={cn(
                  "flex justify-end gap-1 transition group-hover:opacity-100",
                  liked ? "opacity-100" : "opacity-0",
                )}
              >
                <Button
                  size="icon"
                  type="button"
                  variant="ghost"
                  title="喜欢"
                  onClick={() => onLikeTrack(track)}
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
                  size="icon"
                  type="button"
                  variant="ghost"
                  title="下载"
                  onClick={() => onDownloadTrack(track)}
                >
                  <Download className="size-4" />
                </Button>
                <MusicPlaylistPicker
                  playlists={playlists}
                  onAdd={(playlistId) => onAddTrackToPlaylist(track, playlistId)}
                />
                <Button
                  size="icon"
                  type="button"
                  variant="ghost"
                  title="编辑"
                  onClick={() => onEdit(track)}
                >
                  <Edit3 className="size-4" />
                </Button>
                <Button
                  size="icon"
                  type="button"
                  variant="ghost"
                  title="删除"
                  onClick={() => onDelete(track)}
                >
                  <Trash2 className="size-4" />
                </Button>
                <Button
                  size="icon"
                  type="button"
                  variant="ghost"
                  title="更多"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
