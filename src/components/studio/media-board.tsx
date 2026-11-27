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
import { type ChangeEvent, useMemo, useState } from "react";

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
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [brokenAssets, setBrokenAssets] = useState<Set<string>>(new Set());
  const [pendingDeleteAsset, setPendingDeleteAsset] =
    useState<StudioMediaAsset | null>(null);

  const imageAssets = useMemo(
    () => assets.filter((asset) => asset.contentType.startsWith("image/")),
    [assets],
  );
  const missingCount = imageAssets.filter((asset) => asset.exists === false).length;
  const proxyOnlyCount = imageAssets.filter(
    (asset) => !asset.publicUrl && asset.exists !== false,
  ).length;
  const brokenCount = imageAssets.filter((asset) => brokenAssets.has(asset.id)).length;

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await onUploadFile(file, folder);
      if (url && folder === "covers") {
        onCoverChange(url);
      }
    } catch {
      // Parent owns uploadStatus.
    } finally {
      setUploading(false);
      input.value = "";
    }
  }

  async function confirmDeleteAsset() {
    if (!pendingDeleteAsset) return;
    await onDeleteAsset(pendingDeleteAsset);
    setPendingDeleteAsset(null);
  }

  function markBroken(assetId: string) {
    setBrokenAssets((current) => new Set(current).add(assetId));
  }

  function copyAssetUrl(assetId: string, url: string) {
    void navigator.clipboard.writeText(url);
    setCopiedId(assetId);
    window.setTimeout(() => setCopiedId((cur) => (cur === assetId ? null : cur)), 1500);
  }

  return (
    <section className="studio-panel overflow-hidden">
      <header className="flex flex-col gap-4 border-b border-slate-200/70 p-4 dark:border-white/8 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge>Cloudflare R2</Badge>
            <Badge
              className={
                storage.configured
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/15 dark:text-emerald-200"
                  : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/15 dark:text-rose-200"
              }
            >
              {storage.configured ? "R2 已配置" : "R2 未配置"}
            </Badge>
            <Badge className="font-mono">{storage.bucket ?? "images"}</Badge>
            {missingCount > 0 ? (
              <Badge className="gap-1 border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/15 dark:text-rose-200">
                <AlertTriangle className="size-3" />
                {missingCount} 条缺失
              </Badge>
            ) : null}
            {brokenCount > 0 ? (
              <Badge className="gap-1 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-500/15 dark:text-amber-200">
                <AlertTriangle className="size-3" />
                {brokenCount} 条预览失败
              </Badge>
            ) : null}
            {proxyOnlyCount > 0 ? (
              <Badge>{proxyOnlyCount} 条代理预览</Badge>
            ) : null}
          </div>
          <h2 className="mt-3 font-serif text-xl font-bold sm:text-2xl">
            媒体库
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-6 text-slate-500 dark:text-slate-400">
            上传到「相册」的图片会自动展示在首页相册剪影；设为「封面」或插入正文均自动走 R2 稳定地址。
          </p>
          {!storage.configured ? (
            <p className="mt-2.5 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-200">
              R2 未完整配置时不会保存新素材，避免生成无法访问的封面或正文图片。
            </p>
          ) : null}
        </div>

        <Button
          type="button"
          className="w-full sm:w-auto"
          onClick={() => setUploadOpen(true)}
        >
          <Upload className="size-4" />
          上传图片
        </Button>
      </header>

      <div className="grid gap-3.5 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3 2xl:grid-cols-4">
        {assetsLoading
          ? Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="aspect-[4/3] animate-pulse rounded-2xl bg-surface-muted dark:bg-white/[0.06]"
              />
            ))
          : null}

        {!assetsLoading && imageAssets.length === 0 ? (
          <div className="col-span-full grid min-h-[280px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-surface-muted/40 p-6 text-center dark:border-white/10 dark:bg-white/[0.02]">
            <div>
              <FileImage className="mx-auto size-11 text-slate-300 dark:text-slate-600" />
              <h3 className="mt-3 font-serif text-lg font-bold">
                还没有上传的图片
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                点击上传按钮，把封面与相册素材存入 Cloudflare R2。
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-4"
                onClick={() => setUploadOpen(true)}
              >
                <Upload className="size-3.5" />
                上传第一张
              </Button>
            </div>
          </div>
        ) : null}

        {imageAssets.map((asset) => {
          const isMissing = asset.exists === false;
          const isBroken = brokenAssets.has(asset.id);
          const previewUrl = assetImageUrl(asset);
          const actionUrl = isBroken
            ? asset.publicUrl
            : previewUrl ?? asset.publicUrl;
          const isDeleting = deletingAssetId === asset.id;
          const isCurrentCover =
            Boolean(actionUrl && form.coverImage === actionUrl) ||
            form.coverImage === asset.objectKey ||
            form.coverImage === asset.altText;
          const canPreview = Boolean(previewUrl && !isBroken);

          return (
            <article
              key={asset.id}
              className={cn(
                "group overflow-hidden rounded-2xl border border-slate-200/75 bg-surface transition hover:border-accent-300 hover:shadow-md dark:border-white/8 dark:bg-white/[0.03]",
                isMissing &&
                  "border-rose-300/70 bg-rose-50/40 dark:border-rose-400/30 dark:bg-rose-500/10",
              )}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-surface-muted">
                {canPreview && previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={asset.altText ?? asset.objectKey}
                    className="size-full object-cover transition duration-500 group-hover:scale-105"
                    onError={() => markBroken(asset.id)}
                  />
                ) : (
                  <div className="grid size-full place-items-center p-4 text-center text-xs text-slate-400">
                    <span className="break-all">
                      {isMissing ? "R2 对象缺失，可清理记录" : asset.objectKey}
                    </span>
                  </div>
                )}

                {isCurrentCover ? (
                  <div className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow">
                    <Check className="size-3" />
                    当前封面
                  </div>
                ) : null}
                {isMissing || isBroken ? (
                  <div className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow">
                    <AlertTriangle className="size-3" />
                    {isMissing ? "缺失" : "失败"}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2.5 p-3.5">
                <div>
                  <h3 className="truncate text-xs font-bold text-slate-900 dark:text-white">
                    {asset.altText ?? fileNameOf(asset.objectKey)}
                  </h3>
                  <div className="mt-1 flex items-center justify-between font-mono text-[11px] text-slate-400">
                    <span>{asset.folder}</span>
                    <span>{formatBytes(asset.sizeBytes)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    type="button"
                    variant={isCurrentCover ? "default" : "soft"}
                    size="sm"
                    disabled={!actionUrl || isMissing}
                    onClick={() => actionUrl && onCoverChange(actionUrl)}
                  >
                    <ImagePlus className="size-3.5" />
                    封面
                  </Button>
                  <Button
                    type="button"
                    variant="glass"
                    size="sm"
                    disabled={!actionUrl || isMissing}
                    onClick={() =>
                      actionUrl &&
                      onInsertImage(actionUrl, asset.altText ?? asset.objectKey)
                    }
                  >
                    <Send className="size-3.5" />
                    插入
                  </Button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!actionUrl || isMissing}
                    onClick={() => actionUrl && copyAssetUrl(asset.id, actionUrl)}
                    className="flex min-w-0 flex-1 items-center gap-1.5 rounded-xl bg-surface-muted/80 px-2.5 py-1.5 text-left font-mono text-[11px] text-slate-500 transition hover:text-accent-600 disabled:opacity-50 dark:bg-white/[0.05] dark:text-slate-300"
                  >
                    {copiedId === asset.id ? (
                      <Check className="size-3 shrink-0 text-emerald-500" />
                    ) : (
                      <Copy className="size-3 shrink-0" />
                    )}
                    <span className="truncate">
                      {copiedId === asset.id
                        ? "已复制地址"
                        : actionUrl ?? asset.objectKey}
                    </span>
                  </button>
                  <button
                    type="button"
                    title={isMissing ? "清理记录" : "删除图片"}
                    disabled={isDeleting}
                    onClick={() => setPendingDeleteAsset(asset)}
                    className="grid size-8 shrink-0 place-items-center rounded-xl text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-500/15"
                  >
                    <Trash2 className="size-3.5" />
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
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 px-4 py-6 backdrop-blur-md">
          <div className="anime-card w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-white/8">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-accent-500">
                  Cloudflare R2 Upload
                </p>
                <h2 className="mt-0.5 font-serif text-xl font-bold">
                  上传图片素材
                </h2>
              </div>
              <button
                type="button"
                title="关闭"
                onClick={() => setUploadOpen(false)}
                className="grid size-9 place-items-center rounded-full bg-surface-muted text-slate-500 transition hover:text-slate-900 dark:bg-white/[0.08] dark:text-slate-300"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-5">
              <div className="mb-4 flex flex-wrap gap-1.5">
                {folders.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFolder(value)}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                      folder === value
                        ? "bg-accent-500 text-white shadow-sm"
                        : "bg-surface-muted text-slate-600 hover:bg-accent-50 hover:text-accent-700 dark:bg-white/[0.06] dark:text-slate-300",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <label className="grid min-h-48 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-accent-200 bg-accent-50/40 px-5 py-8 text-center transition hover:border-accent-400 hover:bg-accent-50/80 dark:border-accent-500/25 dark:bg-accent-500/8 dark:hover:bg-accent-500/14">
                <div>
                  <CloudUpload className="mx-auto size-10 text-accent-500" />
                  <p className="mt-3 font-serif text-base font-bold">
                    {uploading ? "正在上传..." : "点击选择图片上传"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    支持最大 25MB，上传后自动写入 Neon 与 R2。
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
                <p className="mt-4 rounded-xl bg-surface-muted px-3.5 py-2.5 text-xs font-medium text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                  {uploadStatus}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
