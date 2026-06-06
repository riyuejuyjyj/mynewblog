"use client";

import { FilePlus2, Loader2, X } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  type FormEvent,
} from "react";

import { Button } from "@/components/ui/button";

type TextInputDialogProps = {
  cancelLabel?: string;
  confirmLabel?: string;
  defaultValue?: string;
  description?: string;
  inputLabel: string;
  isPending?: boolean;
  open: boolean;
  placeholder?: string;
  title: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: string) => Promise<void> | void;
};

export function TextInputDialog({
  cancelLabel = "取消",
  confirmLabel = "创建",
  defaultValue = "",
  description,
  inputLabel,
  isPending = false,
  open,
  placeholder,
  title,
  onOpenChange,
  onSubmit,
}: TextInputDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [defaultValue, open]);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextValue = inputRef.current?.value.trim() ?? "";
    if (!nextValue) {
      inputRef.current?.setCustomValidity("请输入名称");
      inputRef.current?.reportValidity();
      return;
    }

    inputRef.current?.setCustomValidity("");
    await onSubmit(nextValue);
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center px-4 py-8"
      onMouseDown={() => !isPending && onOpenChange(false)}
    >
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-xl" />
      <form
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className="studio-panel relative z-10 w-full max-w-md overflow-hidden shadow-2xl shadow-slate-950/25"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => void handleSubmit(event)}
      >
        <div className="flex items-start gap-4 border-b border-white/35 p-5 dark:border-white/10">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/45 text-slate-700 dark:bg-white/10 dark:text-slate-100">
            <FilePlus2 className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Create
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

        <div className="space-y-4 p-5">
          {description ? (
            <p
              id={descriptionId}
              className="text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300"
            >
              {description}
            </p>
          ) : null}

          <label className="studio-label block" htmlFor={inputId}>
            {inputLabel}
            <input
              ref={inputRef}
              id={inputId}
              className="studio-input mt-2"
              defaultValue={defaultValue}
              disabled={isPending}
              placeholder={placeholder}
              required
              onChange={(event) => event.currentTarget.setCustomValidity("")}
            />
          </label>
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
          <Button disabled={isPending} type="submit">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
