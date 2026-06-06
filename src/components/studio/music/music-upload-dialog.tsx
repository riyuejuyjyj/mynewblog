"use client";

import { Loader2, UploadCloud, X } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";

import type { UploadFolder } from "@/components/studio/types";
import { Button } from "@/components/ui/button";

type MusicUploadDialogProps = {
  open: boolean;
  uploadStatus: string;
  onOpenChange: (open: boolean) => void;
  onUploaded: (url: string, fileName: string) => void;
  onUploadAudio: (file: File, folder: UploadFolder) => Promise<string | null>;
};

export function MusicUploadDialog({
  open,
  uploadStatus,
  onOpenChange,
  onUploaded,
  onUploadAudio,
}: MusicUploadDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setIsUploading(true);
    try {
      const url = await onUploadAudio(file, "music");
      if (url) {
        onUploaded(url, file.name);
        onOpenChange(false);
      }
    } finally {
      setIsUploading(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[75] grid place-items-center px-4 py-8"
      onMouseDown={() => !isUploading && onOpenChange(false)}
    >
      <div className="absolute inset-0 bg-slate-950/58 backdrop-blur-xl" />
      <section
        aria-modal="true"
        className="studio-panel relative z-10 w-full max-w-lg overflow-hidden shadow-2xl shadow-slate-950/25"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/35 p-5 dark:border-white/10">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-coral-700 dark:text-coral-200">
              R2 Audio Upload
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-[0]">
              上传音乐文件
            </h2>
          </div>
          <button
            aria-label="关闭"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-white/35 text-slate-600 transition hover:bg-white/60 disabled:opacity-50 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20"
            disabled={isUploading}
            type="button"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5">
          <button
            className="flex min-h-48 w-full flex-col items-center justify-center gap-4 rounded-[1.5rem] border border-dashed border-white/50 bg-white/30 px-6 text-center transition hover:bg-white/46 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
            disabled={isUploading}
            type="button"
            onClick={() => inputRef.current?.click()}
          >
            <span className="grid size-16 place-items-center rounded-3xl bg-coral-100 text-coral-700 dark:bg-coral-400/15 dark:text-coral-200">
              {isUploading ? (
                <Loader2 className="size-7 animate-spin" />
              ) : (
                <UploadCloud className="size-7" />
              )}
            </span>
            <span>
              <span className="block text-lg font-black">
                选择音频上传
              </span>
              <span className="mt-1 block text-sm font-bold text-slate-500 dark:text-slate-300">
                支持 mp3、flac、wav、m4a 等浏览器可播放格式
              </span>
            </span>
          </button>
          <input
            accept="audio/*"
            className="hidden"
            onChange={handleUpload}
            ref={inputRef}
            type="file"
          />
          {uploadStatus ? (
            <p className="mt-4 rounded-2xl bg-white/35 px-4 py-3 text-sm font-bold text-slate-600 dark:bg-white/10 dark:text-slate-200">
              {uploadStatus}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end border-t border-white/35 px-5 py-4 dark:border-white/10">
          <Button
            disabled={isUploading}
            type="button"
            variant="glass"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
        </div>
      </section>
    </div>
  );
}
