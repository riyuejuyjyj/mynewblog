"use client";

import {
  BookOpen,
  HeartHandshake,
  Home,
  Menu,
  PenLine,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type MouseEvent, useEffect, useState } from "react";

import { AccentPicker } from "@/components/accent-picker";
import { CommandSearch } from "@/components/layout/command-search";
import { useBlogTheme } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { blogConfig } from "@/config/site";
import { cn } from "@/lib/utils";

type SiteHeaderProps = {
  overlayHero?: boolean;
};

const navIconMap = {
  "/": Home,
  "/posts": BookOpen,
  "/friends": HeartHandshake,
  "/about": UserRound,
  "/studio": PenLine,
} as const;

const BURST_ANGLES = [
  { x: -24, y: -20 },
  { x: 0, y: -28 },
  { x: 24, y: -20 },
  { x: -26, y: 12 },
  { x: 26, y: 12 },
  { x: 4, y: 24 },
];

function spawnNavPetals(x: number, y: number) {
  for (const vector of BURST_ANGLES) {
    const spark = document.createElement("span");
    spark.className = "nav-petal-spark";
    spark.style.left = `${x}px`;
    spark.style.top = `${y}px`;
    spark.style.setProperty("--burst-x", `${vector.x}px`);
    spark.style.setProperty("--burst-y", `${vector.y}px`);
    document.body.appendChild(spark);
    window.setTimeout(() => spark.remove(), 680);
  }
}

export function SiteHeader({ overlayHero = true }: SiteHeaderProps) {
  const pathname = usePathname();
  const { motionLevel, petalsEnabled } = useBlogTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 40);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isTransparent = overlayHero && !scrolled && !mobileOpen;

  function isRouteActive(href: string) {
    if (href === "/") return pathname === "/";
    if (href.startsWith("/") && !href.includes("#")) {
      return pathname.startsWith(href);
    }
    return false;
  }

  function handleNavClick(event: MouseEvent<HTMLAnchorElement>) {
    if (motionLevel === "full" && petalsEnabled) {
      spawnNavPetals(event.clientX, event.clientY);
    }
  }

  const activeNavHref =
    blogConfig.navLinks.find((item) => isRouteActive(item.href))?.href ?? null;
  const indicatorHref = hoveredHref ?? activeNavHref;

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 transition-all duration-300",
          isTransparent
            ? "bg-gradient-to-b from-slate-950/42 via-slate-950/15 to-transparent px-4 py-4 sm:px-6"
            : "px-3 pt-2.5 sm:px-6 sm:pt-3",
        )}
      >
        <div
          className={cn(
            "mx-auto flex w-full items-center justify-between gap-3 transition-all duration-300",
            isTransparent
              ? "max-w-6xl"
              : "anime-glass max-w-4xl rounded-full px-3.5 py-2 sm:px-5",
          )}
        >
          <Link
            href="/"
            onClick={handleNavClick}
            className={cn(
              "group flex items-center gap-2.5 rounded-full py-0.5 transition",
              isTransparent ? "text-white" : "text-slate-900 dark:text-white",
            )}
          >
            <span
              className={cn(
                "grid size-8 place-items-center rounded-xl transition-transform duration-300 group-hover:rotate-12",
                isTransparent
                  ? "border border-white/30 bg-white/18 text-white backdrop-blur-md"
                  : "bg-gradient-to-br from-accent-500 to-sky-400 text-white shadow-sm shadow-accent-500/30",
              )}
            >
              <Sparkles className="size-4" />
            </span>
            <span className="flex items-baseline gap-1 text-sm font-bold tracking-tight">
              <span>{blogConfig.brandPrefix}</span>
              <span
                className={cn(
                  "font-serif text-xs font-normal",
                  isTransparent
                    ? "text-pink-200"
                    : "text-accent-500 dark:text-accent-400",
                )}
              >
                {blogConfig.brandConnector}
              </span>
              <span className="hidden text-xs font-medium opacity-90 sm:inline">
                {blogConfig.brandSuffix}
              </span>
            </span>
          </Link>

          <nav
            aria-label="主导航"
            onMouseLeave={() => setHoveredHref(null)}
            className="hidden items-center gap-0.5 md:flex"
          >
            {blogConfig.navLinks.map((item) => {
              const Icon =
                navIconMap[item.href as keyof typeof navIconMap] ?? Sparkles;
              const active = isRouteActive(item.href);
              const showPill = indicatorHref === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseEnter={() => setHoveredHref(item.href)}
                  onClick={handleNavClick}
                  className={cn(
                    "relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-200",
                    isTransparent
                      ? active
                        ? "text-white"
                        : "text-white/88 hover:text-white"
                      : active
                        ? "text-accent-700 dark:text-accent-200"
                        : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white",
                  )}
                >
                  {showPill ? (
                    <motion.span
                      layoutId="header-nav-pill"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 32,
                      }}
                      className={cn(
                        "absolute inset-0 -z-10 rounded-full",
                        isTransparent
                          ? "bg-white/22 backdrop-blur-md"
                          : "bg-accent-50 dark:bg-accent-500/20",
                      )}
                    />
                  ) : null}
                  <Icon className="size-3.5 opacity-85" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              aria-label="全站搜索"
              title="全站快捷搜索 (Ctrl+K)"
              onClick={() => setSearchOpen(true)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full border px-2.5 text-xs font-medium transition duration-200 sm:px-3",
                isTransparent
                  ? "border-white/30 bg-white/16 text-white backdrop-blur-md hover:bg-white/28"
                  : "border-slate-200/80 bg-white/80 text-slate-600 hover:border-accent-300 hover:text-accent-600 dark:border-white/12 dark:bg-white/8 dark:text-slate-200 dark:hover:border-accent-400/40 dark:hover:text-accent-200",
              )}
            >
              <Search className="size-3.5" />
              <span className="hidden font-mono text-[10px] opacity-75 lg:inline">
                ⌘K
              </span>
            </button>
            <AccentPicker transparent={isTransparent} />
            <ThemeToggle transparent={isTransparent} />
            <button
              type="button"
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? "关闭导航菜单" : "打开导航菜单"}
              onClick={() => setMobileOpen((current) => !current)}
              className={cn(
                "inline-flex size-9 shrink-0 items-center justify-center rounded-full border transition md:hidden",
                isTransparent
                  ? "border-white/30 bg-white/16 text-white backdrop-blur-md hover:bg-white/28"
                  : "border-slate-200/80 bg-white/80 text-slate-700 hover:border-accent-300 dark:border-white/12 dark:bg-white/8 dark:text-slate-200",
              )}
            >
              {mobileOpen ? (
                <X className="size-4" />
              ) : (
                <Menu className="size-4" />
              )}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="anime-glass mx-auto mt-2 max-w-4xl rounded-3xl p-3 md:hidden">
            <nav className="grid gap-1">
              {blogConfig.navLinks.map((item) => {
                const Icon =
                  navIconMap[item.href as keyof typeof navIconMap] ?? Sparkles;
                const active = isRouteActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition",
                      active
                        ? "bg-accent-50 text-accent-700 dark:bg-accent-500/20 dark:text-accent-200"
                        : "text-slate-700 hover:bg-surface-muted dark:text-slate-200 dark:hover:bg-white/8",
                    )}
                  >
                    <Icon className="size-4 text-accent-500" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ) : null}
      </header>

      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
