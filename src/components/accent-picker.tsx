"use client";

import { Check, Palette } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useBlogTheme } from "@/components/theme-provider";
import { accentThemes } from "@/config/site";
import { cn } from "@/lib/utils";

type AccentPickerProps = {
  className?: string;
  transparent?: boolean;
};

export function AccentPicker({
  className,
  transparent = false,
}: AccentPickerProps) {
  const { accent, setAccent } = useBlogTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-label="切换主题色盘"
        title="切换日系主题色盘"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-full border transition duration-200",
          transparent
            ? "border-white/30 bg-white/16 text-white backdrop-blur-md hover:bg-white/28"
            : "border-slate-200/80 bg-white/80 text-slate-700 hover:border-accent-300 hover:text-accent-600 dark:border-white/12 dark:bg-white/8 dark:text-slate-200 dark:hover:border-accent-400/40 dark:hover:text-accent-200",
        )}
      >
        <Palette className="size-4" />
      </button>

      {open ? (
        <div
          role="menu"
          className="anime-glass absolute right-0 top-11 z-50 w-56 rounded-2xl p-2 text-left"
        >
          <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-semibold text-slate-400 dark:text-slate-400">
            选择日系色盘
          </p>
          <div className="space-y-1">
            {accentThemes.map((option) => {
              const selected = option.id === accent;

              return (
                <button
                  key={option.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={() => {
                    setAccent(option.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition",
                    selected
                      ? "bg-accent-50 text-accent-700 dark:bg-accent-500/18 dark:text-accent-200"
                      : "text-slate-700 hover:bg-slate-100/80 dark:text-slate-200 dark:hover:bg-white/8",
                  )}
                >
                  <span
                    className="grid size-5 shrink-0 place-items-center rounded-full text-white shadow-sm"
                    style={{ backgroundColor: option.swatch }}
                  >
                    {selected ? <Check className="size-3" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold leading-tight">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                      {option.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
