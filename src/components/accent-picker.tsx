"use client";

import { Check, Flower2, Palette, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useBlogTheme } from "@/components/theme-provider";
import { accentThemes, type MotionLevel } from "@/config/site";
import { cn } from "@/lib/utils";

type AccentPickerProps = {
  className?: string;
  transparent?: boolean;
};

const motionOptions: ReadonlyArray<{ id: MotionLevel; label: string }> = [
  { id: "full", label: "完整" },
  { id: "subtle", label: "轻柔" },
  { id: "off", label: "关闭" },
];

export function AccentPicker({
  className,
  transparent = false,
}: AccentPickerProps) {
  const {
    accent,
    motionLevel,
    petalsEnabled,
    setAccent,
    setMotionLevel,
    setPetalsEnabled,
  } = useBlogTheme();
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
        title="外观、色盘与动效设置"
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
          role="dialog"
          aria-label="外观与动效设置"
          className="anime-glass absolute right-0 top-11 z-50 w-64 rounded-2xl p-3 text-left"
        >
          <p className="flex items-center gap-1.5 px-2 pb-1.5 text-[11px] font-semibold text-slate-400">
            <Sparkles className="size-3 text-accent-500" />
            日系主题色盘
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
                  onClick={() => setAccent(option.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition",
                    selected
                      ? "bg-accent-50 text-accent-700 dark:bg-accent-500/20 dark:text-accent-200"
                      : "text-slate-700 hover:bg-slate-100/80 dark:text-slate-200 dark:hover:bg-white/8",
                  )}
                >
                  <span
                    className="grid size-5 shrink-0 place-items-center rounded-full text-white shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${option.swatch}, ${option.secondary})`,
                    }}
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

          <div className="mt-3 border-t border-slate-200/70 pt-3 dark:border-white/10">
            <p className="px-2 pb-1.5 text-[11px] font-semibold text-slate-400">
              动效强度
            </p>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-muted/80 p-1 dark:bg-white/[0.05]">
              {motionOptions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMotionLevel(item.id)}
                  className={cn(
                    "rounded-lg py-1.5 text-[11px] font-semibold transition",
                    motionLevel === item.id
                      ? "bg-accent-500 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between rounded-xl px-2 py-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">
              <Flower2 className="size-3.5 text-accent-500" />
              飘落花瓣 / 星尘
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={petalsEnabled}
              onClick={() => setPetalsEnabled(!petalsEnabled)}
              className={cn(
                "relative h-5 w-9 rounded-full transition-colors",
                petalsEnabled
                  ? "bg-accent-500"
                  : "bg-slate-300 dark:bg-white/15",
              )}
            >
              <span
                className={cn(
                  "absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow transition-transform",
                  petalsEnabled && "translate-x-4",
                )}
              />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
