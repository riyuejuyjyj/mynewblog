"use client";

import {
  BookOpen,
  Feather,
  Home,
  Menu,
  MessageCircle,
  PenLine,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { AccentPicker } from "@/components/accent-picker";
import { ThemeToggle } from "@/components/theme-toggle";
import { blogConfig } from "@/config/site";
import { cn } from "@/lib/utils";

type SiteHeaderProps = {
  overlayHero?: boolean;
};

const navIconMap = {
  "/": Home,
  "/posts": BookOpen,
  "/#moments": Feather,
  "/#comments": MessageCircle,
  "/studio": PenLine,
} as const;

export function SiteHeader({ overlayHero = true }: SiteHeaderProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 36);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isTransparent = overlayHero && !scrolled && !mobileOpen;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        isTransparent
          ? "bg-gradient-to-b from-slate-950/42 via-slate-950/15 to-transparent py-4"
          : "border-b border-slate-200/70 bg-white/84 py-2.5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#0d111e]/86",
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className={cn(
            "group flex items-center gap-2.5 rounded-full py-1 transition",
            isTransparent ? "text-white" : "text-slate-900 dark:text-white",
          )}
        >
          <span
            className={cn(
              "grid size-9 place-items-center rounded-xl transition-transform duration-300 group-hover:rotate-6",
              isTransparent
                ? "border border-white/30 bg-white/18 text-white backdrop-blur-md"
                : "bg-accent-500 text-white shadow-sm shadow-accent-500/30",
            )}
          >
            <Sparkles className="size-4" />
          </span>
          <span className="flex items-baseline gap-1 text-sm font-bold tracking-tight sm:text-base">
            <span>{blogConfig.brandPrefix}</span>
            <span
              className={cn(
                "font-serif text-xs font-normal sm:text-sm",
                isTransparent
                  ? "text-pink-200"
                  : "text-accent-500 dark:text-accent-400",
              )}
            >
              {blogConfig.brandConnector}
            </span>
            <span className="hidden text-xs font-medium opacity-90 sm:inline sm:text-sm">
              {blogConfig.brandSuffix}
            </span>
          </span>
        </Link>

        <nav
          aria-label="主导航"
          className="hidden items-center gap-1 md:flex"
        >
          {blogConfig.navLinks.map((item) => {
            const Icon =
              navIconMap[item.href as keyof typeof navIconMap] ?? Sparkles;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : item.href.startsWith("/") &&
                  !item.href.includes("#") &&
                  pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition duration-200",
                  isTransparent
                    ? isActive
                      ? "bg-white/24 text-white backdrop-blur-md"
                      : "text-white/90 hover:bg-white/16 hover:text-white"
                    : isActive
                      ? "bg-accent-50 text-accent-700 dark:bg-accent-500/18 dark:text-accent-200"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/8 dark:hover:text-white",
                )}
              >
                <Icon className="size-3.5 opacity-80" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/posts"
            aria-label="搜索文章"
            title="搜索与归档"
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-full border transition duration-200",
              isTransparent
                ? "border-white/30 bg-white/16 text-white backdrop-blur-md hover:bg-white/28"
                : "border-slate-200/80 bg-white/80 text-slate-700 hover:border-accent-300 hover:text-accent-600 dark:border-white/12 dark:bg-white/8 dark:text-slate-200 dark:hover:border-accent-400/40 dark:hover:text-accent-200",
            )}
          >
            <Search className="size-4" />
          </Link>
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
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-slate-200/70 bg-white/95 px-4 pb-4 pt-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#0d111e]/95 md:hidden">
          <nav className="grid gap-1">
            {blogConfig.navLinks.map((item) => {
              const Icon =
                navIconMap[item.href as keyof typeof navIconMap] ?? Sparkles;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-accent-50 hover:text-accent-700 dark:text-slate-200 dark:hover:bg-white/8 dark:hover:text-accent-200"
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
  );
}
