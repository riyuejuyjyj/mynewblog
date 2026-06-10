"use client";

/* eslint-disable @next/next/no-img-element */

import {
  AlertTriangle,
  Check,
  CloudUpload,
  Copy,
  FileImage,
  ImagePlus,
  Send,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useState, type ChangeEvent } from "react";

import type { StorageStatus } from "@/components/home/types";
import type {
  StudioMediaAsset,
  StudioPostForm,
  UploadFolder,
} from "@/components/studio/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

type MediaBoardProps = {
  assets: StudioMediaAsset[];
  assetsLoading: boolean;
  deletingAssetId: string | null;
  form: StudioPostForm;
  storage: StorageStatus;
  uploadStatus: string;
  onCoverChange: (value: string) => void;
  onDeleteAsset: (asset: StudioMediaAsset) => Promise<void>;
  onInsertImage: (url: string, altText?: string) => void;
  onUploadFile: (file: File, folder: UploadFolder) => Promise<string | null>;
};

const folders = [
  ["covers", "封面"],
  ["gallery", "相册"],
  ["attachments", "附件"],
] as const satisfies ReadonlyArray<readonly [UploadFolder, string]>;

function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

function fileNameOf(value: string) {
  const cleanValue = value.split(/[?#]/)[0] ?? value;
  return cleanValue.split("/").filter(Boolean).pop() ?? cleanValue;
}

function assetImageUrl(asset: StudioMediaAsset) {
  return asset.exists === false ? null : asset.previewUrl ?? asset.publicUrl;
}

export function MediaBoard({
  assets,
  assetsLoading,
  deletingAssetId,
  form,
  storage,
  uploadStatus,
  onCoverChange,
  onDeleteAsset,
  onInsertImage,
  onUploadFile,
}: MediaBoardProps) {
  const [folder, setFolder] = useState<UploadFolder>("gallery");
  const [uploading, setUploading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [brokenAssets, setBrokenAssets] = useState<Set<string>>(new Set());
  const [pendingDeleteAsset, setPendingDeleteAsset] =
    useState<StudioMediaAsset | null>(null);
  const imageAssets = useMemo(
    () => assets.filter((asset) => asset.contentType.startsWith("image/")),
    [assets],
  );
  const missingCount = imageAssets.filter((asset) => asset.exists === false).length;

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    setUploading(true);

    try {
      const url = await onUploadFile(file, folder);

      if (url && folder === "covers") {
        onCoverChange(url);
      }
    } catch {
      // The parent owns the visible upload status; keep the media panel responsive.
    } finally {
      setUploading(false);
      input.value = "";
    }
  }

  async function confirmDeleteAsset() {
    if (!pendingDeleteAsset) {
      return;
    }

    await onDeleteAsset(pendingDeleteAsset);
    setPendingDeleteAsset(null);
  }

  function markBroken(assetId: string) {
    setBrokenAssets((current) => new Set(current).add(assetId));
  }

  return (
    <section className="studio-panel overflow-hidden">
      <header className="flex flex-col gap-4 border-b border-white/35 p-4 dark:border-white/10 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Cloudflare R2</Badge>
            <Badge className="bg-white/25 text-slate-600 dark:bg-white/10 dark:text-slate-300">
              {storage.bucket ?? "images"}
            </Badge>
            <Badge
              className={
                storage.publicBaseUrl
                  ? "bg-white/25 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                  : "bg-coral-100 text-coral-950 dark:bg-coral-400/15 dark:text-coral-100"
              }
            >
              {storage.publicBaseUrl ? "Public URL 已设置" : "后台签名预览"}
            </Badge>
            {missingCount > 0 ? (
              <Badge className="gap-1 bg-coral-100 text-coral-950 dark:bg-coral-400/15 dark:text-coral-100">
                <AlertTriangle className="size-3.5" />
                {missingCount} 条对象缺失
              </Badge>
            ) : null}
          </div>
          <h2 className="mt-4 text-2xl font-black tracking-[0] sm:text-3xl">
            媒体库
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            主区域直接展示已上传图片。新上传会在确认 R2 对象存在后再写入数据库，旧的幽灵记录会标记为对象缺失并可清理。
          </p>
        </div>

        <Button type="button" className="w-full sm:w-auto" onClick={() => setUploadOpen(true)}>
          <Upload className="size-4" />
          上传图片
        </Button>
      </header>

      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3 2xl:grid-cols-4">
        {assetsLoading ? (
          Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="aspect-[4/3] animate-pulse rounded-2xl bg-white/25 dark:bg-white/10"
            />
          ))
        ) : null}

        {!assetsLoading && imageAssets.length === 0 ? (
          <div className="col-span-full grid min-h-[300px] place-items-center rounded-2xl border border-dashed border-white/45 bg-white/20 p-6 text-center dark:border-white/10 dark:bg-white/5 sm:min-h-[420px] sm:p-8">
            <div>
              <FileImage className="mx-auto size-12 text-slate-400 sm:size-14" />
              <h3 className="mt-4 text-xl font-black tracking-[0] sm:mt-5 sm:text-2xl">
                还没有可展示的图片
              </h3>
              <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-300">
                点击右上角上传，把 R2 先变成真正的素材墙。
              </p>
              <Button
                type="button"
                className="mt-5"
                onClick={() => setUploadOpen(true)}
              >
                <Upload className="size-4" />
                上传第一张
              </Button>
            </div>
          </div>
        ) : null}

        {imageAssets.map((asset) => {
          const previewUrl = assetImageUrl(asset);
          const actionUrl = previewUrl ?? asset.publicUrl;
          const isMissing = asset.exists === false;
          const isDeleting = deletingAssetId === asset.id;
          const isCurrentCover =
            Boolean(actionUrl && form.coverImage === actionUrl) ||
            form.coverImage === asset.objectKey ||
            form.coverImage === asset.altText;
          const canPreview = Boolean(previewUrl && !brokenAssets.has(asset.id));

          return (
          <article
            key={asset.id}
            className={cn(
                "group overflow-hidden rounded-2xl border border-white/45 bg-white/28 shadow-xl shadow-slate-950/5 transition duration-300 hover:bg-white/40 hover:shadow-2xl hover:shadow-slate-950/10 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15",
                isMissing && "border-coral-300/70 bg-coral-50/30 dark:border-coral-400/25 dark:bg-coral-400/10",
              )}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-950/5 dark:bg-white/10">
                {canPreview && previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={asset.altText ?? asset.objectKey}
                    className="size-full object-cover transition duration-500 group-hover:scale-[1.035]"
                    onError={() => markBroken(asset.id)}
                  />
                ) : (
                  <div className="grid size-full place-items-center p-5 text-center text-xs font-bold text-slate-400">
                    <span className="break-all">
                      {isMissing ? "R2 对象缺失，可删除记录" : asset.objectKey}
                    </span>
                  </div>
                )}
                {isCurrentCover ? (
                  <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-400 px-3 py-1 text-[11px] font-black text-emerald-950 shadow-lg">
                    <Check className="size-3.5" />
                    当前封面
                  </div>
                ) : null}
                {isMissing ? (
                  <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-coral-100 px-3 py-1 text-[11px] font-black text-coral-950 shadow-lg">
                    <AlertTriangle className="size-3.5" />
                    对象缺失
                  </div>
                ) : null}
              </div>

              <div className="space-y-3 p-3 sm:p-4">
                <div>
                  <h3 className="truncate text-sm font-black">
                    {asset.altText ?? fileNameOf(asset.objectKey)}
                  </h3>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-300">
                    <span>{asset.folder}</span>
                    <span>{formatBytes(asset.sizeBytes)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={isCurrentCover ? "soft" : "glass"}
                    size="sm"
                    disabled={!actionUrl || isMissing}
                    onClick={() => actionUrl && onCoverChange(actionUrl)}
                  >
                    <ImagePlus className="size-4" />
                    封面
                  </Button>
                  <Button
                    type="button"
                    variant="glass"
                    size="sm"
                    disabled={!actionUrl || isMissing}
                    onClick={() =>
                      actionUrl && onInsertImage(actionUrl, asset.altText ?? asset.objectKey)
                    }
                  >
                    <Send className="size-4" />
                    插入
                  </Button>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <button
                    type="button"
                    disabled={!actionUrl || isMissing}
                    onClick={() => actionUrl && navigator.clipboard.writeText(actionUrl)}
                    className="flex min-w-0 items-center gap-2 rounded-2xl px-3 py-2 text-left text-[11px] font-bold text-slate-500 transition hover:bg-white/45 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-white/10"
                  >
                    <Copy className="size-3.5 shrink-0" />
                    <span className="truncate">{actionUrl ?? asset.objectKey}</span>
                  </button>
                  <button
                    type="button"
                    title={isMissing ? "清理记录" : "删除图片"}
                    disabled={isDeleting}
                    onClick={() => setPendingDeleteAsset(asset)}
                    className="grid size-10 place-items-center rounded-2xl text-coral-700 transition hover:bg-coral-100 disabled:opacity-50 dark:text-coral-200 dark:hover:bg-coral-400/10"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <ConfirmDialog
        confirmLabel={
          pendingDeleteAsset?.exists === false ? "清理记录" : "删除图片"
        }
        description={
          pendingDeleteAsset?.exists === false
            ? "这条记录在 R2 中没有对应对象，将只清理 Neon 中的素材记录。"
            : "这会删除 R2 对象，并清理 Neon 中的素材记录。已插入文章中的图片地址不会自动替换。"
        }
        isPending={
          Boolean(deletingAssetId) &&
          pendingDeleteAsset?.id === deletingAssetId
        }
        open={Boolean(pendingDeleteAsset)}
        title={
          pendingDeleteAsset?.exists === false
            ? "清理缺失记录？"
            : "删除这张图片？"
        }
        onConfirm={confirmDeleteAsset}
        onOpenChange={(open) => {
          if (!open && !deletingAssetId) {
            setPendingDeleteAsset(null);
          }
        }}
      />

      {uploadOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-3 py-6 backdrop-blur-xl sm:px-4 sm:py-8">
          <div className="studio-panel w-full max-w-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/35 px-5 py-4 dark:border-white/10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-coral-700 dark:text-coral-200">
                  Upload
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-[0]">
                  上传到 R2
                </h2>
              </div>
              <button
                type="button"
                title="关闭"
                onClick={() => setUploadOpen(false)}
                className="grid size-10 place-items-center rounded-full bg-white/35 text-slate-600 transition hover:bg-white/60 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap gap-2">
                {folders.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFolder(value)}
                    className={cn(
                      "rounded-full px-4 py-2 text-xs font-black transition",
                      folder === value
                        ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                        : "bg-white/45 text-slate-600 hover:bg-white/70 dark:bg-white/10 dark:text-slate-300",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <label className="grid min-h-48 cursor-pointer place-items-center rounded-2xl border border-dashed border-white/55 bg-white/35 px-5 py-8 text-center transition hover:bg-white/55 dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/15 sm:min-h-56">
                <div>
                  <CloudUpload className="mx-auto size-12 text-coral-500" />
                  <p className="mt-4 text-lg font-black">
                    {uploading ? "上传中..." : "选择图片上传"}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-300">
                    最大 25MB，上传完成后会自动回到主区域。
                  </p>
                </div>
                <input
                  accept="image/*"
                  className="hidden"
                  disabled={!storage.configured || uploading}
                  type="file"
                  onChange={handleUpload}
                />
              </label>

              {uploadStatus ? (
                <p className="mt-4 rounded-2xl bg-white/45 px-4 py-3 text-xs font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">
                  {uploadStatus}
                </p>
              ) : null}
              {!storage.configured ? (
                <p className="mt-4 rounded-2xl bg-coral-100 px-4 py-3 text-sm font-bold text-coral-950 dark:bg-coral-400/15 dark:text-coral-100">
                  R2 还没有完整配置，暂时不能上传。
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
