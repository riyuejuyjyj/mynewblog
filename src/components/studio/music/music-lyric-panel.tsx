"use client";

import { useEffect, useMemo, useRef } from "react";

import type { StudioMusicPluginProvider } from "@/components/studio/types";
import { cn } from "@/lib/utils";
import { formatTime, pluginProviderLabels } from "./music-model";

type SyncedLyricLine = {
  id: string;
  text: string;
  time: number | null;
};

type MusicLyricPanelProps = {
  currentTime: number;
  duration: number;
  lyric: string;
  lyricSource?: StudioMusicPluginProvider;
  onSeekTime?: (time: number) => void;
};

const timeTagPattern = /\[(?:(\d{1,2}):)?(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?]|\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?]/g;
const metadataTagPattern = /^\[(?:ti|ar|al|au|by|length|offset|re|ve|tool|encoding):.*]$/i;

function parseTimestamp(match: RegExpMatchArray) {
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? match[5] ?? 0);
  const seconds = Number(match[3] ?? match[6] ?? 0);
  const fractionText = match[4] ?? match[7] ?? "";
  const fraction = fractionText
    ? Number(`0.${fractionText.padEnd(3, "0").slice(0, 3)}`)
    : 0;

  return hours * 3600 + minutes * 60 + seconds + fraction;
}

export function parseSyncedLyric(lyric: string): SyncedLyricLine[] {
  const lines: SyncedLyricLine[] = [];

  lyric
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#40;/g, "(")
    .replace(/&#41;/g, ")")
    .split(/\r?\n/)
    .forEach((rawLine, lineIndex) => {
      const line = rawLine.trim();

      if (!line || metadataTagPattern.test(line)) return;

      const matches = Array.from(line.matchAll(timeTagPattern));
      const text = line
        .replace(timeTagPattern, "")
        .replace(/\s+/g, " ")
        .trim();

      if (!text) return;

      if (matches.length === 0) {
        lines.push({
          id: `plain-${lineIndex}`,
          text,
          time: null,
        });
        return;
      }

      for (const match of matches) {
        lines.push({
          id: `${lineIndex}-${match.index ?? lines.length}`,
          text,
          time: parseTimestamp(match),
        });
      }
    });

  return lines.sort((left, right) => {
    if (left.time === null && right.time === null) return 0;
    if (left.time === null) return 1;
    if (right.time === null) return -1;

    return left.time - right.time;
  });
}

export function getActiveLyricIndex(
  lines: SyncedLyricLine[],
  currentTime: number,
) {
  let activeIndex = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const lineTime = lines[index].time;

    if (lineTime === null) continue;
    if (lineTime > currentTime + 0.18) break;

    activeIndex = index;
  }

  return activeIndex;
}

export function getActiveLyricText(lyric: string, currentTime: number) {
  const lines = parseSyncedLyric(lyric);
  const activeIndex = getActiveLyricIndex(lines, currentTime);

  if (activeIndex >= 0) {
    return lines[activeIndex].text;
  }

  return lines.find((line) => line.time === null)?.text ?? "";
}

export function MusicLyricPanel({
  currentTime,
  duration,
  lyric,
  lyricSource,
  onSeekTime,
}: MusicLyricPanelProps) {
  const lineRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const lines = useMemo(() => parseSyncedLyric(lyric), [lyric]);
  const activeIndex = useMemo(
    () => getActiveLyricIndex(lines, currentTime),
    [currentTime, lines],
  );
  const hasSyncedLines = lines.some((line) => line.time !== null);

  useEffect(() => {
    const activeLine = lineRefs.current[activeIndex];

    activeLine?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [activeIndex]);

  if (lines.length === 0) {
    return (
      <div className="absolute bottom-12 right-0 z-30 w-80 rounded-3xl border border-slate-200 bg-white/95 p-5 text-sm font-bold text-slate-500 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-slate-900/95 dark:text-slate-300">
        当前音源和其它已启用音源都没有返回歌词。
      </div>
    );
  }

  return (
    <div className="absolute bottom-12 right-0 z-30 w-[420px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-950 dark:text-white">
            同步歌词
          </p>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {hasSyncedLines ? "自动跟随播放，点击歌词可跳转" : "该歌词没有时间轴"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {lyricSource ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500 dark:bg-white/10 dark:text-slate-300">
              来源 {pluginProviderLabels[lyricSource]}
            </span>
          ) : null}
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-600 dark:text-emerald-300">
            {formatTime(currentTime)}
          </span>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto px-3 py-4 [scrollbar-width:thin]">
        <div className="space-y-1 py-12">
          {lines.map((line, index) => {
            const active = index === activeIndex;
            const seekable = line.time !== null && duration > 0 && Boolean(onSeekTime);

            return (
              <button
                className={cn(
                  "grid w-full grid-cols-[44px_minmax(0,1fr)] items-start gap-3 rounded-2xl px-3 py-2 text-left transition duration-300",
                  seekable && "hover:bg-slate-100 dark:hover:bg-white/8",
                  active
                    ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/12 dark:text-emerald-200"
                    : "text-slate-500 dark:text-slate-400",
                  index < activeIndex && !active && "opacity-55",
                )}
                disabled={!seekable}
                key={line.id}
                ref={(node) => {
                  lineRefs.current[index] = node;
                }}
                type="button"
                onClick={() => {
                  if (line.time !== null) onSeekTime?.(line.time);
                }}
              >
                <span
                  className={cn(
                    "pt-0.5 text-[10px] font-black tabular-nums",
                    active ? "text-emerald-500" : "text-slate-400",
                  )}
                >
                  {line.time !== null ? formatTime(line.time) : "--:--"}
                </span>
                <span
                  className={cn(
                    "min-w-0 text-sm font-semibold leading-6",
                    active && "text-base font-black",
                  )}
                >
                  {line.text}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
