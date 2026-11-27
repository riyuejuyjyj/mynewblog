"use client";

import { useState } from "react";

import type { StudioMediaAsset, UploadFolder } from "@/components/studio/types";
import { resolveStorageObjectUrl } from "@/lib/storage-object-url";
import { trpc } from "@/trpc/client";

const MAX_UPLOAD_SIZE = 25 * 1024 * 1024;
const DIRECT_UPLOAD_TIMEOUT_MS = 20_000;

function fileNameOf(value: string) {
  const cleanValue = value.split(/[?#]/)[0] ?? value;
  return cleanValue.split("/").filter(Boolean).pop() ?? cleanValue;
}

function normalizeAssetValue(value: string | null | undefined) {
  return (value ?? "").trim();
}

export function resolveStoredCoverImage(
  value: string,
  assets: StudioMediaAsset[],
) {
  const current = value.trim();

  if (!current) {
    return current;
  }

  const normalizedCurrent = resolveStorageObjectUrl(current);

  if (
    normalizedCurrent !== current ||
    /^(https?:\/\/|data:image\/|blob:)/i.test(current)
  ) {
    return normalizedCurrent;
  }

  const currentFileName = fileNameOf(current);
  const matchedAsset = assets.find((asset) => {
    const publicUrl = normalizeAssetValue(asset.publicUrl);
    const previewUrl = normalizeAssetValue(asset.previewUrl);
    const objectKey = normalizeAssetValue(asset.objectKey);
    const altText = normalizeAssetValue(asset.altText);
    const objectFileName = fileNameOf(objectKey);
    const altFileName = altText ? fileNameOf(altText) : "";

    return (
      publicUrl === current ||
      previewUrl === current ||
      objectKey === current ||
      altText === current ||
      objectFileName === current ||
      objectFileName === currentFileName ||
      altFileName === current ||
      altFileName === currentFileName ||
      objectKey.endsWith(`/${current}`)
    );
  });

  return resolveStorageObjectUrl(
    matchedAsset?.previewUrl ?? matchedAsset?.publicUrl ?? current,
  );
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function uploadViaServer(file: File, folder: UploadFolder) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const response = await fetchWithTimeout(
    "/api/storage/upload",
    {
      method: "POST",
      credentials: "include",
      body: formData,
    },
    DIRECT_UPLOAD_TIMEOUT_MS,
  );
  const data = (await response.json().catch(() => ({}))) as {
    message?: string;
    previewUrl?: string | null;
    publicUrl?: string | null;
  };

  if (!response.ok) {
    throw new Error(data.message ?? "Server upload failed.");
  }

  return data.previewUrl ?? data.publicUrl ?? null;
}

function summarizeUploadError(error: unknown) {
  return error instanceof Error ? error.message : "未知错误";
}

export function useStudioUpload(onOperation: (entry: string) => void) {
  const utils = trpc.useUtils();
  const [uploadStatus, setUploadStatus] = useState("");
  const createUploadUrl = trpc.storage.createUploadUrl.useMutation();
  const completeUpload = trpc.storage.completeUpload.useMutation();

  async function uploadFile(file: File, folder: UploadFolder) {
    if (file.size > MAX_UPLOAD_SIZE) {
      setUploadStatus("文件超过 25MB，已取消上传。");
      return null;
    }

    setUploadStatus("正在生成 R2 上传签名...");

    let upload: Awaited<ReturnType<typeof createUploadUrl.mutateAsync>>;

    try {
      upload = await createUploadUrl.mutateAsync({
        folder,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        altText: file.name,
      });
    } catch (error) {
      setUploadStatus(`生成 R2 上传签名失败：${summarizeUploadError(error)}`);
      return null;
    }

    if (!upload.configured || !upload.uploadUrl) {
      setUploadStatus("R2 尚未完整配置，不能保存新的媒体文件。");
      return null;
    }

    setUploadStatus("正在上传到 R2...");

    let uploadedUrl = upload.previewUrl ?? upload.publicUrl;

    try {
      const response = await fetchWithTimeout(
        upload.uploadUrl,
        {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        },
        DIRECT_UPLOAD_TIMEOUT_MS,
      );

      if (!response.ok) {
        throw new Error(`R2 direct upload failed with ${response.status}.`);
      }

      await completeUpload.mutateAsync({
        bucket: upload.bucket,
        objectKey: upload.objectKey,
        publicUrl: upload.publicUrl,
        folder,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        altText: file.name,
      });
    } catch (directError) {
      setUploadStatus(
        `浏览器直传失败，正在改用服务端上传：${summarizeUploadError(directError)}`,
      );

      try {
        uploadedUrl = await uploadViaServer(file, folder);
      } catch (serverError) {
        setUploadStatus(`服务端上传也失败：${summarizeUploadError(serverError)}`);
        return null;
      }
    }

    if (!uploadedUrl) {
      setUploadStatus("上传失败，没有得到可用 URL。");
      return null;
    }

    setUploadStatus(
      upload.publicUrl
        ? "上传完成，公网 URL 已写入。"
        : "上传完成，当前使用后台代理预览 URL。",
    );
    onOperation(`上传素材：${file.name}`);
    await utils.storage.assets.invalidate();

    return uploadedUrl ? resolveStorageObjectUrl(uploadedUrl) : uploadedUrl;
  }

  return {
    uploadFile,
    uploadStatus,
  };
}
