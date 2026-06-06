"use client";

/* eslint-disable @next/next/no-img-element */

import { motion } from "motion/react";
import {
  ChevronDown,
  Download,
  Heart,
  Minus,
  Moon,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Square,
  Sun,
  Volume,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import type {
  StudioMusicPlaybackMode,
  StudioMusicPluginProvider,
  StudioMusicSearchCandidate,
  StudioMusicTrack,
} from "@/components/studio/types";
import { useBlogTheme } from "@/components/theme-provider";
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
  getActiveLyricIndex,
  parseSyncedLyric,
} from "./music-lyric-panel";

type MusicImmersivePlayerProps = {
  currentCandidate: StudioMusicSearchCandidate | null;
  currentTime: number;
  currentTrack: StudioMusicTrack | null;
  duration: number;
  isLiked: boolean;
  isPlaying: boolean;
  isResolving: boolean;
  lyric?: string;
  lyricSource?: StudioMusicPluginProvider;
  playbackMode: StudioMusicPlaybackMode;
  progress: number;
  sourceStatus?: MusicPlaybackSourceStatus | null;
  volume: number;
  onClose: () => void;
  onDownload: () => void;
  onLikeToggle: () => void;
  onModeChange: (mode: StudioMusicPlaybackMode) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (value: number) => void;
  onTogglePlay: () => void;
  onVolumeChange: (value: number) => void;
};

const fallbackCover =
  "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=900&q=80";

