"use client";

import { MoonStar, SunMedium } from "lucide-react";

import { useBlogTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
  transparent?: boolean;
};

export function ThemeToggle({ className, transparent = false }: ThemeToggleProps) {
  const { toggleTheme } = useBlogTheme();

  return (
    <button
      type="button"
      aria-label="切换明暗模式"
      title="切换昼夜模式"
      onClick={toggleTheme}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full border transition duration-200",
        transparent
          ? "border-white/30 bg-white/16 text-white backdrop-blur-md hover:bg-white/28"
          : "border-slate-200/80 bg-white/80 text-slate-700 hover:border-accent-300 hover:text-accent-600 dark:border-white/12 dark:bg-white/8 dark:text-slate-200 dark:hover:border-accent-400/40 dark:hover:text-accent-200",
        className,
      )}
    >
      <MoonStar className="size-4 dark:hidden" />
      <SunMedium className="hidden size-4 dark:block" />
    </button>
  );
}
