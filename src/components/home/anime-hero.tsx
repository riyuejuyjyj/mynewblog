"use client";

import { ArrowRight, BookOpen, ChevronDown, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { type CSSProperties, useEffect, useState } from "react";

import { HeroWaves } from "@/components/layout/hero-waves";
import { blogConfig } from "@/config/site";

const HERO_PETALS = [
  { id: 1, left: "8%", size: 10, delay: "0s", duration: "11s", drift: "48px" },
  { id: 2, left: "18%", size: 8, delay: "2.4s", duration: "13s", drift: "-36px" },
  { id: 3, left: "31%", size: 11, delay: "1.1s", duration: "10s", drift: "62px" },
  { id: 4, left: "46%", size: 7, delay: "4.2s", duration: "14s", drift: "-28px" },
  { id: 5, left: "58%", size: 9, delay: "0.7s", duration: "12s", drift: "54px" },
  { id: 6, left: "71%", size: 10, delay: "3.1s", duration: "11.5s", drift: "-44px" },
  { id: 7, left: "84%", size: 8, delay: "1.8s", duration: "13.5s", drift: "38px" },
  { id: 8, left: "92%", size: 9, delay: "5s", duration: "12.5s", drift: "-52px" },
] as const;

export function AnimeHero() {
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setQuoteIndex((current) => (current + 1) % blogConfig.heroQuotes.length);
    }, 6200);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="relative isolate flex min-h-[68vh] w-full flex-col items-center justify-center overflow-hidden pt-20 pb-24 sm:min-h-[74vh] sm:pb-28">
      {/* Daytime anime scenic illustration */}
      <Image
        src={blogConfig.images.heroDay}
        alt="晴空海滨樱花风景插画"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center transition-opacity duration-700 dark:opacity-0"
      />
      {/* Nighttime anime scenic illustration */}
      <Image
        src={blogConfig.images.heroNight}
        alt="星海夜空樱花海岸插画"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center opacity-0 transition-opacity duration-700 dark:opacity-100"
      />

      {/* Contrast scrim so centered typography stays crisp over sunlit clouds and starry sky */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/36 via-slate-950/18 to-slate-950/48 dark:from-[#080b16]/45 dark:via-[#080b16]/25 dark:to-[#0d111e]/72" />

      {/* Delicate floating sakura petals (light) / starlight motes (dark) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {HERO_PETALS.map((petal) => (
          <span
            key={petal.id}
            className="hero-petal"
            style={
              {
                left: petal.left,
                top: "-18px",
                width: `${petal.size}px`,
                height: `${Math.round(petal.size * 0.72)}px`,
                "--petal-delay": petal.delay,
                "--petal-duration": petal.duration,
                "--petal-drift": petal.drift,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* Centered light-novel style Hero copy */}
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-5 text-center text-white">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/16 px-4 py-1.5 text-xs font-medium text-white/95 shadow-sm backdrop-blur-md"
        >
          <Sparkles className="size-3.5 text-pink-200 dark:text-sky-200" />
          <span>{blogConfig.authorRole}</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 font-serif text-4xl font-bold leading-tight tracking-tight text-white drop-shadow-[0_6px_26px_rgba(15,23,42,0.45)] sm:text-5xl md:text-6xl"
        >
          {blogConfig.brandPrefix}
          <span className="mx-2 font-normal text-pink-200 dark:text-sky-200">
            {blogConfig.brandConnector}
          </span>
          {blogConfig.brandSuffix}
        </motion.h1>

        <div className="mt-5 min-h-[3.25rem] max-w-xl">
          <AnimatePresence mode="wait">
            <motion.p
              key={quoteIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45 }}
              className="text-balance rounded-2xl border border-white/20 bg-slate-950/24 px-4 py-2 text-sm leading-7 text-white/95 backdrop-blur-md sm:text-base"
            >
              {blogConfig.heroQuotes[quoteIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18 }}
          className="mt-7 flex flex-wrap items-center justify-center gap-3"
        >
          <a
            href="#posts"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-accent-500 px-6 text-sm font-semibold text-white shadow-lg shadow-accent-500/35 transition hover:-translate-y-0.5 hover:bg-accent-600"
          >
            <BookOpen className="size-4" />
            开始阅读
          </a>
          <Link
            href="/posts"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/35 bg-white/16 px-5 text-sm font-semibold text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/26"
          >
            全部归档
            <ArrowRight className="size-4" />
          </Link>
        </motion.div>
      </div>

      {/* Gentle scroll indicator */}
      <a
        href="#posts"
        aria-label="向下滚动浏览文章"
        className="absolute bottom-14 z-20 inline-flex size-9 items-center justify-center rounded-full text-white/85 transition hover:text-white sm:bottom-16"
      >
        <ChevronDown className="size-6 animate-bounce" />
      </a>

      <HeroWaves />
    </section>
  );
}
