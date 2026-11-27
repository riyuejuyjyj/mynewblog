import {
  BookOpen,
  Code2,
  Compass,
  HeartHandshake,
  MapPin,
  MessageCircle,
  PenLine,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { WritingHeatmap } from "@/components/home/writing-heatmap";
import { FloatingDock } from "@/components/layout/floating-dock";
import { HeroWaves } from "@/components/layout/hero-waves";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { blogConfig } from "@/config/site";
import {
  getPublicDashboard,
  getPublishedMoments,
  getPublishedPosts,
} from "@/lib/blog-data";
import { siteConfig } from "@/lib/site-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: {
    canonical: "/about",
  },
  description: `关于 ${blogConfig.brandPrefix}${blogConfig.brandConnector}${blogConfig.brandSuffix}：站点理念、个人兴趣、技术栈与创作热力图。`,
  openGraph: {
    description: `关于 ${blogConfig.brandPrefix}${blogConfig.brandConnector}${blogConfig.brandSuffix}：站点理念、个人兴趣、技术栈与创作热力图。`,
    locale: siteConfig.locale,
    siteName: siteConfig.name,
    title: "关于",
    type: "website",
    url: "/about",
  },
  title: "关于",
  twitter: {
    card: "summary_large_image",
    description: `关于 ${blogConfig.brandPrefix}${blogConfig.brandConnector}${blogConfig.brandSuffix}：站点理念、个人兴趣、技术栈与创作热力图。`,
    title: "关于",
  },
};

