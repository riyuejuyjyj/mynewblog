"use client";

import { CalendarRange } from "lucide-react";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

type WritingHeatmapProps = {
  dates: string[];
  weeks?: number;
  className?: string;
};

function toDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getLevelClass(count: number) {
  if (count <= 0) {
    return "bg-slate-200/75 dark:bg-white/[0.06]";
  }
  if (count === 1) {
    return "bg-accent-200 dark:bg-accent-500/35";
  }
  if (count === 2) {
    return "bg-accent-400 dark:bg-accent-500/65";
  }
  return "bg-accent-500 dark:bg-accent-400";
}

export function WritingHeatmap({
  className,
  dates,
  weeks = 15,
}: WritingHeatmapProps) {
  const { columns, totalEntries, activeDays, rangeLabel } = useMemo(() => {
    const countsByDay = new Map<string, number>();
    let latestEntryDate: Date | null = null;

    for (const raw of dates) {
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) continue;
      parsed.setHours(0, 0, 0, 0);
      const key = toDayKey(parsed);
      countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
      if (!latestEntryDate || parsed.getTime() > latestEntryDate.getTime()) {
        latestEntryDate = parsed;
      }
    }

    const totalDays = weeks * 7;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    function buildWindow(endDate: Date) {
      const start = new Date(endDate);
      start.setDate(endDate.getDate() - (totalDays - 1));

      const cols: Array<Array<{ count: number; key: string }>> = [];
      let countActiveDays = 0;

      for (let week = 0; week < weeks; week += 1) {
        const col: Array<{ count: number; key: string }> = [];

        for (let day = 0; day < 7; day += 1) {
          const cursor = new Date(start);
          cursor.setDate(start.getDate() + week * 7 + day);
          const key = toDayKey(cursor);
          const count = countsByDay.get(key) ?? 0;

          if (count > 0) countActiveDays += 1;
          col.push({ count, key });
        }

        cols.push(col);
      }

      return { cols, countActiveDays };
    }

    let windowData = buildWindow(today);
    let label = `近 ${weeks} 周`;

    // If recent window has no entries yet (e.g. archival/demo dates), frame the latest active period
    if (windowData.countActiveDays === 0 && latestEntryDate) {
      const paddedEnd = new Date(latestEntryDate);
      paddedEnd.setDate(paddedEnd.getDate() + 14);
      const anchorEnd =
        paddedEnd.getTime() < today.getTime() ? paddedEnd : today;
      windowData = buildWindow(anchorEnd);
      const year = latestEntryDate.getFullYear();
      const month = String(latestEntryDate.getMonth() + 1).padStart(2, "0");
      label = `${year}/${month} 活跃期`;
    }

    return {
      activeDays: windowData.countActiveDays,
      columns: windowData.cols,
      rangeLabel: label,
      totalEntries: dates.length,
    };
  }, [dates, weeks]);

  return (
    <section className={cn("anime-card p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <CalendarRange className="size-4 text-accent-500" />
          写作日历
        </h3>
        <span className="font-mono text-[11px] text-slate-400">
          {rangeLabel} · {activeDays} 天活跃
        </span>
      </div>

      <div className="mt-3.5 overflow-x-auto pb-1">
        <div className="inline-flex gap-1">
          {columns.map((column, colIndex) => (
            <div key={colIndex} className="grid grid-rows-7 gap-1">
              {column.map((cell) => (
                <span
                  key={cell.key}
                  title={`${cell.key} · ${cell.count > 0 ? `${cell.count} 条创作记录` : "休息日"}`}
                  className={cn(
                    "size-3 rounded-[3px] transition-transform duration-150 hover:scale-125",
                    getLevelClass(cell.count),
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
        <span>累计 {totalEntries} 条公开记录</span>
        <span className="inline-flex items-center gap-1">
          少
          <span className="size-2.5 rounded-[2px] bg-slate-200/75 dark:bg-white/[0.06]" />
          <span className="size-2.5 rounded-[2px] bg-accent-200 dark:bg-accent-500/35" />
          <span className="size-2.5 rounded-[2px] bg-accent-400 dark:bg-accent-500/65" />
          <span className="size-2.5 rounded-[2px] bg-accent-500 dark:bg-accent-400" />
          多
        </span>
      </div>
    </section>
  );
}
