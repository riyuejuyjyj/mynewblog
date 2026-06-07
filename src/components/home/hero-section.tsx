"use client";

import { BookOpen, Lock, PenLine, Radio, User } from "lucide-react";
import Image from "next/image";

import type { HomeCopy } from "@/components/home/copy";
import { HoverLift, Reveal } from "@/components/home/motion-primitives";
import type { DashboardData, DisplayPost } from "@/components/home/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { profile } from "@/content/seed";

type HeroSectionProps = {
  dashboard: DashboardData;
  featured: DisplayPost;
  t: HomeCopy;
};

function compactNumber(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function HeroSection({ dashboard, featured, t }: HeroSectionProps) {
  const heroBadges = [featured.category, ...featured.tags.slice(0, 3)];
  const currentThemes = [featured.category, ...featured.tags].slice(0, 5);

  return (
    <section className="relative z-10 mx-auto mt-8 grid w-full max-w-7xl grid-cols-1 gap-6 lg:grid-cols-12">
      <Reveal className="lg:col-span-7">
        <div className="glass-panel min-h-[520px] overflow-hidden p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            {heroBadges.map((badge) => (
              <Badge key={badge}>{badge}</Badge>
            ))}
          </div>

          <div className="mt-16 max-w-2xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-coral-100/80 px-4 py-2 text-sm font-bold text-coral-950 shadow-sm dark:bg-coral-400/15 dark:text-coral-100">
              <Radio className="size-4" />
              {t.heroKicker}
            </p>
            <h1 className="text-4xl font-black leading-[1.08] tracking-[0] text-slate-950 dark:text-white sm:text-5xl lg:text-6xl">
              {t.heroTitle}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-700 dark:text-slate-200 sm:text-lg">
              {t.heroBio}
            </p>
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <a href="#posts">
                <BookOpen className="size-4" />
                {t.readLatest}
              </a>
            </Button>
            <Button asChild variant="glass">
              <a href="/studio">
                <Lock className="size-4" />
                {t.studioPreview}
              </a>
            </Button>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [t.metrics[0], dashboard.postCount],
              [t.metrics[1], dashboard.momentCount],
              [t.metrics[2], compactNumber(dashboard.totalViews)],
              [t.metrics[3], dashboard.commentCount],
            ].map(([label, value]) => (
              <HoverLift
                key={label}
                className="rounded-2xl border border-white/45 bg-white/35 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/10"
              >
                <div className="text-2xl font-black tracking-[0]">{value}</div>
                <div className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {label}
                </div>
              </HoverLift>
            ))}
          </div>
        </div>
      </Reveal>

      <aside className="grid gap-6 lg:col-span-5">
        <Reveal delay={0.08}>
          <HoverLift className="glass-panel p-5">
            <div className="flex items-center gap-4">
              <Image
                src={profile.avatar}
                alt={profile.name}
                width={160}
                height={160}
                className="size-20 rounded-3xl object-cover shadow-xl shadow-slate-900/20"
              />
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500 dark:text-slate-300">
                  <User className="size-4" />
                  {t.author}
                </div>
                <h2 className="mt-1 text-2xl font-black tracking-[0]">
                  {profile.name}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {t.authorBio}
                </p>
              </div>
            </div>
          </HoverLift>
        </Reveal>

        <Reveal delay={0.14}>
          <HoverLift className="glass-panel overflow-hidden">
            <div className="relative min-h-[260px]">
              <Image
                src={featured.coverImage}
                alt={featured.title}
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="absolute inset-0 size-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <Badge className="border-white/30 bg-white/20 text-white">
                  {t.featured}
                </Badge>
                <h2 className="mt-4 text-3xl font-black leading-tight tracking-[0]">
                  {featured.title}
                </h2>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/85">
                  {featured.excerpt}
                </p>
              </div>
            </div>
          </HoverLift>
        </Reveal>

        <Reveal delay={0.2}>
          <HoverLift className="glass-panel p-5" id="studio">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-300">
                  {t.studioStack}
                </p>
                <h2 className="mt-1 text-xl font-black tracking-[0]">
                  {t.studioTitle}
                </h2>
              </div>
              <PenLine className="size-8 text-emerald-500" />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {currentThemes.map((item) => (
                <Badge key={item}>{item}</Badge>
              ))}
            </div>
          </HoverLift>
        </Reveal>
      </aside>
    </section>
  );
}
