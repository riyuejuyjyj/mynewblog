import { BookOpen, PenLine, Rss, Sparkles } from "lucide-react";
import Link from "next/link";

import { blogConfig } from "@/config/site";

export function SiteFooter() {
  const year = new Date().getFullYear();
  const yearRange =
    year > blogConfig.foundedYear
      ? `${blogConfig.foundedYear}–${year}`
      : `${blogConfig.foundedYear}`;

  return (
    <footer className="relative z-10 mt-16 border-t border-slate-200/70 bg-white/75 backdrop-blur-md dark:border-white/8 dark:bg-[#111626]/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Sparkles className="size-4 text-accent-500" />
            <span>
              {blogConfig.brandPrefix}
              <span className="mx-1 font-serif font-normal text-accent-500">
                {blogConfig.brandConnector}
              </span>
              {blogConfig.brandSuffix}
            </span>
          </div>
          <p className="max-w-md text-xs leading-6 text-slate-500 dark:text-slate-400">
            {blogConfig.bio}
          </p>
          <p className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
            © {yearRange} {blogConfig.author} · Built with Next.js & Cloudflare
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          <Link
            href="/posts"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-3.5 py-1.5 transition hover:border-accent-300 hover:text-accent-600 dark:border-white/10 dark:bg-white/5 dark:hover:border-accent-400/40 dark:hover:text-accent-200"
          >
            <BookOpen className="size-3.5" />
            文章归档
          </Link>
          <Link
            href="/feed.xml"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-3.5 py-1.5 transition hover:border-accent-300 hover:text-accent-600 dark:border-white/10 dark:bg-white/5 dark:hover:border-accent-400/40 dark:hover:text-accent-200"
          >
            <Rss className="size-3.5" />
            RSS 订阅
          </Link>
          <Link
            href="/studio"
            className="inline-flex items-center gap-1.5 rounded-full border border-accent-200/80 bg-accent-50 px-3.5 py-1.5 text-accent-700 transition hover:bg-accent-100 dark:border-accent-400/25 dark:bg-accent-500/15 dark:text-accent-200 dark:hover:bg-accent-500/25"
          >
            <PenLine className="size-3.5" />
            进入创作室
          </Link>
        </div>
      </div>
    </footer>
  );
}
