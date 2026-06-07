"use client";

import {
  Languages,
  MoonStar,
  Sparkles,
  SunMedium,
} from "lucide-react";

import type { AmbientMode, Locale } from "@/components/home/types";
import type { HomeCopy } from "@/components/home/copy";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { navItems, profile } from "@/content/seed";

type HomeNavProps = {
  ambientMode: AmbientMode;
  locale: Locale;
  t: HomeCopy;
  onAmbientToggle: () => void;
  onLocaleToggle: () => void;
};

export function HomeNav({
  ambientMode,
  locale,
  t,
  onAmbientToggle,
  onLocaleToggle,
}: HomeNavProps) {
  const localizedNav = navItems.map((item, index) => ({
    ...item,
    label: t.nav[index] ?? item.label,
  }));

  return (
    <nav className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between rounded-full border border-white/45 bg-white/35 px-4 py-3 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/30">
      <a href="#" className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-full bg-slate-950 text-white shadow-lg shadow-slate-950/20 dark:bg-white dark:text-slate-950">
          <Sparkles className="size-5" />
        </span>
        <span className="hidden flex-col sm:flex">
          <span className="text-sm font-black tracking-[0]">{profile.name}</span>
          <span className="text-xs text-slate-600 dark:text-slate-300">
            {profile.handle}
          </span>
        </span>
      </a>

      <div className="hidden items-center gap-1 md:flex">
        {localizedNav.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white/45 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
          >
            {item.label}
          </a>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="glass"
          size="icon"
          title={t.language}
          aria-label={t.language}
          onClick={onLocaleToggle}
        >
          <Languages className="size-4" />
          <span className="sr-only">{locale}</span>
        </Button>
        <Button
          type="button"
          variant="glass"
          size="icon"
          title={t.ambient}
          aria-label={t.ambient}
          onClick={onAmbientToggle}
        >
          {ambientMode === "day" ? (
            <MoonStar className="size-4" />
          ) : (
            <SunMedium className="size-4" />
          )}
        </Button>
        <ThemeToggle />
      </div>
    </nav>
  );
}
