"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, LogOut } from "lucide-react";
import Link from "next/link";

import { DynamicBackdrop } from "@/components/dynamic-backdrop";
import { CommentsBoard } from "@/components/studio/comments-board";
import { MarkdownEditor } from "@/components/studio/markdown-editor";
import { MediaBoard } from "@/components/studio/media-board";
import { MusicBoard } from "@/components/studio/music-board";
import { PostsBoard } from "@/components/studio/posts-board";
import { StudioDashboard } from "@/components/studio/studio-dashboard";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import type {
  StudioMediaAsset,
  StudioMusicDownload,
  StudioMusicFavorite,
  StudioMusicLibraryItem,
  StudioMusicPlaylist,
  StudioMusicPlayHistory,
  StudioPrepareMusicDownloadInput,
  StudioPrepareMusicDownloadResult,
  StudioMusicSearchSource,
  StudioMusicSource,
  StudioMusicSourceVersionStatus,
  StudioMusicTrack,
  StudioPost,
  StudioPostForm,
  StudioResolvePluginMusicInput,
  StudioResolveMusicInput,
  StudioView,
  UploadFolder,
} from "@/components/studio/types";
import { emptyForm, postToForm, slugify } from "@/components/studio/studio-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import {
  resolveStorageObjectUrl,
  rewriteStorageObjectUrlsInText,
} from "@/lib/storage-object-url";
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

