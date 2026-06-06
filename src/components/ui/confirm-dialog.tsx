"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";
import { useEffect, useId } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  isPending?: boolean;
  open: boolean;
  title: string;
  tone?: "danger" | "warning";
  onConfirm: () => Promise<void> | void;
  onOpenChange: (open: boolean) => void;
};

export function ConfirmDialog({
  cancelLabel = "取消",
  confirmLabel = "确认",
  description,
  isPending = false,
  open,
  title,
  tone = "danger",
  onConfirm,
  onOpenChange,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        onOpenChange(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPending, onOpenChange, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center px-4 py-8"
      onMouseDown={() => !isPending && onOpenChange(false)}
    >
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-xl" />
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="studio-panel relative z-10 w-full max-w-md overflow-hidden shadow-2xl shadow-slate-950/25"
        role="alertdialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-4 border-b border-white/35 p-5 dark:border-white/10">
          <div
            className={cn(
              "grid size-12 shrink-0 place-items-center rounded-2xl",
              tone === "danger"
                ? "bg-coral-100 text-coral-700 dark:bg-coral-400/15 dark:text-coral-200"
                : "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200",
            )}
          >
            <AlertTriangle className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Confirm
            </p>
            <h2 id={titleId} className="mt-1 text-2xl font-black tracking-[0]">
              {title}
            </h2>
          </div>
          <button
            aria-label="关闭"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-white/35 text-slate-600 transition hover:bg-white/60 disabled:opacity-50 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20"
            disabled={isPending}
            type="button"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5">
          <p
            id={descriptionId}
            className="text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300"
          >
            {description}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/35 px-5 py-4 dark:border-white/10">
          <Button
            disabled={isPending}
            type="button"
            variant="glass"
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            className={cn(
              tone === "danger" &&
                "bg-coral-600 text-white hover:bg-coral-700 dark:bg-coral-400 dark:text-coral-950 dark:hover:bg-coral-300",
            )}
            disabled={isPending}
            type="button"
            variant={tone === "danger" ? "soft" : "default"}
            onClick={() => void onConfirm()}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
