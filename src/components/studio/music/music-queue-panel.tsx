"use client";

/* eslint-disable @next/next/no-img-element */

import { AnimatePresence, motion } from "motion/react";
import { Music2, Play } from "lucide-react";

import type { StudioMusicQueueItem } from "@/components/studio/types";
import { cn } from "@/lib/utils";

type MusicQueuePanelProps = {
  currentKey: string;
  items: StudioMusicQueueItem[];
  open: boolean;
  onPlay: (item: StudioMusicQueueItem) => void;
};

const fallbackCover =
  "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=900&q=80";

export function MusicQueuePanel({
  currentKey,
  items,
  open,
  onPlay,
}: MusicQueuePanelProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute bottom-12 right-0 z-30 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white/96 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-slate-900/96"
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.18 }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10">
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-950 dark:text-white">
                Play Queue
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {items.length} tracks in current context
              </p>
            </div>
            <Music2 className="size-4 text-emerald-500" />
          </div>

          <div className="max-h-96 overflow-y-auto p-2 [scrollbar-width:thin]">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
                No queue yet.
              </p>
            ) : null}
            {items.map((item, index) => {
              const active = item.key === currentKey;

              return (
                <button
                  className={cn(
                    "group grid w-full grid-cols-[34px_44px_minmax(0,1fr)] items-center gap-3 rounded-2xl px-3 py-2 text-left transition",
                    active
                      ? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/12 dark:text-emerald-100"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/8",
                  )}
                  key={`${item.key}-${index}`}
                  type="button"
                  onClick={() => onPlay(item)}
                >
                  <span className="text-center text-xs font-black tabular-nums text-slate-400">
                    {active ? <Play className="mx-auto size-3" /> : index + 1}
                  </span>
                  <img
                    alt={item.title}
                    className="size-11 rounded-xl object-cover"
                    src={item.coverUrl || fallbackCover}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs font-semibold opacity-70">
                      {item.artist || "Unknown"} / {item.sourceLabel}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
