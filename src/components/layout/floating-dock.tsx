"use client";

import { ArrowUp, Disc3, Pause, Play, SkipForward } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";

export function FloatingDock() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);
  const [playerExpanded, setPlayerExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playlistQuery = trpc.music.playlist.useQuery(
    { includeDisabled: false, limit: 20 },
    {
      staleTime: 1000 * 60 * 10,
      retry: false,
    },
  );

  const playableTracks = useMemo(
    () =>
      (playlistQuery.data ?? []).filter(
        (track) => track.enabled && Boolean(track.audioUrl?.trim()),
      ),
    [playlistQuery.data],
  );

  const activeTrack =
    playableTracks.length > 0
      ? playableTracks[trackIndex % playableTracks.length]
      : null;

  useEffect(() => {
    function updateScroll() {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const ratio = docHeight > 0 ? Math.min(1, Math.max(0, scrollTop / docHeight)) : 0;

      setScrollProgress(ratio);
      setShowTop(scrollTop > 220);
    }

    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    return () => window.removeEventListener("scroll", updateScroll);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;

    if (audio.src !== activeTrack.audioUrl) {
      audio.src = activeTrack.audioUrl;
    }

    if (playing) {
      void audio.play().catch(() => {
        setPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [activeTrack, playing]);

  function togglePlayback() {
    if (!activeTrack) return;
    setPlayerExpanded(true);
    setPlaying((current) => !current);
  }

  function playNext() {
    if (playableTracks.length <= 1) return;
    setTrackIndex((current) => (current + 1) % playableTracks.length);
    setPlaying(true);
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const radius = 17;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - scrollProgress);
  const progressPercent = Math.round(scrollProgress * 100);

  return (
    <div className="fixed bottom-5 right-4 z-40 flex flex-col items-end gap-2.5 sm:bottom-6 sm:right-6">
      <audio
        ref={audioRef}
        preload="none"
        onEnded={playNext}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />

      {/* Optional Mini BGM Capsule linked to enabled Studio tracks */}
      {activeTrack ? (
        <div
          className={cn(
            "anime-glass flex items-center gap-2 rounded-full transition-all duration-300",
            playerExpanded ? "px-3 py-1.5" : "p-1",
          )}
        >
          <button
            type="button"
            aria-label={playing ? "暂停背景音乐" : "播放背景音乐"}
            title={`书房 BGM：${activeTrack.title} - ${activeTrack.artist}`}
            onClick={togglePlayback}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent-500 to-sky-400 text-white shadow-sm transition hover:scale-105"
          >
            {playing ? (
              <Disc3 className="animate-vinyl-spin size-4" />
            ) : (
              <Play className="ml-0.5 size-4" />
            )}
          </button>

          {playerExpanded ? (
            <div className="flex items-center gap-2 pr-1">
              <div className="max-w-[128px] text-left">
                <p className="truncate text-xs font-semibold leading-tight text-slate-900 dark:text-white">
                  {activeTrack.title}
                </p>
                <p className="truncate text-[10px] text-slate-400">
                  {activeTrack.artist}
                </p>
              </div>
              <button
                type="button"
                aria-label={playing ? "暂停" : "播放"}
                onClick={togglePlayback}
                className="grid size-7 place-items-center rounded-full text-slate-600 transition hover:bg-accent-50 hover:text-accent-600 dark:text-slate-300 dark:hover:bg-white/10"
              >
                {playing ? (
                  <Pause className="size-3.5" />
                ) : (
                  <Play className="size-3.5" />
                )}
              </button>
              {playableTracks.length > 1 ? (
                <button
                  type="button"
                  aria-label="下一首"
                  onClick={playNext}
                  className="grid size-7 place-items-center rounded-full text-slate-600 transition hover:bg-accent-50 hover:text-accent-600 dark:text-slate-300 dark:hover:bg-white/10"
                >
                  <SkipForward className="size-3.5" />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Back-to-top button with live circular reading progress ring */}
      {showTop ? (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label={`回到顶部（已阅读 ${progressPercent}%）`}
          title={`回到顶部 · ${progressPercent}%`}
          className="anime-glass group relative grid size-11 place-items-center rounded-full text-slate-700 transition hover:-translate-y-0.5 hover:text-accent-600 dark:text-slate-200 dark:hover:text-accent-300"
        >
          <svg
            className="pointer-events-none absolute inset-0 size-11 -rotate-90"
            viewBox="0 0 44 44"
          >
            <circle
              cx="22"
              cy="22"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.12"
              strokeWidth="2.5"
            />
            <circle
              cx="22"
              cy="22"
              r={radius}
              fill="none"
              stroke="var(--accent-500)"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              strokeWidth="2.5"
            />
          </svg>
          <ArrowUp className="size-4 transition-transform group-hover:-translate-y-0.5" />
        </button>
      ) : null}
    </div>
  );
}
