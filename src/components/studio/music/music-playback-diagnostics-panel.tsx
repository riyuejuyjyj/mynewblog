"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  Info,
  Radio,
  RotateCcw,
  Route,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatTime,
  getPlaybackSourceToneClass,
  type MusicPlaybackSourceStatus,
} from "./music-model";

export type MusicPlaybackDiagnostics = {
  audioState: string;
  cacheState: string;
  currentKey: string;
  currentQueueKey: string;
  currentTime: number;
  duration: number;
  events: MusicPlaybackDiagnosticEvent[];
  fallbackState: string;
  lastError: string;
  lastMessage: string;
  queuePosition: string;
  resolvedState: string;
  runtimeHealthDetails: MusicRuntimeSourceHealthDetail[];
  runtimeHealthState: string;
  sourceStatus?: MusicPlaybackSourceStatus | null;
  volume: number;
};

export type MusicRuntimeSourceHealthDetail = {
  failures: number;
  label: string;
  lastReason: string;
  penalty: number;
  successes: number;
  updatedAt: string;
};

export type MusicPlaybackDiagnosticEvent = {
  detail: string;
  id: string;
  itemKey: string;
  time: string;
  title: string;
  tone: "error" | "info" | "success" | "warning";
};

type MusicPlaybackDiagnosticsPanelProps = {
  diagnostics: MusicPlaybackDiagnostics;
  onResetRuntimeHealth?: () => void;
  open: boolean;
};

function DiagnosticRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[84px_minmax(0,1fr)] gap-3 rounded-2xl bg-slate-100/80 px-3 py-2 dark:bg-white/8">
      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </span>
      <span className="min-w-0 truncate text-right text-xs font-bold text-slate-700 dark:text-slate-200">
        {value || "-"}
      </span>
    </div>
  );
}

export function MusicPlaybackDiagnosticsPanel({
  diagnostics,
  onResetRuntimeHealth,
  open,
}: MusicPlaybackDiagnosticsPanelProps) {
  const sourceStatus = diagnostics.sourceStatus;
  const hasProblem = Boolean(diagnostics.lastError);
  const recentEvents = diagnostics.events.slice(0, 5);
  const healthDetails = diagnostics.runtimeHealthDetails.slice(0, 4);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute bottom-12 right-0 z-30 w-[410px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white/96 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-slate-900/96"
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.18 }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10">
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-950 dark:text-white">
                播放诊断
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                只读状态，用来定位换源、缓存和队列问题
              </p>
            </div>
            {hasProblem ? (
              <AlertTriangle className="size-4 text-amber-500" />
            ) : (
              <CheckCircle2 className="size-4 text-emerald-500" />
            )}
          </div>

          <div className="space-y-3 p-3">
            {sourceStatus ? (
              <div
                className={cn(
                  "rounded-2xl border px-3 py-2 text-xs font-bold",
                  getPlaybackSourceToneClass(sourceStatus.tone),
                )}
                title={sourceStatus.detail}
              >
                <div className="flex items-center gap-2">
                  <Radio className="size-3.5 shrink-0" />
                  <span className="truncate">{sourceStatus.label}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] font-semibold opacity-80">
                  {sourceStatus.detail}
                </p>
              </div>
            ) : null}

            <div className="grid gap-2">
              <DiagnosticRow label="Audio" value={diagnostics.audioState} />
              <DiagnosticRow label="Queue" value={diagnostics.queuePosition} />
              <DiagnosticRow label="Cache" value={diagnostics.cacheState} />
              <DiagnosticRow label="URL" value={diagnostics.resolvedState} />
              <DiagnosticRow
                label="Health"
                value={diagnostics.runtimeHealthState}
              />
              {onResetRuntimeHealth ? (
                <Button
                  className="h-9 justify-center rounded-2xl text-xs font-black"
                  disabled={diagnostics.runtimeHealthState === "all clear"}
                  size="sm"
                  type="button"
                  variant="soft"
                  onClick={onResetRuntimeHealth}
                >
                  <RotateCcw className="mr-2 size-3.5" />
                  重置音源健康
                </Button>
              ) : null}
              <DiagnosticRow
                label="Time"
                value={`${formatTime(diagnostics.currentTime)} / ${
                  diagnostics.duration ? formatTime(diagnostics.duration) : "--:--"
                }`}
              />
              <DiagnosticRow label="Volume" value={`${diagnostics.volume}%`} />
            </div>

            {healthDetails.length > 0 ? (
              <div className="grid gap-2 rounded-2xl border border-slate-200/80 p-3 dark:border-white/10">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                  <Radio className="size-3.5" />
                  Source Health
                </div>
                <div className="grid gap-2">
                  {healthDetails.map((source) => (
                    <div
                      className="rounded-2xl bg-slate-100/80 px-3 py-2 dark:bg-white/8"
                      key={source.label}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-xs font-black text-slate-700 dark:text-slate-100">
                          {source.label}
                        </span>
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:bg-amber-400/15 dark:text-amber-100">
                          -{source.penalty}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        成功 {source.successes} / 失败 {source.failures} /{" "}
                        {source.lastReason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-2 rounded-2xl border border-slate-200/80 p-3 dark:border-white/10">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                <Route className="size-3.5" />
                Keys
              </div>
              <p className="truncate text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                item: {diagnostics.currentKey || "-"}
              </p>
              <p className="truncate text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                queue: {diagnostics.currentQueueKey || "-"}
              </p>
            </div>

            <div className="grid gap-2 rounded-2xl border border-slate-200/80 p-3 dark:border-white/10">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                <HardDrive className="size-3.5" />
                Context
              </div>
              <p className="truncate text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                fallback: {diagnostics.fallbackState}
              </p>
              {diagnostics.lastMessage ? (
                <p className="line-clamp-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  message: {diagnostics.lastMessage}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2 rounded-2xl border border-slate-200/80 p-3 dark:border-white/10">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                <Activity className="size-3.5" />
                Events
              </div>
              {recentEvents.length === 0 ? (
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  暂无播放事件。
                </p>
              ) : (
                <div className="grid gap-2">
                  {recentEvents.map((event) => (
                    <div
                      className="grid grid-cols-[6px_minmax(0,1fr)] gap-2"
                      key={event.id}
                    >
                      <span
                        className={cn(
                          "mt-1.5 h-full min-h-8 rounded-full",
                          event.tone === "error" && "bg-rose-400",
                          event.tone === "warning" && "bg-amber-400",
                          event.tone === "success" && "bg-emerald-400",
                          event.tone === "info" && "bg-sky-400",
                        )}
                      />
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <p className="truncate text-[11px] font-black text-slate-700 dark:text-slate-100">
                            {event.title}
                          </p>
                          <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                            {event.time}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {event.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {diagnostics.lastError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700 dark:border-amber-300/30 dark:bg-amber-400/12 dark:text-amber-100">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  <span>最近错误</span>
                </div>
                <p className="mt-1 line-clamp-3 font-semibold opacity-90">
                  {diagnostics.lastError}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700 dark:bg-emerald-400/12 dark:text-emerald-100">
                <Activity className="size-3.5" />
                当前没有播放错误记录
              </div>
            )}

            <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400">
              <Info className="size-3.5" />
              播放失败时先看 Cache、URL 和 fallback 三项。
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
