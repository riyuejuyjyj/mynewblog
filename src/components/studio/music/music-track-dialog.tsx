"use client";

import { Music2, Save, UploadCloud, X } from "lucide-react";

import type { UploadFolder } from "@/components/studio/types";
import { Button } from "@/components/ui/button";
import { providerLabels, type MusicForm } from "./music-model";
import { MusicUploadDialog } from "./music-upload-dialog";

type MusicTrackDialogProps = {
  form: MusicForm;
  isSaving: boolean;
  open: boolean;
  uploadOpen: boolean;
  uploadStatus: string;
  onChange: (patch: Partial<MusicForm>) => void;
  onClose: () => void;
  onOpenUpload: (open: boolean) => void;
  onSave: () => Promise<void>;
  onUploadAudio: (file: File, folder: UploadFolder) => Promise<string | null>;
};

export function MusicTrackDialog({
  form,
  isSaving,
  open,
  uploadOpen,
  uploadStatus,
  onChange,
  onClose,
  onOpenUpload,
  onSave,
  onUploadAudio,
}: MusicTrackDialogProps) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[74] grid place-items-center px-4 py-8"
        onMouseDown={onClose}
      >
        <div className="absolute inset-0 bg-slate-950/58 backdrop-blur-xl" />
        <section
          aria-modal="true"
          className="studio-panel relative z-10 w-full max-w-3xl overflow-hidden shadow-2xl shadow-slate-950/25"
          role="dialog"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-white/35 p-5 dark:border-white/10">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-100">
                <Music2 className="size-5" />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-200">
                  Music Source
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-[0]">
                  {form.id ? "编辑音乐" : "添加音乐"}
                </h2>
              </div>
            </div>
            <button
              aria-label="关闭"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-white/35 text-slate-600 transition hover:bg-white/60 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20"
              type="button"
              onClick={onClose}
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">歌名</span>
              <input
                className="studio-input"
                onChange={(event) => onChange({ title: event.target.value })}
                value={form.title}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">歌手</span>
              <input
                className="studio-input"
                onChange={(event) => onChange({ artist: event.target.value })}
                value={form.artist}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">专辑</span>
              <input
                className="studio-input"
                onChange={(event) => onChange({ album: event.target.value })}
                value={form.album}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">封面 URL</span>
              <input
                className="studio-input"
                onChange={(event) => onChange({ coverUrl: event.target.value })}
                value={form.coverUrl}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">音源</span>
              <select
                className="studio-input"
                onChange={(event) =>
                  onChange({
                    provider: event.target.value as MusicForm["provider"],
                  })
                }
                value={form.provider}
              >
                {Object.entries(providerLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">品质</span>
              <select
                className="studio-input"
                onChange={(event) =>
                  onChange({
                    quality: event.target.value as MusicForm["quality"],
                  })
                }
                value={form.quality}
              >
                <option value="128k">128k</option>
                <option value="320k">320k</option>
                <option value="flac">FLAC</option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">
                歌曲 ID / hash / mid
              </span>
              <input
                className="studio-input"
                onChange={(event) =>
                  onChange({ sourceSongId: event.target.value })
                }
                value={form.sourceSongId}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">排序</span>
              <input
                className="studio-input"
                onChange={(event) =>
                  onChange({ sortOrder: Number(event.target.value) || 0 })
                }
                type="number"
                value={form.sortOrder}
              />
            </label>
            <label className="grid gap-2 md:col-span-2">
              <span className="text-xs font-black text-slate-500">
                本地/R2 音频 URL
              </span>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  className="studio-input"
                  onChange={(event) => onChange({ audioUrl: event.target.value })}
                  value={form.audioUrl}
                />
                <Button
                  type="button"
                  variant="glass"
                  onClick={() => onOpenUpload(true)}
                >
                  <UploadCloud className="size-4" />
                  上传
                </Button>
              </div>
            </label>
            <label className="grid gap-2 md:col-span-2">
              <span className="text-xs font-black text-slate-500">歌词</span>
              <textarea
                className="studio-input min-h-24 resize-y leading-7"
                onChange={(event) => onChange({ lyric: event.target.value })}
                value={form.lyric}
              />
            </label>
            <label className="flex items-center gap-2 rounded-2xl bg-white/35 px-4 py-3 text-sm font-black text-slate-600 dark:bg-white/8 dark:text-slate-300">
              <input
                checked={form.enabled}
                className="size-4 accent-emerald-500"
                onChange={(event) => onChange({ enabled: event.target.checked })}
                type="checkbox"
              />
              启用
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t border-white/35 px-5 py-4 dark:border-white/10">
            <Button type="button" variant="glass" onClick={onClose}>
              取消
            </Button>
            <Button disabled={isSaving} type="button" onClick={onSave}>
              <Save className="size-4" />
              {isSaving ? "保存中..." : "保存音乐"}
            </Button>
          </div>
        </section>
      </div>

      <MusicUploadDialog
        open={uploadOpen}
        uploadStatus={uploadStatus}
        onOpenChange={onOpenUpload}
        onUploadAudio={onUploadAudio}
        onUploaded={(url, fileName) => {
          onChange({
            audioUrl: url,
            title: form.title || fileName.replace(/\.[^.]+$/, ""),
          });
          onOpenUpload(false);
        }}
      />
    </>
  );
}