export function MusicImmersivePlayer({
  currentCandidate,
  currentTime,
  currentTrack,
  duration,
  isLiked,
  isPlaying,
  isResolving,
  lyric = "",
  lyricSource,
  playbackMode,
  progress,
  sourceStatus,
  volume,
  onClose,
  onDownload,
  onLikeToggle,
  onModeChange,
  onNext,
  onPrevious,
  onSeek,
  onTogglePlay,
  onVolumeChange,
}: MusicImmersivePlayerProps) {
  const { isDark, toggleTheme } = useBlogTheme();
  const title = currentTrack?.title ?? currentCandidate?.title ?? "未选择音乐";
  const artist = currentTrack?.artist ?? currentCandidate?.artist ?? "Unknown Artist";
  const cover = currentTrack
    ? getPlayerCover(currentTrack)
    : currentCandidate?.artwork || fallbackCover;
  const VolumeIcon = volume === 0 ? VolumeX : volume < 45 ? Volume : Volume2;
  const ModeIcon =
    playbackMode === "shuffle"
      ? Shuffle
      : playbackMode === "repeat-one"
        ? Repeat1
        : Repeat;
  const lyricLines = useMemo(() => parseSyncedLyric(lyric), [lyric]);
  const activeLyricIndex = useMemo(
    () => getActiveLyricIndex(lyricLines, currentTime),
    [currentTime, lyricLines],
  );
  const lyricRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const hasSyncedLyric = lyricLines.some((line) => line.time !== null);

  useEffect(() => {
    lyricRefs.current[activeLyricIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [activeLyricIndex]);

  function seekToLyricTime(time: number | null) {
    if (time === null || duration <= 0) return;

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
    <motion.div
      animate={{ opacity: 1 }}
      className={cn(
        "fixed inset-0 z-[80] overflow-hidden transition-colors duration-500",
        isDark ? "bg-slate-950 text-slate-50" : "bg-[#f8f6d7] text-slate-950",
      )}
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-500",
          isDark
            ? "bg-[radial-gradient(circle_at_25%_48%,rgba(59,130,246,0.24),transparent_34%),radial-gradient(circle_at_72%_42%,rgba(16,185,129,0.20),transparent_34%),linear-gradient(115deg,#050816_0%,#101827_48%,#0f172a_100%)]"
            : "bg-[radial-gradient(circle_at_28%_50%,rgba(147,197,253,0.55),transparent_34%),radial-gradient(circle_at_70%_44%,rgba(220,252,231,0.68),transparent_36%),linear-gradient(115deg,#fff9d8_0%,#eefdf2_48%,#d8e9ff_100%)]",
        )}
      />
      <motion.div
        animate={{
          x: ["-4%", "4%", "-4%"],
          y: ["2%", "-3%", "2%"],
        }}
        className={cn(
          "absolute left-[12%] top-[22%] h-[520px] w-[520px] rounded-full blur-3xl",
          isDark ? "bg-blue-500/14" : "bg-sky-300/25",
        )}
        transition={{ duration: 12, ease: "easeInOut", repeat: Infinity }}
      />
      <motion.div
        animate={{
          x: ["3%", "-5%", "3%"],
          y: ["-2%", "3%", "-2%"],
        }}
        className={cn(
          "absolute right-[12%] top-[28%] h-[420px] w-[420px] rounded-full blur-3xl",
          isDark ? "bg-emerald-400/12" : "bg-lime-200/35",
        )}
        transition={{ duration: 14, ease: "easeInOut", repeat: Infinity }}
      />

      <div className="relative z-10 flex h-full flex-col px-6 py-5">
        <header className="flex items-center justify-between">
          <Button
            size="icon"
            type="button"
            variant="ghost"
            title="收起"
            onClick={onClose}
          >
            <ChevronDown className="size-6" />
          </Button>
          <div
            className={cn(
              "flex items-center gap-1",
              isDark ? "text-slate-300" : "text-slate-600",
            )}
          >
            <Button
              size="icon"
              type="button"
              variant="ghost"
              title={isDark ? "切换浅色模式" : "切换深色模式"}
              onClick={toggleTheme}
            >
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button
              size="icon"
              type="button"
              variant="ghost"
              title="最小化"
              onClick={onClose}
            >
              <Minus className="size-4" />
            </Button>
            <Button
              disabled
              size="icon"
              type="button"
              variant="ghost"
              title="已是沉浸窗口"
            >
              <Square className="size-4" />
            </Button>
            <Button
              size="icon"
              type="button"
              variant="ghost"
              title="关闭沉浸播放"
              onClick={onClose}
            >
              <X className="size-4" />
            </Button>
          </div>
        </header>

        <main className="grid min-h-0 flex-1 items-center gap-8 overflow-y-auto px-4 pb-40 pt-4 sm:px-[7vw] lg:grid-cols-[minmax(320px,0.95fr)_minmax(320px,1fr)] lg:gap-10 lg:overflow-hidden lg:pb-24">
          <motion.div
            animate={{ y: 0, opacity: 1 }}
            className="relative mx-auto aspect-[1.05] w-full max-w-[320px] sm:max-w-[390px] xl:max-w-[440px]"
            initial={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div
              className={cn(
                "absolute inset-x-6 bottom-0 h-24 rounded-full blur-2xl",
                isDark ? "bg-blue-950/60" : "bg-slate-400/25",
              )}
            />
            <div
              className={cn(
                "absolute inset-0 rounded-[34px] shadow-[0_28px_70px_rgba(51,65,85,0.18)] ring-1",
                isDark
                  ? "bg-slate-900/82 ring-white/10"
                  : "bg-white/82 ring-white/80",
              )}
            />
            <div
              className={cn(
                "absolute left-[10%] top-[11%] aspect-square w-[70%] rounded-full p-[10%] shadow-inner",
                isDark
                  ? "bg-[conic-gradient(from_0deg,#102033,#2563eb,#0f172a,#38bdf8,#102033)]"
                  : "bg-[conic-gradient(from_0deg,#d9eeff,#8ec5ff,#f5fbff,#b7dcff,#d9eeff)]",
              )}
            >
              <motion.div
                animate={{ rotate: isPlaying ? 360 : 0 }}
                className="relative size-full rounded-full bg-slate-950 p-[10%] shadow-[inset_0_0_0_10px_rgba(255,255,255,0.28)]"
                transition={{
                  duration: 12,
                  ease: "linear",
                  repeat: isPlaying ? Infinity : 0,
                }}
              >
                <img
                  alt={title}
                  className="size-full rounded-full object-cover"
                  src={cover}
                />
                <span className="absolute inset-[42%] rounded-full bg-white shadow-inner" />
              </motion.div>
            </div>
            <motion.div
              animate={{ rotate: isPlaying ? 8 : -8 }}
              className={cn(
                "absolute right-[12%] top-[5%] h-[64%] w-8 origin-top rounded-full shadow-lg",
                isDark
                  ? "bg-gradient-to-b from-slate-700 via-slate-200 to-slate-800"
                  : "bg-gradient-to-b from-slate-300 via-white to-slate-400",
              )}
              transition={{ duration: 0.35 }}
            >
              <span
                className={cn(
                  "absolute -left-4 top-0 grid size-10 place-items-center rounded-full shadow",
                  isDark ? "bg-slate-200" : "bg-white",
                )}
              >
                <span className="size-4 rounded-full bg-slate-300" />
              </span>
              <span
                className={cn(
                  "absolute -bottom-2 left-1 grid size-8 place-items-center rounded-full shadow",
                  isDark ? "bg-slate-200" : "bg-white",
                )}
              >
                <span className="size-2 rounded-full bg-slate-300" />
              </span>
            </motion.div>
            <span
              className={cn(
                "absolute bottom-[13%] right-[12%] grid size-8 place-items-center rounded-full text-xs font-black text-emerald-500 shadow",
                isDark ? "bg-slate-900" : "bg-white",
              )}
            >
              Q
            </span>
          </motion.div>

          <motion.div
            animate={{ y: 0, opacity: 1 }}
            className="min-h-0 min-w-0 text-center lg:text-left"
            initial={{ y: 18, opacity: 0 }}
            transition={{ duration: 0.35, delay: 0.06 }}
          >
            <div className="mx-auto max-w-xl lg:mx-0">
              <h2 className="truncate text-3xl font-semibold">{title}</h2>
              <p
                className={cn(
                  "mt-2 truncate text-sm",
                  isDark ? "text-slate-300" : "text-slate-600",
                )}
              >
                {artist}
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-2 lg:justify-start">
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-bold shadow-sm",
                    isDark
                      ? "border-white/10 bg-white/10 text-slate-300"
                      : "border-slate-300/70 bg-white/55 text-slate-500",
                  )}
                >
                  {currentTrack?.album || currentCandidate?.album || "未命名专辑"}
                </span>
                {lyricSource ? (
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-bold shadow-sm",
                      isDark
                        ? "border-white/10 bg-white/10 text-slate-300"
                        : "border-slate-300/70 bg-white/55 text-slate-500",
                    )}
                  >
                    歌词来自 {pluginProviderLabels[lyricSource]}
                  </span>
                ) : null}
                {sourceStatus ? (
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-bold shadow-sm",
                      getPlaybackSourceToneClass(sourceStatus.tone),
                    )}
                    title={sourceStatus.detail}
                  >
                    {sourceStatus.label}
                  </span>
                ) : null}
              </div>
            </div>

            <div
              className={cn(
                "relative mx-auto mt-8 h-[260px] max-w-xl overflow-hidden rounded-[28px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.58)] backdrop-blur-sm lg:mx-0 lg:mt-12 lg:h-[310px]",
                isDark
                  ? "border-white/10 bg-white/8"
                  : "border-white/50 bg-white/22",
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b to-transparent",
                  isDark ? "from-slate-950/80" : "from-[#eff7de]",
                )}
              />
              <div
                className={cn(
                  "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t to-transparent",
                  isDark ? "from-slate-950/80" : "from-[#e4f1e7]",
                )}
              />
              {lyricLines.length > 0 ? (
                <div className="h-full overflow-y-auto px-7 py-28 [scrollbar-width:none]">
                  <div className="space-y-4">
                    {lyricLines.map((line, index) => {
                      const active = index === activeLyricIndex;
                      const seekable = hasSyncedLyric && line.time !== null && duration > 0;

                      return (
                        <button
                          className={cn(
                            "block w-full rounded-2xl px-4 py-2 text-left transition duration-300",
                            seekable && (isDark ? "hover:bg-white/10" : "hover:bg-white/35"),
                            active
                              ? cn(
                                  "translate-x-1 text-xl font-semibold sm:translate-x-2 sm:text-[26px]",
                                  isDark ? "text-white" : "text-slate-900",
                                )
                              : cn(
                                  "text-base font-medium sm:text-lg",
                                  isDark ? "text-slate-400/80" : "text-slate-500/75",
                                ),
                            index < activeLyricIndex && !active && "opacity-45",
                          )}
                          disabled={!seekable}
                          key={line.id}
                          ref={(node) => {
                            lyricRefs.current[index] = node;
                          }}
                          type="button"
                          onClick={() => seekToLyricTime(line.time)}
                        >
                          {line.text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="grid h-full place-items-center px-8 text-center">
                  <div>
                    <p className={cn("text-2xl font-light", isDark ? "text-slate-300" : "text-slate-600")}>听我想听</p>
                    <p className={cn("mt-3 text-sm font-medium", isDark ? "text-slate-400" : "text-slate-500")}>
                      当前音源没有返回歌词，播放仍然可以继续。
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </main>

        <footer
          className={cn(
            "absolute inset-x-0 bottom-0 grid min-h-[120px] grid-cols-1 items-center gap-3 border-t px-4 pb-4 pt-3 backdrop-blur-md md:min-h-[82px] md:grid-cols-[260px_minmax(280px,1fr)_220px] md:px-8 xl:grid-cols-[300px_minmax(280px,1fr)_260px]",
            isDark
              ? "border-white/10 bg-slate-950/42"
              : "border-white/30 bg-white/24",
          )}
        >
          <div className="flex min-w-0 items-center justify-center gap-3 md:justify-start">
            <img
              alt={title}
              className="size-14 rounded-xl object-cover shadow-sm"
              src={cover}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{title}</p>
              <p
                className={cn(
                  "mt-1 truncate text-xs",
                  isDark ? "text-slate-400" : "text-slate-600",
                )}
              >
                {artist}
              </p>
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
                  "size-5",
                  isLiked
                    ? "fill-coral-500 text-coral-500"
                    : isDark
                      ? "text-slate-400"
                      : "text-slate-500",
                )}
              />
            </Button>
          </div>

          <div className="min-w-0">
            <div className="mb-1 flex justify-center gap-3">
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
                    playbackMode !== "repeat-all" &&
                      (isDark ? "text-blue-300" : "text-blue-500"),
                  )}
                />
              </Button>
              <Button size="icon" type="button" variant="ghost" onClick={onPrevious}>
                <SkipBack className="size-5" />
              </Button>
              <Button
                className={cn(
                  "size-11 rounded-full bg-blue-500 text-white hover:bg-blue-400",
                  isResolving && "animate-pulse",
                )}
                disabled={isResolving}
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
              <span
                className={cn(
                  "w-12 text-right text-[11px]",
                  isDark ? "text-slate-400" : "text-slate-600",
                )}
              >
                {formatTime(currentTime)}
              </span>
              <input
                aria-label="播放进度"
                className="min-w-0 flex-1 accent-blue-500"
                max={100}
                min={0}
                onChange={(event) => onSeek(Number(event.target.value))}
                type="range"
                value={progress}
              />
              <span
                className={cn(
                  "w-12 text-[11px]",
                  isDark ? "text-slate-400" : "text-slate-600",
                )}
              >
                {duration ? formatTime(duration) : "--:--"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 md:justify-end">
            <Button
              size="icon"
              type="button"
              variant="ghost"
              title={volume === 0 ? "取消静音" : "静音"}
              onClick={() => onVolumeChange(volume === 0 ? 70 : 0)}
            >
              <VolumeIcon className="size-5" />
            </Button>
            <input
              aria-label="音量"
              className="w-24 accent-blue-500"
              max={100}
              min={0}
              onChange={(event) => onVolumeChange(Number(event.target.value))}
              type="range"
              value={volume}
            />
            <Button size="icon" type="button" variant="ghost" title="下载" onClick={onDownload}>
              <Download className="size-5" />
            </Button>
          </div>
        </footer>
      </div>
    </motion.div>
  );
}
