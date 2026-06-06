"use client";

/* eslint-disable @next/next/no-img-element */

import {
  Download,
  Maximize2,
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume,
  Volume2,
  VolumeX,
} from "lucide-react";

import type {
  StudioMusicSearchCandidate,
  StudioMusicTrack,
} from "@/components/studio/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatTime,
  getPlaybackSourceToneClass,
  getPlayerCover,
  type MusicPlaybackSourceStatus,
} from "./music-model";

type MusicBackgroundPlayerProps = {
  currentCandidate: StudioMusicSearchCandidate | null;
  currentTime: number;
  currentTrack: StudioMusicTrack | null;
  duration: number;
  isPlaying: boolean;
  isResolving: boolean;
  progress: number;
  sourceStatus?: MusicPlaybackSourceStatus | null;
  volume: number;
  onDownload: () => void;
  onNext: () => void;
  onOpenImmersive: () => void;
  onPrevious: () => void;
  onSeek: (value: number) => void;
  onTogglePlay: () => void;
  onVolumeChange: (value: number) => void;
};

export function MusicBackgroundPlayer({
  currentCandidate,
  currentTime,
  currentTrack,
  duration,
  isPlaying,
  isResolving,
  progress,
  sourceStatus,
  volume,
  onDownload,
  onNext,
  onOpenImmersive,
  onPrevious,
  onSeek,
  onTogglePlay,
  onVolumeChange,
}: MusicBackgroundPlayerProps) {
  const title = currentCandidate?.title || currentTrack?.title || "后台音乐";
  const artist = currentCandidate?.artist || currentTrack?.artist || "等待播放";
  const cover = currentCandidate?.artwork || getPlayerCover(currentTrack);
  const canControl = Boolean(currentTrack || currentCandidate);
  const VolumeIcon = volume === 0 ? VolumeX : volume < 45 ? Volume : Volume2;

  return (
    <div className="group fixed bottom-6 right-0 z-50 flex h-[148px] items-end">
      <button
        className="relative z-10 mb-5 grid h-16 w-14 place-items-center rounded-l-[24px] border border-r-0 border-white/45 bg-slate-950/88 text-white shadow-2xl shadow-slate-950/30 backdrop-blur-xl transition duration-300 group-hover:-translate-x-[388px] dark:border-white/10 dark:bg-slate-900/88"
        type="button"
        title="后台播放器"
        onClick={onOpenImmersive}
      >
        <img
          alt={title}
          className="size-11 rounded-2xl object-cover shadow-sm"
          src={cover}
        />
        <span className="absolute -left-1 top-2 grid size-5 place-items-center rounded-full bg-emerald-500 text-white shadow">
          <Music2 className="size-3" />
        </span>
      </button>
      <div className="absolute bottom-0 right-0 w-[388px] translate-x-[calc(100%-52px)] overflow-hidden rounded-l-[30px] border border-white/55 bg-white/92 shadow-2xl shadow-slate-950/20 backdrop-blur-2xl transition duration-300 ease-out group-hover:translate-x-0 dark:border-white/10 dark:bg-slate-950/92">
        <div className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 px-4 pb-2 pt-4">
          <img
            alt={title}
            className="size-14 rounded-2xl object-cover shadow-md"
            src={cover}
          />
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-300">
              Background Player
            </p>
            <p className="mt-1 truncate text-sm font-black text-slate-950 dark:text-white">
              {title}
            </p>
            <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-300">
              {artist}
            </p>
            {sourceStatus ? (
              <span
                className={cn(
                  "mt-1 inline-flex max-w-full rounded-full border px-2 py-0.5 text-[10px] font-black",
                  getPlaybackSourceToneClass(sourceStatus.tone),
                )}
                title={sourceStatus.detail}
              >
                <span className="truncate">{sourceStatus.label}</span>
              </span>
            ) : null}
          </div>
          <Button
            disabled={!canControl}
            size="icon"
            type="button"
            variant="ghost"
            title="沉浸播放"
            onClick={onOpenImmersive}
          >
            <Maximize2 className="size-4" />
          </Button>
        </div>

        <div className="px-4 pb-4">
          <div className="flex items-center gap-2">
            <span className="w-10 text-right text-[10px] font-bold tabular-nums text-slate-400">
              {formatTime(currentTime)}
            </span>
            <input
              aria-label="后台播放进度"
              className="min-w-0 flex-1 accent-emerald-500"
              disabled={!canControl}
              max={100}
              min={0}
              onChange={(event) => onSeek(Number(event.target.value))}
              type="range"
              value={progress}
            />
            <span className="w-10 text-[10px] font-bold tabular-nums text-slate-400">
              {duration ? formatTime(duration) : "--:--"}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button
                disabled={!canControl}
                size="icon"
                type="button"
                variant="ghost"
                title="上一首"
                onClick={onPrevious}
              >
                <SkipBack className="size-4" />
              </Button>
              <Button
                className="size-11 bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 dark:bg-emerald-400 dark:text-slate-950"
                disabled={!canControl || isResolving}
                size="icon"
                type="button"
                title={isPlaying ? "暂停" : "播放"}
                onClick={onTogglePlay}
              >
                {isPlaying ? (
                  <Pause className="size-5" />
                ) : (
                  <Play className="size-5" />
                )}
              </Button>
              <Button
                disabled={!canControl}
                size="icon"
                type="button"
                variant="ghost"
                title="下一首"
                onClick={onNext}
              >
                <SkipForward className="size-4" />
              </Button>
            </div>

            <div className="flex min-w-0 items-center gap-2">
              <Button
                size="icon"
                type="button"
                variant="ghost"
                title={volume === 0 ? "取消静音" : "静音"}
                onClick={() => onVolumeChange(volume === 0 ? 70 : 0)}
              >
                <VolumeIcon className="size-4" />
              </Button>
              <input
                aria-label="后台音量"
                className="w-24 accent-emerald-500"
                max={100}
                min={0}
                onChange={(event) => onVolumeChange(Number(event.target.value))}
                type="range"
                value={volume}
              />
              <Button
                disabled={!canControl}
                size="icon"
                type="button"
                variant="ghost"
                title="保存到 R2"
                onClick={onDownload}
              >
                <Download className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
