"use client";

import {
  ArrowUpRight,
  Check,
  Copy,
  HeartHandshake,
  Mail,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { FloatingDock } from "@/components/layout/floating-dock";
import { HeroWaves } from "@/components/layout/hero-waves";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { blogConfig } from "@/config/site";

export function FriendsPageContent() {
  const [copied, setCopied] = useState(false);

  const siteCardText = [
    `名称：${blogConfig.brandPrefix}${blogConfig.brandConnector}${blogConfig.brandSuffix}`,
    `链接：${blogConfig.url}`,
    `简介：${blogConfig.heroQuotes[0]}`,
    `头像：${blogConfig.url}${blogConfig.images.avatar}`,
  ].join("\n");

  async function handleCopyCard() {
    try {
      await navigator.clipboard.writeText(siteCardText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const totalFriends = blogConfig.friendGroups.reduce(
    (sum, group) => sum + group.items.length,
    0,
  );

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <SiteHeader overlayHero />

      {/* Compact anime illustration hero banner */}
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
            <HeartHandshake className="size-3.5 text-pink-200" />
            <span>友人帐 · 共收录 {totalFriends} 处站点</span>
          </div>
          <h1 className="mt-3.5 font-serif text-3xl font-bold tracking-tight drop-shadow sm:text-4xl">
            同好与灵感友人帐
          </h1>
          <p className="mx-auto mt-2.5 max-w-xl text-balance text-sm leading-relaxed text-white/88 sm:text-base">
            记录激发晴空书房视觉巧思的开源主题，以及路上遇见的值得收藏的独立角落。
          </p>
        </div>

        <HeroWaves />
      </section>

      <main className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6 sm:py-14">
        {blogConfig.friendGroups.map((group) => (
          <section key={group.title} className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-200/75 pb-3 dark:border-white/10">
              <div>
                <h2 className="flex items-center gap-2 font-serif text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                  <Sparkles className="size-4 text-accent-500" />
                  {group.title}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {group.subtitle}
                </p>
              </div>
              <span className="rounded-full bg-accent-50 px-3 py-1 font-mono text-xs font-medium text-accent-700 dark:bg-accent-500/15 dark:text-accent-200">
                {group.items.length} 位
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((friend) => (
                <a
                  key={`${group.title}-${friend.name}`}
                  href={friend.url}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="anime-card group relative flex items-start gap-4 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-accent-300/80 dark:hover:border-accent-400/40"
                >
                  <div className="relative shrink-0">
                    <Image
                      alt={friend.name}
                      className="size-14 rounded-full object-cover ring-2 ring-accent-200/80 transition-transform duration-500 ease-out group-hover:rotate-[360deg] dark:ring-accent-400/35"
                      height={56}
                      src={friend.avatar}
                      unoptimized
                      width={56}
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white bg-emerald-400 dark:border-slate-900" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate text-base font-bold text-slate-900 transition-colors group-hover:text-accent-600 dark:text-white dark:group-hover:text-accent-300">
                        {friend.name}
                      </h3>
                      <ArrowUpRight className="size-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-500" />
                    </div>

                    <span className="mt-1 inline-block rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-accent-600 dark:bg-white/8 dark:text-accent-300">
                      {friend.tag}
                    </span>

                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {friend.description}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        ))}

        {/* Exchange link card */}
        <section className="anime-card overflow-hidden p-6 sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xl space-y-2.5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700 dark:bg-accent-500/18 dark:text-accent-200">
                <Mail className="size-3.5" />
                <span>交换友链</span>
              </div>
              <h2 className="font-serif text-xl font-bold text-slate-900 dark:text-white">
                想把你的小站放进友人帐吗？
              </h2>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                欢迎热爱写作、技术、设计与二次元美学的独立博客互换友链。你可以先复制下方本站名片，再在任意文章的评论区留下你的站点名称、地址、头像与一句话简介。
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleCopyCard()}
              className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full bg-gradient-to-r from-accent-500 to-sky-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-accent-500/25 transition hover:scale-[1.02] active:scale-[0.98]"
            >
              {copied ? (
                <>
                  <Check className="size-4" />
                  <span>已复制本站名片</span>
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  <span>复制本站信息</span>
                </>
              )}
            </button>
          </div>

          <pre className="mt-5 overflow-x-auto rounded-2xl border border-slate-200/80 bg-surface-muted/80 p-4 font-mono text-xs leading-6 text-slate-700 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-200">
            {siteCardText}
          </pre>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>友链列表集中在 `src/config/site.ts` 中维护，随时可扩展。</span>
            <Link
              href="/posts"
              className="font-medium text-accent-600 transition hover:underline dark:text-accent-300"
            >
              去文章归档留言 →
            </Link>
          </div>
        </section>
      </main>

      <FloatingDock />
      <SiteFooter />
    </div>
  );
}