function buildExcerpt(form: StudioPostForm) {
  const content = form.content.replace(/[#>*_`[\]()!-]/g, " ").trim();

  return form.excerpt.trim() || content.slice(0, 160) || "一篇新的博客草稿。";
}

function resolveStoredCoverImage(value: string, assets: StudioMediaAsset[]) {
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

export function StudioExperience() {
  const utils = trpc.useUtils();
  const session = authClient.useSession();
  const [activeView, setActiveView] = useState<StudioView>("dashboard");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authName, setAuthName] = useState("Author");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteVerified, setInviteVerified] = useState(false);
  const [inviteChecking, setInviteChecking] = useState(true);
  const [form, setForm] = useState<StudioPostForm>(emptyForm);
  const [statusMessage, setStatusMessage] = useState("");
  const [operations, setOperations] = useState<string[]>([
    "R2 媒体库等待公网域名",
    "评论审核队列已接入",
  ]);
  const [uploadStatus, setUploadStatus] = useState("");

  const overview = trpc.studio.overview.useQuery(undefined, {
    enabled: Boolean(session.data?.user && inviteVerified),
  });
  const storage = trpc.storage.status.useQuery();
  const mediaAssets = trpc.storage.assets.useQuery(
    { limit: 36 },
    { enabled: Boolean(session.data?.user && inviteVerified) },
  );
  const musicTracks = trpc.music.playlist.useQuery(
    { includeDisabled: true, limit: 80 },
    { enabled: Boolean(session.data?.user && inviteVerified) },
  );
  const musicSources = trpc.music.sources.useQuery(undefined, {
    enabled: Boolean(session.data?.user && inviteVerified),
  });
  const musicSearchSources = trpc.music.searchSources.useQuery(undefined, {
    enabled: Boolean(session.data?.user && inviteVerified),
  });
  const musicFavorites = trpc.music.favorites.useQuery(undefined, {
    enabled: Boolean(session.data?.user && inviteVerified),
  });
  const musicPlayHistory = trpc.music.playHistory.useQuery(
    { limit: 50 },
    { enabled: Boolean(session.data?.user && inviteVerified) },
  );
  const musicDownloads = trpc.music.downloads.useQuery(
    { limit: 50 },
    { enabled: Boolean(session.data?.user && inviteVerified) },
  );
  const musicPlaylists = trpc.music.playlists.useQuery(undefined, {
    enabled: Boolean(session.data?.user && inviteVerified),
  });
  const changqingVersion = trpc.music.checkChangqingSourceVersion.useQuery(
    undefined,
    {
      enabled: Boolean(session.data?.user && inviteVerified && activeView === "music"),
      retry: false,
      staleTime: 1000 * 60 * 30,
    },
  );
  const comments = trpc.comments.studioList.useQuery(
    { limit: 40, status: "all" },
    { enabled: Boolean(session.data?.user && inviteVerified) },
  );
  const createUploadUrl = trpc.storage.createUploadUrl.useMutation();
  const completeUpload = trpc.storage.completeUpload.useMutation();
  const deleteAsset = trpc.storage.deleteAsset.useMutation({
    onSuccess: async () => {
      await utils.storage.assets.invalidate();
    },
  });
  const updateCommentStatus = trpc.comments.updateStatus.useMutation({
    onSuccess: async () => {
      await utils.comments.studioList.invalidate();
      await utils.comments.recent.invalidate();
      await utils.comments.byPost.invalidate();
    },
  });
  const deleteComment = trpc.comments.delete.useMutation({
    onSuccess: async () => {
      await utils.comments.studioList.invalidate();
      await utils.comments.recent.invalidate();
      await utils.comments.byPost.invalidate();
    },
  });
  const replyFromStudio = trpc.comments.replyFromStudio.useMutation({
    onSuccess: async () => {
      await utils.comments.studioList.invalidate();
      await utils.comments.recent.invalidate();
      await utils.comments.byPost.invalidate();
    },
  });
  const upsertTrack = trpc.music.upsertTrack.useMutation({
    onSuccess: async () => {
      await utils.music.playlist.invalidate();
    },
  });
  const deleteTrack = trpc.music.deleteTrack.useMutation({
    onSuccess: async () => {
      await utils.music.playlist.invalidate();
    },
  });
  const resolveTrack = trpc.music.resolveTrack.useMutation();
  const resolvePluginTrack = trpc.music.resolvePluginTrack.useMutation();
  const toggleMusicFavorite = trpc.music.toggleFavorite.useMutation({
    onSuccess: async () => {
      await utils.music.favorites.invalidate();
    },
  });
  const createMusicPlaylist = trpc.music.createPlaylist.useMutation({
    onSuccess: async () => {
      await utils.music.playlists.invalidate();
    },
  });
  const updateMusicPlaylist = trpc.music.updatePlaylist.useMutation({
    onSuccess: async () => {
      await utils.music.playlists.invalidate();
    },
  });
  const deleteMusicPlaylist = trpc.music.deletePlaylist.useMutation({
    onSuccess: async () => {
      await utils.music.playlists.invalidate();
    },
  });
  const addMusicPlaylistItem = trpc.music.addPlaylistItem.useMutation({
    onSuccess: async () => {
      await utils.music.playlists.invalidate();
    },
  });
  const removeMusicPlaylistItem = trpc.music.removePlaylistItem.useMutation({
    onSuccess: async () => {
      await utils.music.playlists.invalidate();
    },
  });
  const reorderMusicPlaylistItems = trpc.music.reorderPlaylistItems.useMutation({
    onSuccess: async () => {
      await utils.music.playlists.invalidate();
    },
  });
  const recordMusicPlay = trpc.music.recordPlay.useMutation({
    onSuccess: async () => {
      await utils.music.playHistory.invalidate();
    },
  });
  const prepareMusicDownload = trpc.music.prepareDownload.useMutation({
    onError: (error, input) => {
      console.warn("[music.prepareDownload] failed", {
        data: error.data,
        input,
        message: error.message,
      });
    },
    onSuccess: async () => {
      await utils.music.downloads.invalidate();
    },
  });
  const deleteMusicDownload = trpc.music.deleteDownload.useMutation({
    onSuccess: async () => {
      await utils.music.downloads.invalidate();
    },
  });
  const importChangqingSource = trpc.music.importChangqingSource.useMutation({
    onSuccess: async () => {
      await utils.music.sources.invalidate();
    },
  });
  const updateChangqingSource = trpc.music.updateChangqingSource.useMutation({
    onSuccess: async () => {
      await utils.music.sources.invalidate();
      await utils.music.checkChangqingSourceVersion.invalidate();
    },
  });
  const importDefaultSearchSources =
    trpc.music.importDefaultSearchSources.useMutation({
      onSuccess: async () => {
        await utils.music.searchSources.invalidate();
        await utils.music.pluginSearch.invalidate();
      },
    });
  const updateSearchSource = trpc.music.updateSearchSource.useMutation({
    onSuccess: async () => {
      await utils.music.searchSources.invalidate();
      await utils.music.pluginSearch.invalidate();
    },
  });
  const testSearchSource = trpc.music.testSearchSource.useMutation({
    onSuccess: async () => {
      await utils.music.searchSources.invalidate();
    },
  });
  const upsertPost = trpc.studio.upsertPost.useMutation({
    onSuccess: async () => {
      await utils.studio.overview.invalidate();
      await utils.blog.feed.invalidate();
    },
  });
  const deletePost = trpc.studio.deletePost.useMutation({
    onSuccess: async () => {
      setStatusMessage("文章已删除。");
      setForm(emptyForm);
      setActiveView("posts");
      await utils.studio.overview.invalidate();
      await utils.blog.feed.invalidate();
      await utils.blog.dashboard.invalidate();
      await utils.comments.studioList.invalidate();
      await utils.comments.recent.invalidate();
    },
  });

  const stats = overview.data?.stats ?? {
    total: 0,
    published: 0,
    drafts: 0,
    views: 0,
  };
  const posts = useMemo(
    () => (overview.data?.posts ?? []) as StudioPost[],
    [overview.data?.posts],
  );
  const storageStatus =
    storage.data ?? {
      provider: "Cloudflare R2",
      configured: false,
      bucket: null,
      publicBaseUrl: null,
    };
  const recentComments = comments.data ?? [];
  const assets = mediaAssets.data ?? [];
  const tracks = (musicTracks.data ?? []) as StudioMusicTrack[];
  const sources = (musicSources.data ?? []) as StudioMusicSource[];
  const searchSources = (musicSearchSources.data ?? []) as StudioMusicSearchSource[];
  const favorites = (musicFavorites.data ?? []) as StudioMusicFavorite[];
  const playHistory = (musicPlayHistory.data ?? []) as StudioMusicPlayHistory[];
  const downloads = (musicDownloads.data ?? []) as StudioMusicDownload[];
  const playlists = (musicPlaylists.data ?? []) as StudioMusicPlaylist[];
  const sourceVersionStatus =
    changqingVersion.data as StudioMusicSourceVersionStatus | undefined;

  useEffect(() => {
    let cancelled = false;

    async function checkInvite() {
      try {
        const response = await fetch("/api/studio/invite", {
          cache: "no-store",
          credentials: "include",
        });
        const data = (await response.json()) as { verified?: boolean };

        if (!cancelled) {
          setInviteVerified(Boolean(data.verified));
        }
      } catch {
        if (!cancelled) {
          setInviteVerified(false);
        }
      } finally {
        if (!cancelled) {
          setInviteChecking(false);
        }
      }
    }

    void checkInvite();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateForm(patch: Partial<StudioPostForm>) {
    setStatusMessage("");
    setForm((current) => ({ ...current, ...patch }));
  }

  function startNewPost() {
    setStatusMessage("");
    setForm(emptyForm);
    setActiveView("editor");
  }

  function editPost(post: StudioPost) {
    setStatusMessage("");
    setForm(postToForm(post));
    setActiveView("editor");
  }

  function insertImageIntoContent(url: string, altText = "image") {
    setActiveView("editor");
    updateForm({
      content: `${form.content.trimEnd()}\n\n![${altText}](${resolveStorageObjectUrl(url)})\n`,
    });
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviteError("");

    const response = await fetch("/api/studio/invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ code: inviteCode }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      setInviteError(data.message ?? "邀请码不正确，请再确认一次。");
      return;
    }

    setInviteCode("");
    setInviteVerified(true);
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");

    const result =
      authMode === "signin"
        ? await authClient.signIn.email({
            email: authEmail,
            password: authPassword,
          })
        : await authClient.signUp.email({
            name: authName,
            email: authEmail,
            password: authPassword,
          });

    if (result.error) {
      setAuthError(result.error.message ?? "登录失败，请检查账号信息。");
      return;
    }

    setAuthPassword("");
    await session.refetch();
  }

  async function signOut() {
    await authClient.signOut();
    await fetch("/api/studio/invite", {
      method: "DELETE",
      credentials: "include",
    });
    setInviteVerified(false);
    await session.refetch();
  }

  async function savePost(patch: Partial<StudioPostForm> = {}) {
    setStatusMessage("");

    const nextForm = { ...form, ...patch };
    const title = nextForm.title.trim() || "Untitled";
    const slug = slugify(nextForm.slug || title) || `post-${Date.now().toString(36)}`;
    const excerpt = buildExcerpt(nextForm);
    const content =
      rewriteStorageObjectUrlsInText(nextForm.content.trim()) || excerpt;
    const readingMinutes = Math.max(
      1,
      Math.min(120, Number(nextForm.readingMinutes) || 1),
    );
    const coverImage = resolveStoredCoverImage(nextForm.coverImage, assets);
    const payload = {
      ...nextForm,
      title,
      slug,
      excerpt,
      content,
      coverImage,
      readingMinutes,
    };

    setForm(payload);

    try {
      const result = await upsertPost.mutateAsync({
        id: payload.id,
        slug: payload.slug,
        title: payload.title,
        excerpt: payload.excerpt,
        content: payload.content,
        coverImage: payload.coverImage,
        category: payload.category,
        mood: payload.mood,
        tags: payload.tagsText
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        readingMinutes: payload.readingMinutes,
        featured: payload.featured,
        published: payload.published,
      });

      setForm((current) => ({ ...current, ...payload, id: result.id }));
      setStatusMessage(payload.published ? "文章已发布到 Neon。" : "草稿已保存到 Neon。");
      setOperations((current) =>
        [
          `${payload.published ? "发布" : "保存"}文章：${payload.title}`,
          ...current,
        ].slice(0, 6),
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? `保存失败：${error.message}`
          : "保存失败，请稍后再试。",
      );
      throw error;
    }
  }

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
    setOperations((current) => [`上传素材：${file.name}`, ...current].slice(0, 6));
    await utils.storage.assets.invalidate();

    return uploadedUrl ? resolveStorageObjectUrl(uploadedUrl) : uploadedUrl;
  }

  function updateComment(
    commentId: string,
    status: "approved" | "pending" | "spam",
  ) {
    updateCommentStatus.mutate({ id: commentId, status });
  }

  function removeComment(commentId: string) {
    deleteComment.mutate({ id: commentId });
  }

  async function replyToComment(commentId: string, body: string) {
    await replyFromStudio.mutateAsync({ parentId: commentId, body });
    setOperations((current) => [`回复评论：${body.slice(0, 24)}`, ...current].slice(0, 6));
  }

  async function saveTrack(input: {
    id?: string;
    title: string;
    artist: string;
    album: string;
    coverUrl: string;
    audioUrl: string;
    lyric: string;
    provider: StudioMusicTrack["provider"];
    sourceSongId: string;
    quality: StudioMusicTrack["quality"];
    sortOrder: number;
    enabled: boolean;
  }) {
    await upsertTrack.mutateAsync(input);
    setOperations((current) => [`保存音乐：${input.title}`, ...current].slice(0, 6));
  }

  function removeTrack(track: StudioMusicTrack) {
    deleteTrack.mutate({ id: track.id });
    setOperations((current) => [`删除音乐：${track.title}`, ...current].slice(0, 6));
  }

  async function resolveMusic(input: StudioResolveMusicInput) {
    const result = await resolveTrack.mutateAsync(input);

    setOperations((current) =>
      [`解析音源：${input.provider}/${input.quality}`, ...current].slice(0, 6),
    );

    return result;
  }

  async function resolvePluginMusic(input: StudioResolvePluginMusicInput) {
    const result = await resolvePluginTrack.mutateAsync(input);
    const provider: StudioMusicTrack["provider"] =
      input.provider === "bilibili" ? "manual" : input.provider;

    setOperations((current) =>
      [`插件播放：${input.provider}/${input.quality}`, ...current].slice(0, 6),
    );

    return {
      audioUrl: result.audioUrl,
      lyric: result.lyric ?? "",
      lyricSource: result.lyricSource,
      provider,
      quality: input.quality,
      sourceFileName: input.provider,
      warnings: result.warnings,
    };
  }

  async function importChangqingMusicSource() {
    const source = await importChangqingSource.mutateAsync();

    setOperations((current) =>
      [`导入音源：${source.name}`, ...current].slice(0, 6),
    );
  }

  async function checkChangqingMusicVersion() {
    const result = await changqingVersion.refetch();

    if (!result.data) {
      throw new Error("没有拿到长青源远端版本信息。");
    }

    const status = result.data as StudioMusicSourceVersionStatus;

    setOperations((current) =>
      [
        status.error
          ? `长青源远端检查失败：${status.error}`
          : status.updateAvailable
          ? `长青源发现新版：${status.remoteVersion}`
          : `长青源版本已对齐：${status.remoteVersion || status.localVersion}`,
        ...current,
      ].slice(0, 6),
    );

    return status;
  }

  async function updateChangqingMusicSource(sourceCode: string) {
    const source = await updateChangqingSource.mutateAsync({ sourceCode });

    setOperations((current) =>
      [`更新长青源：${source.version}`, ...current].slice(0, 6),
    );
  }

  async function importDefaultMusicSearchSources() {
    const sources = await importDefaultSearchSources.mutateAsync();

    setOperations((current) =>
      [`同步搜索源：${sources.length} 个`, ...current].slice(0, 6),
    );
  }

  async function updateMusicSearchSource(
    source: StudioMusicSearchSource,
    patch: Partial<Pick<StudioMusicSearchSource, "enabled" | "name" | "sortOrder" | "url" | "version">>,
  ) {
    await updateSearchSource.mutateAsync({
      id: source.id,
      ...patch,
    });

    setOperations((current) =>
      [`更新搜索源：${source.name}`, ...current].slice(0, 6),
    );
  }

  async function testMusicSearchSource(
    source: StudioMusicSearchSource,
    keyword: string,
  ) {
    const result = await testSearchSource.mutateAsync({
      id: source.id,
      keyword,
    });

    setOperations((current) =>
      [`测试搜索源：${source.name} ${result.total} 条`, ...current].slice(0, 6),
    );

    return result;
  }

  async function toggleFavorite(input: StudioMusicLibraryItem) {
    const result = await toggleMusicFavorite.mutateAsync(input);

    setOperations((current) =>
      [
        `${result.liked ? "收藏音乐" : "取消收藏"}：${input.title}`,
        ...current,
      ].slice(0, 6),
    );
  }

  function recordPlay(input: StudioMusicLibraryItem) {
    recordMusicPlay.mutate(input, {
      onSuccess: () => {
        setOperations((current) =>
          [`播放记录：${input.title}`, ...current].slice(0, 6),
        );
      },
    });
  }

  async function prepareDownload(
    input: StudioPrepareMusicDownloadInput,
  ): Promise<StudioPrepareMusicDownloadResult> {
    let result: Awaited<ReturnType<typeof prepareMusicDownload.mutateAsync>>;

    try {
      result = await prepareMusicDownload.mutateAsync(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      setOperations((current) =>
        [`下载失败：${input.title} · ${message}`, ...current].slice(0, 6),
      );
      throw error;
    }

    setOperations((current) =>
      [`下载音乐：${input.title}`, ...current].slice(0, 6),
    );

    return result as StudioPrepareMusicDownloadResult;
  }

  async function deleteMusicDownloadRecord(download: StudioMusicDownload) {
    await deleteMusicDownload.mutateAsync({ id: download.id });

    setOperations((current) =>
      [`删除下载：${download.title}`, ...current].slice(0, 6),
    );
  }

  async function createPlaylist(name: string) {
    await createMusicPlaylist.mutateAsync({ name });

    setOperations((current) =>
      [`创建歌单：${name}`, ...current].slice(0, 6),
    );
  }

  async function deletePlaylist(playlist: StudioMusicPlaylist) {
    await deleteMusicPlaylist.mutateAsync({ id: playlist.id });

    setOperations((current) =>
      [`删除歌单：${playlist.name}`, ...current].slice(0, 6),
    );
  }

  async function updatePlaylist(
    playlist: StudioMusicPlaylist,
    patch: Partial<
      Pick<
        StudioMusicPlaylist,
        "coverUrl" | "description" | "name" | "sortOrder"
      >
    >,
  ) {
    await updateMusicPlaylist.mutateAsync({ id: playlist.id, ...patch });

    setOperations((current) =>
      [`更新歌单：${patch.name ?? playlist.name}`, ...current].slice(0, 6),
    );
  }

  async function addPlaylistItem(
    playlistId: string,
    item: StudioMusicLibraryItem,
  ) {
    await addMusicPlaylistItem.mutateAsync({ item, playlistId });

    setOperations((current) =>
      [`加入歌单：${item.title}`, ...current].slice(0, 6),
    );
  }

  async function removePlaylistItem(input: {
    id: string;
    playlistId: string;
    title: string;
  }) {
    await removeMusicPlaylistItem.mutateAsync({
      id: input.id,
      playlistId: input.playlistId,
    });

    setOperations((current) =>
      [`移出歌单：${input.title}`, ...current].slice(0, 6),
    );
  }

  async function reorderPlaylistItems(playlistId: string, itemIds: string[]) {
    await reorderMusicPlaylistItems.mutateAsync({ itemIds, playlistId });

    setOperations((current) =>
      ["重排歌单歌曲", ...current].slice(0, 6),
    );
  }

  function deleteCurrentPost() {
    if (form.id) {
      deletePost.mutate({ id: form.id });
    }
  }

  function deleteSelectedPost(post: StudioPost) {
    deletePost.mutate({ id: post.id });
  }

  async function deleteMediaAsset(asset: StudioMediaAsset) {
    await deleteAsset.mutateAsync({ id: asset.id });

    if (
      form.coverImage === asset.publicUrl ||
      form.coverImage === asset.previewUrl ||
      form.coverImage === asset.objectKey
    ) {
      updateForm({ coverImage: emptyForm.coverImage });
    }
  }

  const musicBoard = (
    <MusicBoard
      mode={activeView === "music" ? "full" : "background"}
      isLoading={musicTracks.isLoading}
      isResolving={resolveTrack.isPending || resolvePluginTrack.isPending}
      isSaving={upsertTrack.isPending}
      isSourceImporting={importChangqingSource.isPending}
      isSearchSourceUpdating={
        importDefaultSearchSources.isPending ||
        updateSearchSource.isPending ||
        testSearchSource.isPending
      }
      isSourceUpdating={
        updateChangqingSource.isPending || changqingVersion.isFetching
      }
      sourceVersionStatus={sourceVersionStatus}
      favorites={favorites}
      downloads={downloads}
      playlists={playlists}
      playHistory={playHistory}
      searchSources={searchSources}
      sources={sources}
      tracks={tracks}
      uploadStatus={uploadStatus}
      onDelete={removeTrack}
      onAddPlaylistItem={addPlaylistItem}
      onCheckChangqingVersion={checkChangqingMusicVersion}
      onCreatePlaylist={createPlaylist}
      onImportDefaultSearchSources={importDefaultMusicSearchSources}
      onImportChangqingSource={importChangqingMusicSource}
      onPluginResolveMusic={resolvePluginMusic}
      onRecordPlay={recordPlay}
      onDeleteDownload={deleteMusicDownloadRecord}
      onDeletePlaylist={deletePlaylist}
      onPrepareDownload={prepareDownload}
      onReorderPlaylistItems={reorderPlaylistItems}
      onRemovePlaylistItem={removePlaylistItem}
      onResolveMusic={resolveMusic}
      onSave={saveTrack}
      onToggleFavorite={toggleFavorite}
      onUpdatePlaylist={updatePlaylist}
      onUpdateSearchSource={updateMusicSearchSource}
      onTestSearchSource={testMusicSearchSource}
      onUpdateChangqingSource={updateChangqingMusicSource}
      onUploadAudio={uploadFile}
      deletingDownloadId={
        deleteMusicDownload.variables &&
        "id" in deleteMusicDownload.variables &&
        deleteMusicDownload.isPending
          ? deleteMusicDownload.variables.id
          : null
      }
    />
  );

  function renderWorkspace() {
    switch (activeView) {
      case "dashboard":
        return (
          <StudioDashboard
            commentsCount={recentComments.length}
            operations={operations}
            posts={posts}
            stats={stats}
            storage={storageStatus}
            onViewChange={setActiveView}
          />
        );
      case "posts":
        return (
          <PostsBoard
            isLoading={overview.isLoading}
            posts={posts}
            onDelete={deleteSelectedPost}
            onEdit={editPost}
            onNew={startNewPost}
          />
        );
      case "media":
        return (
          <MediaBoard
            assets={assets}
            assetsLoading={mediaAssets.isLoading}
            form={form}
            storage={storageStatus}
            uploadStatus={uploadStatus}
            onCoverChange={(coverImage) => updateForm({ coverImage })}
            onDeleteAsset={deleteMediaAsset}
            onInsertImage={insertImageIntoContent}
            deletingAssetId={
              deleteAsset.variables &&
              "id" in deleteAsset.variables &&
              deleteAsset.isPending
                ? deleteAsset.variables.id
                : null
            }
            onUploadFile={uploadFile}
          />
        );
      case "music":
        return musicBoard;
      case "comments":
        return (
          <CommentsBoard
            comments={recentComments}
            isDeleting={deleteComment.isPending}
            isLoading={comments.isLoading}
            isReplying={replyFromStudio.isPending}
            isUpdating={updateCommentStatus.isPending}
            onDelete={removeComment}
            onReply={replyToComment}
            onStatusChange={updateComment}
          />
        );
      case "editor":
      default:
        return (
          <MarkdownEditor
            form={form}
            isDeleting={deletePost.isPending}
            isSaving={upsertPost.isPending}
            posts={posts}
            statusMessage={statusMessage}
            uploadStatus={uploadStatus}
            onChange={updateForm}
            onDelete={deleteCurrentPost}
            onOpenPost={editPost}
            onSave={savePost}
            onUploadImage={uploadFile}
          />
        );
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-3 pb-12 pt-4 text-slate-950 dark:text-white sm:px-6 sm:pb-16 sm:pt-6 lg:px-8">
      <DynamicBackdrop ambientMode="night" />

      <nav className="relative z-20 mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 rounded-[1.5rem] border border-white/45 bg-white/35 px-3 py-3 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/30 sm:rounded-full sm:px-4">
        <Link href="/" className="flex items-center gap-3 text-sm font-bold">
          <span className="grid size-11 place-items-center rounded-full bg-slate-950 text-white dark:bg-white dark:text-slate-950">
            <ArrowLeft className="size-5" />
          </span>
          <span className="hidden sm:inline">返回博客</span>
          <span className="sm:hidden">博客</span>
        </Link>
        <div className="flex items-center gap-2">
          <Badge className="hidden sm:inline-flex">Creator Studio</Badge>
          {session.data?.user ? (
            <Button type="button" variant="glass" size="sm" onClick={signOut}>
              <LogOut className="size-4" />
              <span className="hidden sm:inline">退出登录</span>
              <span className="sm:hidden">退出</span>
            </Button>
          ) : null}
        </div>
      </nav>

      {!inviteVerified || !session.data?.user ? (
        <StudioGate
          authEmail={authEmail}
          authError={authError}
          authMode={authMode}
          authName={authName}
          authPassword={authPassword}
          inviteChecking={inviteChecking}
          inviteCode={inviteCode}
          inviteError={inviteError}
          inviteVerified={inviteVerified}
          onAuthEmailChange={setAuthEmail}
          onAuthModeChange={setAuthMode}
          onAuthNameChange={setAuthName}
          onAuthPasswordChange={setAuthPassword}
          onAuthSubmit={handleAuth}
          onInviteChange={setInviteCode}
          onInviteSubmit={handleInvite}
        />
      ) : (
        <StudioShell
          activeView={activeView}
          operations={operations}
          stats={stats}
          userName={session.data.user.name}
          onNewPost={startNewPost}
          onSignOut={signOut}
          onViewChange={setActiveView}
        >
          {renderWorkspace()}
        </StudioShell>
      )}
      {inviteVerified && session.data?.user && activeView !== "music"
        ? musicBoard
        : null}
    </main>
  );
}
