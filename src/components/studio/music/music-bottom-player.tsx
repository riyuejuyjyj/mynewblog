"use client";

/* eslint-disable @next/next/no-img-element */

import {
  Download,
  Heart,
  ListMusic,
  Maximize2,
  MoreHorizontal,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useMemo, useState } from "react";

import type {
  StudioMusicPlaybackMode,
  StudioMusicPluginProvider,
  StudioMusicQueueItem,
  StudioMusicSearchCandidate,
  StudioMusicTrack,
} from "@/components/studio/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatTime,
  getPlaybackSourceToneClass,
  getPlayerCover,
  pluginProviderLabels,
  type MusicPlaybackSourceStatus,
} from "./music-model";
import {
  getActiveLyricText,
  MusicLyricPanel,
} from "./music-lyric-panel";
import {
  MusicPlaybackDiagnosticsPanel,
  type MusicPlaybackDiagnostics,
} from "./music-playback-diagnostics-panel";
import { MusicQueuePanel } from "./music-queue-panel";

type MusicBottomPlayerProps = {
  currentTime: number;
  currentCandidate: StudioMusicSearchCandidate | null;
  currentQueueKey?: string;
  currentTrack: StudioMusicTrack | null;
  duration: number;
  isLiked: boolean;
  isPlaying: boolean;
  isResolving: boolean;
  lyric?: string;
  lyricSource?: StudioMusicPluginProvider;
  playbackMode: StudioMusicPlaybackMode;
  playbackDiagnostics?: MusicPlaybackDiagnostics | null;
  progress: number;
  queueItems: StudioMusicQueueItem[];
  sourceStatus?: MusicPlaybackSourceStatus | null;
  volume: number;
  onDownload: () => void;
  onLikeToggle: () => void;
  onModeChange: (mode: StudioMusicPlaybackMode) => void;
  onOpenImmersive: () => void;
  onPlayQueueItem: (item: StudioMusicQueueItem) => void;
  onNext: () => void;
  onPrevious: () => void;
  onResetRuntimeHealth?: () => void;
  onSeek: (value: number) => void;
  onTogglePlay: () => void;
  onVolumeChange: (value: number) => void;
};