export default async function AboutPage() {
  const [dashboard, posts, moments] = await Promise.all([
    getPublicDashboard(),
    getPublishedPosts(60),
    getPublishedMoments(20),
  ]);

  const activityDates = [
    ...posts.map((post) => post.publishedAt),
    ...moments.map((moment) => moment.createdAt),
  ];

  const stats = [
    { label: "公开文章", value: dashboard.postCount },
    { label: "生活碎片", value: dashboard.momentCount },
    { label: "收到评论", value: dashboard.commentCount },
    { label: "累计阅读", value: dashboard.totalViews },
  ];

  const hobbyIcons = [Code2, Sparkles, Compass] as const;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <SiteHeader overlayHero />

      {/* Compact dual-scene anime hero banner */}
      <section className="relative flex h-[40svh] min-h-[280px] max-h-[380px] items-center justify-center overflow-hidden">
        <Image
          alt="晴空书房日间插画"
          className="object-cover object-center transition-opacity duration-700 dark:opacity-0"
          fill
          priority
          sizes="100vw"
          src={blogConfig.images.heroDay}
        />
        <Image
          alt="晴空书房夜景插画"
          className="object-cover object-center opacity-0 transition-opacity duration-700 dark:opacity-100"
          fill
          priority
          sizes="100vw"
          src={blogConfig.images.heroNight}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/55 via-slate-950/32 to-slate-950/60" />

        <div className="relative z-10 mx-auto max-w-3xl px-5 pt-10 text-center text-white">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/28 bg-white/14 px-3.5 py-1 text-xs font-medium backdrop-blur-md">
            <UserRound className="size-3.5 text-sky-200" />
            <span>关于这座书房</span>
          </div>
          <h1 className="mt-3.5 font-serif text-3xl font-bold tracking-tight drop-shadow sm:text-4xl">
            {blogConfig.brandPrefix}
            <span className="mx-1 font-normal text-pink-200">
              {blogConfig.brandConnector}
            </span>
            {blogConfig.brandSuffix}
          </h1>
          <p className="mx-auto mt-2.5 max-w-xl text-balance text-sm leading-relaxed text-white/88 sm:text-base">
            {blogConfig.bio}
          </p>
        </div>

        <HeroWaves />
      </section>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
        {/* Author spotlight card */}
        <section className="anime-card relative overflow-hidden p-6 sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="relative mx-auto shrink-0 md:mx-0">
              <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-accent-400/50 via-sky-300/45 to-pink-300/50 blur-sm" />
              <Image
                alt={blogConfig.author}
                className="relative size-28 rounded-full object-cover ring-4 ring-white dark:ring-slate-900 sm:size-32"
                height={128}
                src={blogConfig.images.avatar}
                width={128}
              />
            </div>

            <div className="flex-1 space-y-3 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-white">
                  {blogConfig.about.greeting}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2.5 py-0.5 text-xs font-medium text-accent-700 dark:bg-accent-500/18 dark:text-accent-200">
                  <MapPin className="size-3" />
                  {blogConfig.location}
                </span>
                <span className="rounded-full bg-surface-muted px-2.5 py-0.5 font-mono text-xs text-slate-500 dark:bg-white/8 dark:text-slate-300">
                  Since {blogConfig.foundedYear}
                </span>
              </div>

              <p className="text-sm font-medium text-accent-600 dark:text-accent-300">
                {blogConfig.authorRole}
              </p>

              <div className="space-y-2.5 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {blogConfig.about.intro.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 border-t border-slate-200/75 pt-6 dark:border-white/10 sm:grid-cols-4">
            {stats.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl bg-surface-muted/75 px-4 py-3 text-center dark:bg-white/[0.04]"
              >
                <div className="font-mono text-2xl font-bold text-slate-900 dark:text-white">
                  {item.value}
                </div>
                <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Hobbies / Interest grid */}
        <section className="grid gap-4 md:grid-cols-3">
          {blogConfig.about.hobbies.map((hobby, index) => {
            const Icon = hobbyIcons[index % hobbyIcons.length] ?? Sparkles;

            return (
              <article
                key={hobby.title}
                className="anime-card flex flex-col gap-3 p-5 transition duration-300 hover:-translate-y-0.5"
              >
                <div className="grid size-10 place-items-center rounded-2xl bg-accent-50 text-accent-600 dark:bg-accent-500/18 dark:text-accent-300">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {hobby.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {hobby.detail}
                </p>
              </article>
            );
          })}
        </section>

        {/* Wider writing activity heatmap */}
        <WritingHeatmap dates={activityDates} weeks={24} />

        {/* Tech stack & quick portal */}
        <section className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <div className="anime-card p-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <Code2 className="size-4 text-accent-500" />
              构建这座书房的技术栈
            </h2>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              兼顾全栈动态能力、边缘低延迟与二次元轻快微交互。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {blogConfig.about.techStack.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-accent-200/75 bg-accent-50/75 px-3 py-1 text-xs font-medium text-accent-700 dark:border-accent-400/25 dark:bg-accent-500/12 dark:text-accent-200"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="anime-card flex flex-col justify-between gap-4 p-6">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <MessageCircle className="size-4 text-accent-500" />
                站内传送门
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                想翻看所有文章归档、互换友链，或前往后台创作室管理文章与曲库？
              </p>
            </div>

            <div className="grid gap-2">
              <Link
                href="/posts"
                className="flex items-center justify-between rounded-2xl bg-surface-muted/85 px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-accent-50 hover:text-accent-700 dark:bg-white/[0.05] dark:text-slate-100 dark:hover:bg-accent-500/18 dark:hover:text-accent-200"
              >
                <span className="inline-flex items-center gap-2">
                  <BookOpen className="size-4 text-accent-500" />
                  浏览全部文章归档
                </span>
                <span className="text-xs opacity-60">→</span>
              </Link>
              <Link
                href="/friends"
                className="flex items-center justify-between rounded-2xl bg-surface-muted/85 px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-accent-50 hover:text-accent-700 dark:bg-white/[0.05] dark:text-slate-100 dark:hover:bg-accent-500/18 dark:hover:text-accent-200"
              >
                <span className="inline-flex items-center gap-2">
                  <HeartHandshake className="size-4 text-accent-500" />
                  逛逛同好友人帐
                </span>
                <span className="text-xs opacity-60">→</span>
              </Link>
              <Link
                href="/studio"
                className="flex items-center justify-between rounded-2xl bg-surface-muted/85 px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-accent-50 hover:text-accent-700 dark:bg-white/[0.05] dark:text-slate-100 dark:hover:bg-accent-500/18 dark:hover:text-accent-200"
              >
                <span className="inline-flex items-center gap-2">
                  <PenLine className="size-4 text-accent-500" />
                  进入 Studio 创作室
                </span>
                <span className="text-xs opacity-60">→</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <FloatingDock />
      <SiteFooter />
    </div>
  );
}