export function MusicBottomPlayer({
  currentTime,
  currentCandidate,
  currentQueueKey,
  currentTrack,
  duration,
  isLiked,
  isPlaying,
  isResolving,
  lyric = "",
  lyricSource,
  playbackMode,
  playbackDiagnostics,
  progress,
  queueItems,
  sourceStatus,
  volume,
  onDownload,
  onLikeToggle,
  onModeChange,
  onOpenImmersive,
  onPlayQueueItem,
  onNext,
  onPrevious,
  onResetRuntimeHealth,
  onSeek,
  onTogglePlay,
  onVolumeChange,
}: MusicBottomPlayerProps) {
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const VolumeIcon = volume === 0 ? VolumeX : volume < 45 ? Volume : Volume2;
  const ModeIcon =
    playbackMode === "shuffle"
      ? Shuffle
      : playbackMode === "repeat-one"
        ? Repeat1
        : Repeat;
  const currentKey = currentQueueKey || (currentCandidate
    ? `candidate:${currentCandidate.source}:${currentCandidate.id}`
    : currentTrack
      ? `track:${currentTrack.id}`
      : "");
  const activeLyricText = useMemo(
    () => getActiveLyricText(lyric, currentTime),
    [currentTime, lyric],
  );

  function seekToTime(time: number) {
    if (duration <= 0) return;

    onSeek(Math.min(100, Math.max(0, (time / duration) * 100)));
  }

  function cycleMode() {
    onModeChange(
      playbackMode === "repeat-all"
        ? "shuffle"
        : playbackMode === "shuffle"
          ? "repeat-one"
          : "repeat-all",
    );
  }

  return (
    <footer className="grid min-h-[98px] grid-cols-[280px_minmax(0,1fr)_220px] items-center gap-4 border-t border-slate-200 bg-white px-5 dark:border-white/10 dark:bg-slate-950/90">
      <div className="flex min-w-0 items-center gap-3">
        {currentTrack || currentCandidate ? (
          <>
            <img
              alt={currentTrack?.title ?? currentCandidate?.title ?? "music"}
              className="size-14 rounded-xl object-cover shadow-sm"
              src={
                currentTrack
                  ? getPlayerCover(currentTrack)
                  : currentCandidate?.artwork ||
                    "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=900&q=80"
              }
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                {currentTrack?.title ?? currentCandidate?.title}
              </p>
              <div className="mt-1 flex min-w-0 items-center gap-2">
                <p className="min-w-0 truncate text-xs font-medium text-slate-500 dark:text-slate-300">
                  {currentTrack?.artist ?? currentCandidate?.artist}
                </p>
                {sourceStatus ? (
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black",
                      getPlaybackSourceToneClass(sourceStatus.tone),
                    )}
                    title={sourceStatus.detail}
                  >
                    {sourceStatus.label}
                  </span>
                ) : null}
              </div>
            </div>
            <Button
              size="icon"
              type="button"
              variant="ghost"
              title="喜欢"
              onClick={onLikeToggle}
            >
              <Heart
                className={cn(
                  "size-4",
                  isLiked ? "fill-coral-500 text-coral-500" : "text-slate-400",
                )}
              />
            </Button>
            <div className="relative">
              <Button
                aria-pressed={diagnosticsOpen}
                size="icon"
                type="button"
                variant="ghost"
                title="播放诊断"
                onClick={() => setDiagnosticsOpen((current) => !current)}
              >
                <MoreHorizontal className="size-4" />
              </Button>
              {playbackDiagnostics ? (
                <MusicPlaybackDiagnosticsPanel
                  diagnostics={playbackDiagnostics}
                  onResetRuntimeHealth={onResetRuntimeHealth}
                  open={diagnosticsOpen}
                />
              ) : null}
            </div>
          </>
        ) : (
          <p className="text-sm font-bold text-slate-400">等待选择音乐</p>
        )}
      </div>

      <div className="min-w-0">
        <div className="mb-2 flex items-center justify-center gap-4">
          <Button
            aria-pressed={playbackMode !== "repeat-all"}
            size="icon"
            type="button"
            variant="ghost"
            title={
              playbackMode === "repeat-all"
                ? "Repeat all"
                : playbackMode === "shuffle"
                  ? "Shuffle"
                  : "Repeat one"
            }
            onClick={cycleMode}
          >
            <ModeIcon
              className={cn(
                "size-4",
                playbackMode !== "repeat-all" && "text-emerald-500",
              )}
            />
          </Button>
          <Button
            size="icon"
            type="button"
            variant="ghost"
            onClick={onPrevious}
          >
            <SkipBack className="size-5" />
          </Button>
          <Button
            className={cn(
              "size-12 bg-emerald-500 text-white hover:bg-emerald-400 dark:bg-emerald-400 dark:text-slate-950",
              isResolving && "animate-pulse",
            )}
            disabled={(!currentTrack && !currentCandidate) || isResolving}
            size="icon"
            type="button"
            onClick={onTogglePlay}
          >
            {isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
          </Button>
          <Button size="icon" type="button" variant="ghost" onClick={onNext}>
            <SkipForward className="size-5" />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-12 text-right text-[11px] font-medium text-slate-500">
            {formatTime(currentTime)}
          </span>
          <input
            aria-label="播放进度"
            className="min-w-0 flex-1 accent-emerald-500"
            max={100}
            min={0}
            onChange={(event) => onSeek(Number(event.target.value))}
            type="range"
            value={progress}
          />
          <span className="w-12 text-[11px] font-medium text-slate-500">
            {duration ? formatTime(duration) : "--:--"}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-center gap-2">
          <p className="min-w-0 truncate text-center text-xs font-bold text-emerald-600 dark:text-emerald-300">
            {activeLyricText || (lyric ? "等待歌词时间轴..." : "暂无歌词")}
          </p>
          {lyricSource ? (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500 dark:bg-white/10 dark:text-slate-300">
              {pluginProviderLabels[lyricSource]}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <div className="group relative flex items-center">
          <Button
            size="icon"
            type="button"
            variant="ghost"
            title={volume === 0 ? "取消静音" : "静音"}
            onClick={() => onVolumeChange(volume === 0 ? 70 : 0)}
          >
            <VolumeIcon className="size-5" />
          </Button>
          <div className="absolute bottom-12 right-0 hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-xl group-hover:block dark:border-white/10 dark:bg-slate-900">
            <input
              aria-label="音量"
              className="h-28 accent-emerald-500 [writing-mode:vertical-lr]"
              max={100}
              min={0}
              onChange={(event) => onVolumeChange(Number(event.target.value))}
              type="range"
              value={volume}
            />
          </div>
        </div>
        <Button
          size="icon"
          type="button"
          variant="ghost"
          title="下载"
          onClick={onDownload}
        >
          <Download className="size-5" />
        </Button>
        <Button
          size="icon"
          type="button"
          variant="ghost"
          title="沉浸播放"
          onClick={onOpenImmersive}
        >
          <Maximize2 className="size-5" />
        </Button>
        <div className="relative">
          <Button
            aria-pressed={lyricsOpen}
            size="icon"
            type="button"
            variant="ghost"
            title="歌词"
            onClick={() => setLyricsOpen((current) => !current)}
          >
            <span className="text-sm font-black">词</span>
          </Button>
          {lyricsOpen ? (
            <MusicLyricPanel
              currentTime={currentTime}
              duration={duration}
              lyric={lyric}
              lyricSource={lyricSource}
              onSeekTime={seekToTime}
            />
          ) : null}
        </div>
        <div className="relative">
          <Button
            aria-pressed={queueOpen}
            size="icon"
            type="button"
            variant="ghost"
            title="Play queue"
            onClick={() => setQueueOpen((current) => !current)}
          >
            <span className="relative">
              <ListMusic className="size-5" />
              {queueItems.length > 0 ? (
                <span className="absolute -right-2 -top-2 grid min-w-4 place-items-center rounded-full bg-emerald-500 px-1 text-[9px] font-black text-white">
                  {Math.min(queueItems.length, 99)}
                </span>
              ) : null}
            </span>
          </Button>
          <MusicQueuePanel
            currentKey={currentKey}
            items={queueItems}
            open={queueOpen}
            onPlay={(item) => {
              setQueueOpen(false);
              onPlayQueueItem(item);
            }}
          />
        </div>
      </div>
    </footer>
  );
}
