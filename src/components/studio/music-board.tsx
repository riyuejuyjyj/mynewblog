"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Search,
} from "lucide-react";
import {
  type SyntheticEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { MusicBackgroundPlayer } from "@/components/studio/music/music-background-player";
import { MusicBottomPlayer } from "@/components/studio/music/music-bottom-player";
import {
  type DownloadStorageFilter,
  getDownloadFilterEmptyText,
  MusicDownloadsPanel,
} from "@/components/studio/music/music-downloads-panel";
import type {
  MusicPlaybackDiagnosticEvent,
  MusicPlaybackDiagnostics,
} from "@/components/studio/music/music-playback-diagnostics-panel";
import { MusicImmersivePlayer } from "@/components/studio/music/music-immersive-player";
import { MusicLibraryPanel } from "@/components/studio/music/music-library-panel";
import { MusicMemoryList } from "@/components/studio/music/music-memory-list";
import { MusicPlaylistBoard } from "@/components/studio/music/music-playlist-board";
import {
  emptyMusicForm,
  formatTime,
  getPlayerCover,
  pluginProviderLabels,
  providerLabels,
  type MusicPlaybackSourceStatus,
  type MusicForm,
  trackToForm,
} from "@/components/studio/music/music-model";
import {
  MusicStudioSidebar,
  type MusicSidebarView,
} from "@/components/studio/music/music-studio-sidebar";
import { MusicSourcesPanel } from "@/components/studio/music/music-sources-panel";
import { MusicTrackDialog } from "@/components/studio/music/music-track-dialog";
import { useMusicMediaSession } from "@/components/studio/music/use-music-media-session";
import type {
  StudioMusicDownload,
  StudioMusicDownloadProgress,
  StudioMusicFavorite,
  StudioMusicLibraryItem,
  StudioMusicPlaybackMode,
  StudioMusicPlaylist,
  StudioMusicPlaylistImportResult,
  StudioMusicPlaylistItem,
  StudioMusicPlayHistory,
  StudioMusicQueueItem,
  StudioPrepareMusicDownloadInput,
  StudioPrepareMusicDownloadResult,
  StudioQingMusicManifestStatus,
  StudioMusicSearchSourceTestResult,
  StudioMusicSearchSource,
  StudioMusicPluginProvider,
  StudioMusicTrack,
  StudioMusicSearchCandidate,
  StudioMusicSource,
  StudioMusicSourceVersionStatus,
  StudioResolvedMusicUrl,
  StudioResolvePluginMusicInput,
  StudioResolveMusicInput,
  UploadFolder,
} from "@/components/studio/types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { trpc } from "@/trpc/client";

type MusicBoardProps = {
  mode?: "full" | "background";
  isLoading: boolean;
  isResolving: boolean;
  isSaving: boolean;
  isPlaylistImporting: boolean;
  isSourceImporting: boolean;
  isSourceUpdating: boolean;
  isSearchSourceUpdating: boolean;
  downloads: StudioMusicDownload[];
  favorites: StudioMusicFavorite[];
  playlists: StudioMusicPlaylist[];
  playHistory: StudioMusicPlayHistory[];
  tracks: StudioMusicTrack[];
  sourceVersionStatus?: StudioMusicSourceVersionStatus;
  qingMusicStatus?: StudioQingMusicManifestStatus;
  searchSources: StudioMusicSearchSource[];
  sources: StudioMusicSource[];
  uploadStatus: string;
  deletingDownloadId?: string | null;
  onDelete: (track: StudioMusicTrack) => void;
  onAddPlaylistItem: (
    playlistId: string,
    item: StudioMusicLibraryItem,
  ) => Promise<void>;
  onDeleteDownload: (download: StudioMusicDownload) => Promise<void>;
  onDeletePlaylist: (playlist: StudioMusicPlaylist) => Promise<void>;
  onCreatePlaylist: (name: string) => Promise<void>;
  onUpdatePlaylist: (
    playlist: StudioMusicPlaylist,
    patch: Partial<
      Pick<
        StudioMusicPlaylist,
        "coverUrl" | "description" | "name" | "sortOrder"
      >
    >,
  ) => Promise<void>;
  onReorderPlaylistItems: (
    playlistId: string,
    itemIds: string[],
  ) => Promise<void>;
  onCheckChangqingVersion: () => Promise<StudioMusicSourceVersionStatus>;
  onImportExternalPlaylist: (
    url: string,
  ) => Promise<StudioMusicPlaylistImportResult>;
  onImportDefaultSearchSources: () => Promise<void>;
  onImportChangqingSource: () => Promise<void>;
  onPluginResolveMusic: (input: StudioResolvePluginMusicInput) => Promise<StudioResolvedMusicUrl>;
  onPrepareDownload: (
    input: StudioPrepareMusicDownloadInput,
  ) => Promise<StudioPrepareMusicDownloadResult>;
  onRecordPlay: (input: StudioMusicLibraryItem) => void;
  onRemovePlaylistItem: (input: {
    id: string;
    playlistId: string;
    title: string;
  }) => Promise<void>;
  onResolveMusic: (input: StudioResolveMusicInput) => Promise<StudioResolvedMusicUrl>;
  onSave: (form: MusicForm) => Promise<void>;
  onToggleFavorite: (input: StudioMusicLibraryItem) => Promise<void>;
  onUpdateSearchSource: (
    source: StudioMusicSearchSource,
    patch: Partial<Pick<StudioMusicSearchSource, "enabled" | "name" | "sortOrder" | "url" | "version">>,
  ) => Promise<void>;
  onTestSearchSource: (
    source: StudioMusicSearchSource,
    keyword: string,
  ) => Promise<StudioMusicSearchSourceTestResult>;
  onUpdateChangqingSource: (sourceCode: string) => Promise<void>;
  onUploadAudio: (file: File, folder: UploadFolder) => Promise<string | null>;
};

type RuntimeSourceHealth = {
  failures: number;
  lastReason: string;
  penalty: number;
  successes: number;
  updatedAt: string;
};

type PlaybackMediaPhase =
  | "can-play"
  | "ended"
  | "error"
  | "idle"
  | "loading"
  | "metadata"
  | "paused"
  | "playing"
  | "stalled"
  | "waiting";

type PlaybackPauseKind =
  | "browser-policy"
  | "ended"
  | "media-error"
  | "play-interrupted"
  | "source-switch"
  | "track-change"
  | "unknown"
  | "user";

type PlaybackPauseIntent = {
  detail?: string;
  kind: PlaybackPauseKind;
  suppressTimeline?: boolean;
  title: string;
  tone?: MusicPlaybackDiagnosticEvent["tone"];
};

type PlaybackAttemptFailure = {
  detail: string;
  kind: PlaybackPauseKind;
  penalizeSource: boolean;
  title: string;
  tone: MusicPlaybackDiagnosticEvent["tone"];
};

type StoredMusicPlaybackSnapshot = {
  candidate?: StudioMusicSearchCandidate;
  currentTime: number;
  duration: number;
  itemKey: string;
  kind: "candidate" | "track";
  trackId?: string;
};

const audioExtensions = new Set(["aac", "flac", "m4a", "mp3", "ogg", "opus", "wav"]);
const pluginProviderKeys = new Set<StudioMusicPluginProvider>([
  "bilibili",
  "kg",
  "kw",
  "mg",
  "tx",
  "wy",
]);

function isStudioMusicPluginProvider(
  value: string | undefined,
): value is StudioMusicPluginProvider {
  return Boolean(value && pluginProviderKeys.has(value as StudioMusicPluginProvider));
}

const musicPlayerStorageKeys = {
  currentQueueKey: "mynewblog:music:current-queue-key",
  playbackSnapshot: "mynewblog:music:playback-snapshot",
  playbackMode: "mynewblog:music:playback-mode",
  queueItems: "mynewblog:music:queue-items",
  volume: "mynewblog:music:volume",
} as const;

const musicPlaybackModes = new Set<StudioMusicPlaybackMode>([
  "repeat-all",
  "repeat-one",
  "shuffle",
]);

const musicQueueKinds = new Set<StudioMusicQueueItem["kind"]>([
  "candidate",
  "library",
  "track",
]);

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getStoredMusicValue(key: string) {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStoredMusicValue(key: string, value: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked in privacy modes; playback should still work.
  }
}

function isStoredMusicQueueItem(value: unknown): value is StudioMusicQueueItem {
  if (!isRecordValue(value)) return false;

  return (
    typeof value.artist === "string" &&
    (
      typeof value.candidate === "undefined" ||
      isStoredMusicSearchCandidate(value.candidate)
    ) &&
    typeof value.coverUrl === "string" &&
    typeof value.key === "string" &&
    typeof value.kind === "string" &&
    musicQueueKinds.has(value.kind as StudioMusicQueueItem["kind"]) &&
    (
      typeof value.libraryItemKey === "undefined" ||
      typeof value.libraryItemKey === "string"
    ) &&
    typeof value.sourceLabel === "string" &&
    typeof value.title === "string"
  );
}

function isStoredMusicSearchCandidate(
  value: unknown,
): value is StudioMusicSearchCandidate {
  if (!isRecordValue(value)) return false;

  return (
    typeof value.album === "string" &&
    typeof value.artist === "string" &&
    typeof value.artwork === "string" &&
    typeof value.duration === "number" &&
    Number.isFinite(value.duration) &&
    typeof value.id === "string" &&
    isRecordValue(value.raw) &&
    typeof value.source === "string" &&
    isStudioMusicPluginProvider(value.source) &&
    typeof value.title === "string"
  );
}

function normalizeStoredMusicPlaybackSnapshot(
  value: unknown,
): StoredMusicPlaybackSnapshot | null {
  if (!isRecordValue(value)) return null;

  const currentTime =
    typeof value.currentTime === "number" && Number.isFinite(value.currentTime)
      ? Math.max(0, value.currentTime)
      : 0;
  const duration =
    typeof value.duration === "number" && Number.isFinite(value.duration)
      ? Math.max(0, value.duration)
      : 0;

  if (
    value.kind === "track" &&
    typeof value.itemKey === "string" &&
    typeof value.trackId === "string"
  ) {
    return {
      currentTime,
      duration,
      itemKey: value.itemKey,
      kind: "track",
      trackId: value.trackId,
    };
  }

  if (
    value.kind === "candidate" &&
    typeof value.itemKey === "string" &&
    isStoredMusicSearchCandidate(value.candidate)
  ) {
    return {
      candidate: value.candidate,
      currentTime,
      duration,
      itemKey: value.itemKey,
      kind: "candidate",
    };
  }

  return null;
}

function readStoredMusicPlaybackSnapshot() {
  const stored = getStoredMusicValue(musicPlayerStorageKeys.playbackSnapshot);
  if (!stored) return null;

  try {
    return normalizeStoredMusicPlaybackSnapshot(JSON.parse(stored));
  } catch {
    return null;
  }
}

function readStoredMusicPlaybackMode(): StudioMusicPlaybackMode {
  const stored = getStoredMusicValue(musicPlayerStorageKeys.playbackMode);

  if (
    stored &&
    musicPlaybackModes.has(stored as StudioMusicPlaybackMode)
  ) {
    return stored as StudioMusicPlaybackMode;
  }

  return "repeat-all";
}

function readStoredMusicQueueItems() {
  const stored = getStoredMusicValue(musicPlayerStorageKeys.queueItems);
  if (!stored) return [];

  try {
    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isStoredMusicQueueItem).slice(0, 200);
  } catch {
    return [];
  }
}

function readStoredMusicQueueKey() {
  return getStoredMusicValue(musicPlayerStorageKeys.currentQueueKey) ?? "";
}

function readStoredMusicVolume() {
  const stored = getStoredMusicValue(musicPlayerStorageKeys.volume);
  const parsed = Number(stored);

  return Number.isFinite(parsed) ? clampVolume(parsed) : 70;
}

function readStoredMusicPlaybackCurrentTime() {
  return readStoredMusicPlaybackSnapshot()?.currentTime ?? 0;
}

function readStoredMusicPlaybackDuration() {
  return readStoredMusicPlaybackSnapshot()?.duration ?? 0;
}

function readStoredMusicPlaybackCandidate() {
  const snapshot = readStoredMusicPlaybackSnapshot();

  return snapshot?.kind === "candidate" ? snapshot.candidate ?? null : null;
}

function readStoredMusicPlaybackTrackId() {
  const snapshot = readStoredMusicPlaybackSnapshot();

  return snapshot?.kind === "track" ? snapshot.trackId ?? "" : "";
}

function readStoredMusicPendingRestore() {
  const snapshot = readStoredMusicPlaybackSnapshot();

  return snapshot
    ? {
        currentTime: snapshot.currentTime,
        itemKey: snapshot.itemKey,
      }
    : null;
}

function getSearchSourceHealthScore(source: StudioMusicSearchSource) {
  if (!source.lastTestedAt) return 50 - source.sortOrder / 1000;

  return (
    (source.lastTestPlayable ? 120 : 0) +
    (source.lastTestLyric ? 20 : 0) +
    (source.lastTestSearchable ? 10 : 0) -
    (source.lastTestOk === false ? 40 : 0) -
    (source.lastTestElapsedMs || 0) / 1000
  );
}

function getTrackLikeKey(track: StudioMusicTrack) {
  return `track:${track.id}`;
}

function getCandidateLikeKey(candidate: StudioMusicSearchCandidate) {
  return `candidate:${candidate.source}:${candidate.id}`;
}

function trackToLibraryItem(
  track: StudioMusicTrack,
  audioUrl = track.audioUrl,
): StudioMusicLibraryItem {
  return {
    album: track.album,
    artist: track.artist,
    audioUrl,
    coverUrl: track.coverUrl,
    itemKey: getTrackLikeKey(track),
    itemKind: "track",
    lyric: track.lyric,
    provider: track.provider,
    quality: track.quality,
    sourceSongId: track.sourceSongId,
    title: track.title,
    trackId: track.id,
  };
}

function candidateToLibraryItem(
  candidate: StudioMusicSearchCandidate,
  audioUrl = "",
  lyric = "",
): StudioMusicLibraryItem {
  return {
    album: candidate.album,
    artist: candidate.artist || "Unknown Artist",
    audioUrl,
    coverUrl: candidate.artwork,
    itemKey: getCandidateLikeKey(candidate),
    itemKind: "candidate",
    lyric,
    provider: candidate.source,
    quality: "320k",
    sourceSongId: candidate.id,
    title: candidate.title,
  };
}

function libraryItemToCandidate(
  item: StudioMusicLibraryItem,
): StudioMusicSearchCandidate | null {
  if (item.provider === "manual") return null;

  return {
    album: item.album,
    artist: item.artist,
    artwork: item.coverUrl,
    duration: 0,
    id: item.sourceSongId,
    raw: {
      album: item.album,
      artist: item.artist,
      artwork: item.coverUrl,
      id: item.sourceSongId,
      title: item.title,
    },
    source: item.provider,
    title: item.title,
  };
}

function toStoredMusicSearchCandidate(
  candidate: StudioMusicSearchCandidate,
): StudioMusicSearchCandidate {
  return {
    album: candidate.album,
    artist: candidate.artist,
    artwork: candidate.artwork,
    duration: Number.isFinite(candidate.duration) ? candidate.duration : 0,
    id: candidate.id,
    raw: {},
    source: candidate.source,
    title: candidate.title,
  };
}

function buildMusicPlaybackSnapshot({
  candidate,
  currentTime,
  duration,
  track,
}: {
  candidate: StudioMusicSearchCandidate | null;
  currentTime: number;
  duration: number;
  track: StudioMusicTrack | null;
}): StoredMusicPlaybackSnapshot | null {
  const safeTime = Number.isFinite(currentTime) ? Math.max(0, currentTime) : 0;
  const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0;

  if (candidate) {
    return {
      candidate: toStoredMusicSearchCandidate(candidate),
      currentTime: safeTime,
      duration: safeDuration,
      itemKey: getCandidateLikeKey(candidate),
      kind: "candidate",
    };
  }

  if (track) {
    return {
      currentTime: safeTime,
      duration: safeDuration,
      itemKey: getTrackLikeKey(track),
      kind: "track",
      trackId: track.id,
    };
  }

  return null;
}

function clampVolume(value: number) {
  return Math.min(100, Math.max(0, value));
}

function inferAudioExtension(url: string) {
  try {
    const baseUrl =
      typeof window === "undefined" ? "https://local.invalid" : window.location.href;
    const pathname = new URL(url, baseUrl).pathname;
    const extension = pathname.split(".").pop()?.toLowerCase();

    if (extension && audioExtensions.has(extension)) {
      return extension;
    }
  } catch {
    return "mp3";
  }

  return "mp3";
}

function buildDownloadName(title: string, extension: string) {
  const cleanTitle = title
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 96);

  return `${cleanTitle || "music"}.${extension}`;
}

function buildStoredDownloadUrl(
  download: StudioMusicDownload,
  mode: "download" | "stream",
) {
  const params = new URLSearchParams({ id: download.id });

  if (mode === "stream") {
    params.set("mode", "stream");
  }

  return `/api/music/download?${params.toString()}`;
}

function getStoredDownloadPlaybackUrl(download: StudioMusicDownload) {
  if (canUseStoredDownload(download)) {
    return buildStoredDownloadUrl(download, "stream");
  }

  return download.audioUrl;
}

function canUseStoredDownload(download: StudioMusicDownload) {
  return (
    download.storageStatus === "ready" ||
    Boolean(download.audioObjectKey && download.storageStatus !== "missing")
  );
}

function triggerStoredDownloadFile(download: StudioMusicDownload) {
  if (typeof document === "undefined") return;

  const anchor = document.createElement("a");
  anchor.href = buildStoredDownloadUrl(download, "download");
  anchor.download = buildDownloadName(
    download.title,
    inferAudioExtension(download.audioUrl),
  );
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function isMusicDownloadItem(
  item: StudioMusicDownload | StudioMusicLibraryItem,
): item is StudioMusicDownload {
  return "downloadedAt" in item;
}

function trackToQueueItem(track: StudioMusicTrack): StudioMusicQueueItem {
  return {
    artist: track.artist,
    coverUrl: track.coverUrl,
    key: getTrackLikeKey(track),
    kind: "track",
    sourceLabel: "Library",
    title: track.title,
  };
}

function candidateToQueueItem(
  candidate: StudioMusicSearchCandidate,
): StudioMusicQueueItem {
  return {
    artist: candidate.artist || "Unknown Artist",
    candidate: toStoredMusicSearchCandidate(candidate),
    coverUrl: candidate.artwork,
    key: getCandidateLikeKey(candidate),
    kind: "candidate",
    sourceLabel: candidate.source.toUpperCase(),
    title: candidate.title,
  };
}

function normalizeMusicMatchText(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\[[^\]]*]|\([^)]*\)|（[^）]*）|【[^】]*】/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function getCandidateSimilarityScore(
  base: StudioMusicSearchCandidate,
  candidate: StudioMusicSearchCandidate,
) {
  const baseTitle = normalizeMusicMatchText(base.title);
  const candidateTitle = normalizeMusicMatchText(candidate.title);
  const baseArtist = normalizeMusicMatchText(base.artist);
  const candidateArtist = normalizeMusicMatchText(candidate.artist);
  const baseAlbum = normalizeMusicMatchText(base.album);
  const candidateAlbum = normalizeMusicMatchText(candidate.album);
  let score = 0;

  if (baseTitle && candidateTitle) {
    if (baseTitle === candidateTitle) {
      score += 90;
    } else if (
      baseTitle.length >= 3 &&
      candidateTitle.length >= 3 &&
      (baseTitle.includes(candidateTitle) || candidateTitle.includes(baseTitle))
    ) {
      score += 62;
    }
  }

  if (baseArtist && candidateArtist) {
    if (baseArtist === candidateArtist) {
      score += 34;
    } else if (
      baseArtist.length >= 2 &&
      candidateArtist.length >= 2 &&
      (baseArtist.includes(candidateArtist) ||
        candidateArtist.includes(baseArtist))
    ) {
      score += 18;
    }
  }

  if (baseAlbum && candidateAlbum && baseAlbum === candidateAlbum) {
    score += 8;
  }

  return score;
}

function replaceCandidateInQueue(
  queue: StudioMusicQueueItem[],
  currentCandidate: StudioMusicSearchCandidate,
  fallbackCandidate: StudioMusicSearchCandidate,
) {
  const currentKey = getCandidateLikeKey(currentCandidate);
  const nextItem = candidateToQueueItem(fallbackCandidate);
  const replaced = queue.map((item) =>
    item.key === currentKey ? nextItem : item,
  );

  if (replaced.some((item) => item.key === nextItem.key)) {
    return replaced;
  }

  return [nextItem, ...replaced].slice(0, 200);
}

function replaceLibraryItemWithCandidateInQueue(
  queue: StudioMusicQueueItem[],
  item: StudioMusicLibraryItem,
  candidate: StudioMusicSearchCandidate,
) {
  const fallbackItem = {
    ...candidateToQueueItem(candidate),
    key: item.itemKey,
    libraryItemKey: item.itemKey,
    sourceLabel: `${candidate.source.toUpperCase()} · 换源`,
  };
  const replaced = queue.map((queueItem) =>
    queueItem.key === item.itemKey ? fallbackItem : queueItem,
  );

  if (replaced.some((queueItem) => queueItem.key === item.itemKey)) {
    return replaced;
  }

  return [fallbackItem, ...replaced].slice(0, 200);
}

function getErrorText(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getMediaErrorText(error: MediaError | null) {
  if (!error) return "音频加载失败，浏览器没有返回具体原因。";

  if (error.code === 1) return "音频加载被浏览器中断。";
  if (error.code === 2) return "音频网络加载失败，可能是链接过期或跨域受限。";
  if (error.code === 3) return "音频解码失败，当前链接可能不是有效音频。";
  if (error.code === 4) return "音频格式或链接不可播放。";

  return "音频播放失败。";
}

function getAudioElementSnapshot(audio: HTMLAudioElement) {
  const readyStateLabels = [
    "HAVE_NOTHING",
    "HAVE_METADATA",
    "HAVE_CURRENT_DATA",
    "HAVE_FUTURE_DATA",
    "HAVE_ENOUGH_DATA",
  ];
  const networkStateLabels = [
    "NETWORK_EMPTY",
    "NETWORK_IDLE",
    "NETWORK_LOADING",
    "NETWORK_NO_SOURCE",
  ];

  return [
    `ready=${readyStateLabels[audio.readyState] ?? audio.readyState}`,
    `network=${networkStateLabels[audio.networkState] ?? audio.networkState}`,
    `paused=${audio.paused ? "yes" : "no"}`,
    `ended=${audio.ended ? "yes" : "no"}`,
    `time=${formatTime(audio.currentTime || 0)}`,
    `duration=${audio.duration ? formatTime(audio.duration) : "--:--"}`,
  ].join(" / ");
}

function getPlaybackAttemptFailure(
  error: unknown,
): PlaybackAttemptFailure | null {
  const rawMessage = getErrorText(error);
  const message = rawMessage.toLowerCase();
  const errorName = error instanceof Error ? error.name.toLowerCase() : "";

  if (
    errorName.includes("notallowed") ||
    message.includes("notallowed") ||
    message.includes("permission") ||
    message.includes("autoplay")
  ) {
    return {
      detail: "浏览器自动播放策略或权限限制阻止了 audio.play()。",
      kind: "browser-policy",
      penalizeSource: false,
      title: "浏览器拒绝播放请求",
      tone: "warning",
    };
  }

  if (
    errorName.includes("abort") ||
    message.includes("interrupted") ||
    message.includes("aborted")
  ) {
    return {
      detail: "audio.play() 还没完成就被新的 pause/load/src 切换打断。",
      kind: "play-interrupted",
      penalizeSource: false,
      title: "播放请求被后续操作打断",
      tone: "warning",
    };
  }

  return null;
}

function getPlaybackDiagnosticTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

function shouldTryCandidateFallback(error: unknown) {
  const message = getErrorText(error).toLowerCase();

  return !(
    message.includes("notallowed") ||
    message.includes("permission") ||
    message.includes("interrupted")
  );
}

function shouldRetryDownloadWithFallback(
  result: StudioPrepareMusicDownloadResult,
) {
  if (!canUseStoredDownload(result.download)) return true;

  return result.warnings.some((warning) =>
    warning.includes("音频保存到 R2 失败"),
  );
}

function getDownloadSourceLabel(download: StudioMusicDownload | undefined) {
  if (!download) return "";

  if (download.storageStatus === "ready") return "R2 缓存";
  if (download.storageStatus === "record-only") return "PG 记录";
  if (download.storageStatus === "missing") return "R2 缺失";

  return "缓存状态未知";
}

function getDownloadStorageMessage(download: StudioMusicDownload) {
  if (download.storageStatus === "ready") {
    return `Stored in R2: ${download.title}`;
  }

  if (download.storageStatus === "record-only") {
    return `Saved in PG only: ${download.title}`;
  }

  if (download.storageStatus === "missing") {
    return `Download record exists, but the R2 object is missing: ${download.title}`;
  }

  return `Download record saved, R2 status unknown: ${download.title}`;
}

function libraryItemToQueueItem(item: StudioMusicLibraryItem): StudioMusicQueueItem {
  return {
    artist: item.artist,
    coverUrl: item.coverUrl,
    key: item.itemKey,
    kind: "library",
    sourceLabel: item.provider.toUpperCase(),
    title: item.title,
  };
}

export function MusicBoard({
  mode = "full",
  isLoading,
  isResolving,
  isSaving,
  isPlaylistImporting,
  isSourceImporting,
  isSourceUpdating,
  isSearchSourceUpdating,
  downloads,
  favorites,
  playHistory,
  tracks,
  playlists,
  sourceVersionStatus,
  qingMusicStatus,
  searchSources,
  sources,
  uploadStatus,
  deletingDownloadId = null,
  onDelete,
  onAddPlaylistItem,
  onDeleteDownload,
  onDeletePlaylist,
  onCheckChangqingVersion,
  onCreatePlaylist,
  onImportExternalPlaylist,
  onUpdatePlaylist,
  onReorderPlaylistItems,
  onImportDefaultSearchSources,
  onImportChangqingSource,
  onPluginResolveMusic,
  onPrepareDownload,
  onRecordPlay,
  onRemovePlaylistItem,
  onResolveMusic,
  onSave,
  onToggleFavorite,
  onUpdateSearchSource,
  onTestSearchSource,
  onUpdateChangqingSource,
  onUploadAudio,
}: MusicBoardProps) {
  const utils = trpc.useUtils();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentIndex, setCurrentIndex] = useState(() => {
    const storedTrackId = readStoredMusicPlaybackTrackId();
    if (!storedTrackId) return 0;

    const storedIndex = tracks.findIndex((track) => track.id === storedTrackId);

    return storedIndex >= 0 ? storedIndex : 0;
  });
  const [form, setForm] = useState<MusicForm>(emptyMusicForm);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(readStoredMusicPlaybackDuration);
  const [currentTime, setCurrentTime] =
    useState(readStoredMusicPlaybackCurrentTime);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StudioMusicTrack | null>(null);
  const [downloadDeleteTarget, setDownloadDeleteTarget] =
    useState<StudioMusicDownload | null>(null);
  const [playlistDeleteTarget, setPlaylistDeleteTarget] =
    useState<StudioMusicPlaylist | null>(null);
  const [playError, setPlayError] = useState("");
  const [mediaPhase, setMediaPhase] = useState<PlaybackMediaPhase>("idle");
  const [candidateLyrics, setCandidateLyrics] = useState<Record<string, string>>({});
  const [candidateLyricSources, setCandidateLyricSources] = useState<
    Record<string, StudioMusicPluginProvider>
  >({});
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});
  const [resolvingTrackId, setResolvingTrackId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [downloadMessage, setDownloadMessage] = useState("");
  const [playbackEvents, setPlaybackEvents] = useState<
    MusicPlaybackDiagnosticEvent[]
  >([]);
  const [runtimeSourceHealth, setRuntimeSourceHealth] = useState<
    Partial<Record<StudioMusicPluginProvider, RuntimeSourceHealth>>
  >({});
  const [downloadProgress, setDownloadProgress] =
    useState<StudioMusicDownloadProgress | null>(null);
  const [immersiveOpen, setImmersiveOpen] = useState(false);
  const [playbackMode, setPlaybackMode] =
    useState<StudioMusicPlaybackMode>(readStoredMusicPlaybackMode);
  const [queueItems, setQueueItems] =
    useState<StudioMusicQueueItem[]>(readStoredMusicQueueItems);
  const [currentQueueKey, setCurrentQueueKey] =
    useState(readStoredMusicQueueKey);
  const [sourceUpdateCode, setSourceUpdateCode] = useState("");
  const [sidebarView, setSidebarView] = useState<MusicSidebarView>("library");
  const [sourceTestKeyword, setSourceTestKeyword] = useState("晴天");
  const [sourceTestResults, setSourceTestResults] = useState<
    Record<string, StudioMusicSearchSourceTestResult>
  >({});
  const [testingSourceId, setTestingSourceId] = useState("");
  const [testingBatch, setTestingBatch] = useState(false);
  const [repairingDownloads, setRepairingDownloads] = useState(false);
  const [downloadingPlaylistId, setDownloadingPlaylistId] = useState("");
  const [playlistBatching, setPlaylistBatching] = useState(false);
  const [downloadStorageFilter, setDownloadStorageFilter] =
    useState<DownloadStorageFilter>("all");
  const [volume, setVolume] = useState(readStoredMusicVolume);
  const [selectedCandidate, setSelectedCandidate] =
    useState<StudioMusicSearchCandidate | null>(readStoredMusicPlaybackCandidate);
  const [pendingPlaybackRestore, setPendingPlaybackRestore] = useState(
    readStoredMusicPendingRestore,
  );
  const [sourcePath, setSourcePath] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const playRequestIdRef = useRef(0);
  const pauseIntentRef = useRef<PlaybackPauseIntent | null>(null);
  const lastAudioDiagnosticEventRef = useRef("");
  const libraryFallbackItemRef = useRef<StudioMusicLibraryItem | null>(null);
  const mediaErrorCandidateKeysRef = useRef<Set<string>>(new Set());
  const enabledSources = sources.filter((source) => source.enabled);
  const qingMusicSearchProviders = useMemo<StudioMusicPluginProvider[]>(
    () =>
      qingMusicStatus?.error
        ? []
        : (qingMusicStatus?.recommendedProviderIds ?? []),
    [qingMusicStatus?.error, qingMusicStatus?.recommendedProviderIds],
  );
  const enabledSearchProviders = useMemo(
    () =>
      Array.from(
        new Set([
          ...searchSources
            .filter((source) => source.enabled)
            .sort((left, right) => {
              const scoreDiff =
                getSearchSourceHealthScore(right) -
                (runtimeSourceHealth[right.provider]?.penalty ?? 0) -
                (getSearchSourceHealthScore(left) -
                  (runtimeSourceHealth[left.provider]?.penalty ?? 0));

              if (scoreDiff !== 0) return scoreDiff;

              return left.sortOrder - right.sortOrder;
            })
            .map((source) => source.provider),
          ...qingMusicSearchProviders,
        ]),
      ),
    [qingMusicSearchProviders, runtimeSourceHealth, searchSources],
  );
  const enabledSearchProviderSet = useMemo(
    () => new Set(enabledSearchProviders),
    [enabledSearchProviders],
  );
  const enabledSearchPriorityText = useMemo(
    () =>
      enabledSearchProviders.length > 0
        ? enabledSearchProviders
            .map((provider) => pluginProviderLabels[provider])
            .join(" / ")
        : "无启用远程源",
    [enabledSearchProviders],
  );
  const likedKeys = useMemo(
    () => new Set(favorites.map((favorite) => favorite.itemKey)),
    [favorites],
  );
  const downloadsByItemKey = useMemo(
    () => new Map(downloads.map((download) => [download.itemKey, download])),
    [downloads],
  );
  const changqingSource = sources.find((source) => source.name.includes("长青"));
  const hasChangqingSource = sources.some((source) => source.name.includes("长青"));
  const searchCandidates = trpc.music.pluginSearch.useQuery(
    {
      keyword: searchText,
      limit: 36,
      providers: enabledSearchProviders as StudioMusicPluginProvider[],
    },
    {
      enabled:
        searchText.trim().length >= 2 &&
        (searchSources.length === 0 || enabledSearchProviders.length > 0),
    },
  );

  const filteredTracks = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) return tracks;

    return tracks.filter((track) =>
      [track.title, track.artist, track.album, track.sourceSongId]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [searchText, tracks]);
  const visibleSearchCandidates = useMemo(() => {
    if (searchSources.length > 0 && enabledSearchProviders.length === 0) return [];

    return ((searchCandidates.data ?? []) as StudioMusicSearchCandidate[]).filter(
      (candidate) =>
        searchSources.length === 0 || enabledSearchProviderSet.has(candidate.source),
    );
  }, [
    enabledSearchProviderSet,
    enabledSearchProviders.length,
    searchCandidates.data,
    searchSources.length,
  ]);
  const restoredTrack =
    pendingPlaybackRestore?.itemKey.startsWith("track:")
      ? tracks.find(
          (track) =>
            getTrackLikeKey(track) === pendingPlaybackRestore.itemKey,
        ) ?? null
      : null;
  const currentTrack = restoredTrack ?? tracks[currentIndex] ?? tracks[0] ?? null;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const safeSelectedCandidate =
    selectedCandidate &&
    (searchSources.length === 0 ||
      enabledSearchProviderSet.has(selectedCandidate.source))
      ? selectedCandidate
      : null;
  const currentLikeKey = safeSelectedCandidate
    ? getCandidateLikeKey(safeSelectedCandidate)
    : currentTrack
      ? getTrackLikeKey(currentTrack)
      : "";
  const currentResolvedKey = safeSelectedCandidate
    ? currentLikeKey
    : currentTrack?.id ?? "";
  const currentStoredDownload = currentLikeKey
    ? downloadsByItemKey.get(currentLikeKey)
    : undefined;
  const playbackSourceStatus = useMemo<MusicPlaybackSourceStatus | null>(() => {
    if (safeSelectedCandidate) {
      const candidateKey = getCandidateLikeKey(safeSelectedCandidate);
      const storedDownload = downloadsByItemKey.get(candidateKey);
      const fallbackItem = libraryFallbackItemRef.current;
      const isSourceSwitched =
        Boolean(fallbackItem) &&
        fallbackItem?.itemKey !== candidateKey &&
        currentQueueKey === fallbackItem?.itemKey;

      if (isSourceSwitched && fallbackItem) {
        return {
          detail: `原记录：${fallbackItem.title} / ${
            fallbackItem.provider === "manual"
              ? providerLabels.manual
              : pluginProviderLabels[fallbackItem.provider]
          }；当前播放：${safeSelectedCandidate.title} / ${
            pluginProviderLabels[safeSelectedCandidate.source]
          }${storedDownload?.storageStatus === "ready" ? "；当前源已有 R2 缓存" : ""}`,
          label: `${pluginProviderLabels[safeSelectedCandidate.source]} 换源`,
          tone: "amber",
        };
      }

      if (storedDownload?.storageStatus === "ready") {
        return {
          detail: `当前音频从 R2 缓存读取：${storedDownload.audioObjectKey || storedDownload.audioUrl}`,
          label: "R2 缓存",
          tone: "emerald",
        };
      }

      if (storedDownload) {
        return {
          detail: `当前下载记录状态：${storedDownload.storageStatus}`,
          label: getDownloadSourceLabel(storedDownload),
          tone: storedDownload.storageStatus === "record-only" ? "slate" : "amber",
        };
      }

      return {
        detail: `远程搜索源：${pluginProviderLabels[safeSelectedCandidate.source]} / ${safeSelectedCandidate.id}`,
        label: `${pluginProviderLabels[safeSelectedCandidate.source]} 在线源`,
        tone: "sky",
      };
    }

    if (currentTrack) {
      const storedDownload = downloadsByItemKey.get(getTrackLikeKey(currentTrack));

      if (storedDownload?.storageStatus === "ready") {
        return {
          detail: `当前音频从 R2 缓存读取：${storedDownload.audioObjectKey || storedDownload.audioUrl}`,
          label: "R2 缓存",
          tone: "emerald",
        };
      }

      if (storedDownload) {
        return {
          detail: `当前下载记录状态：${storedDownload.storageStatus}`,
          label: getDownloadSourceLabel(storedDownload),
          tone: storedDownload.storageStatus === "record-only" ? "slate" : "amber",
        };
      }

      if (currentTrack.provider === "manual") {
        return {
          detail: "手动曲库记录，直接使用保存的音频地址。",
          label: providerLabels.manual,
          tone: "slate",
        };
      }

      return {
        detail: `PG 曲库记录，播放时按 songId 解析：${currentTrack.sourceSongId || "unknown"}`,
        label: `${providerLabels[currentTrack.provider]} PG源`,
        tone: "sky",
      };
    }

    return null;
  }, [currentQueueKey, currentTrack, downloadsByItemKey, safeSelectedCandidate]);
  const currentLiked = currentLikeKey ? likedKeys.has(currentLikeKey) : false;
  const currentLyric = safeSelectedCandidate
    ? candidateLyrics[getCandidateLikeKey(safeSelectedCandidate)] ?? ""
    : currentTrack?.lyric ?? "";
  const currentLyricSource = safeSelectedCandidate
    ? candidateLyricSources[getCandidateLikeKey(safeSelectedCandidate)]
    : undefined;
  const mediaSessionItem = safeSelectedCandidate
    ? {
        album: safeSelectedCandidate.album,
        artist: safeSelectedCandidate.artist,
        artwork: safeSelectedCandidate.artwork,
        title: safeSelectedCandidate.title,
      }
    : currentTrack
      ? {
          album: currentTrack.album,
          artist: currentTrack.artist,
          artwork: getPlayerCover(currentTrack),
          title: currentTrack.title,
        }
      : null;
  const sourceTestSummary = useMemo(() => {
    const results = Object.values(sourceTestResults);

    return {
      lyricReady: results.filter((result) => result.resolve?.lyricOk).length,
      playable: results.filter((result) => result.resolve?.audioOk).length,
      searchable: results.filter((result) => result.total > 0).length,
      total: results.length,
    };
  }, [sourceTestResults]);
  const persistedSearchSourceSummary = useMemo(
    () => ({
      lyricReady: searchSources.filter((source) => source.lastTestLyric).length,
      playable: searchSources.filter((source) => source.lastTestPlayable).length,
      searchable: searchSources.filter((source) => source.lastTestSearchable).length,
      tested: searchSources.filter((source) => source.lastTestedAt).length,
      total: searchSources.length,
    }),
    [searchSources],
  );
  const libraryQueue = useMemo(
    () => filteredTracks.map(trackToQueueItem),
    [filteredTracks],
  );
  const searchQueue = useMemo(
    () => visibleSearchCandidates.map(candidateToQueueItem),
    [visibleSearchCandidates],
  );
  const searchSourceHealthByProvider = useMemo(
    () =>
      new Map(
        searchSources.map((source) => [
          source.provider,
          getSearchSourceHealthScore(source) -
            (runtimeSourceHealth[source.provider]?.penalty ?? 0),
        ]),
      ),
    [runtimeSourceHealth, searchSources],
  );
  const favoriteQueue = useMemo(
    () => favorites.map(libraryItemToQueueItem),
    [favorites],
  );
  const historyQueue = useMemo(
    () => playHistory.map(libraryItemToQueueItem),
    [playHistory],
  );
  const downloadQueue = useMemo(
    () => downloads.map(libraryItemToQueueItem),
    [downloads],
  );
  const repairableDownloads = useMemo(
    () => downloads.filter((download) => download.storageStatus !== "ready"),
    [downloads],
  );
  const filteredDownloads = useMemo(() => {
    if (downloadStorageFilter === "all") return downloads;
    if (downloadStorageFilter === "repair") return repairableDownloads;

    return downloads.filter(
      (download) => download.storageStatus === downloadStorageFilter,
    );
  }, [downloadStorageFilter, downloads, repairableDownloads]);
  const downloadStorageCounts = useMemo(
    () => ({
      all: downloads.length,
      missing: downloads.filter((download) => download.storageStatus === "missing")
        .length,
      ready: downloads.filter((download) => download.storageStatus === "ready")
        .length,
      recordOnly: downloads.filter(
        (download) => download.storageStatus === "record-only",
      ).length,
      repair: repairableDownloads.length,
    }),
    [downloads, repairableDownloads.length],
  );
  const selectedPlaylistQueue = useMemo(
    () =>
      playlists.flatMap((playlist) =>
        playlist.items.map((item) => ({
          ...libraryItemToQueueItem(item),
          sourceLabel: playlist.name,
        })),
      ),
    [playlists],
  );
  const safeQueueItems = useMemo(
    () =>
      queueItems.filter((item) => {
        if (item.kind !== "candidate" || searchSources.length === 0) return true;
        if (!item.key.startsWith("candidate:")) return true;
        const provider = item.key.split(":")[1];
        return (
          isStudioMusicPluginProvider(provider) &&
          enabledSearchProviderSet.has(provider)
        );
      }),
    [enabledSearchProviderSet, queueItems, searchSources.length],
  );
  const activeQueueItems = safeQueueItems.length > 0 ? safeQueueItems : libraryQueue;
  const currentQueueItems =
    sidebarView === "favorites"
      ? favoriteQueue
      : sidebarView === "history"
        ? historyQueue
        : sidebarView === "downloads"
          ? downloadQueue
          : sidebarView === "playlists"
            ? selectedPlaylistQueue
            : searchText.trim().length >= 2
              ? searchQueue
              : libraryQueue;
  const visibleQueueItems =
    currentQueueItems.length > 0 ? currentQueueItems : activeQueueItems;
  const runtimeHealthDetails = useMemo(
    () =>
      Object.entries(runtimeSourceHealth)
        .map(([provider, health]) => ({
          failures: health?.failures ?? 0,
          label: pluginProviderLabels[provider as StudioMusicPluginProvider],
          lastReason: health?.lastReason ?? "",
          penalty: health?.penalty ?? 0,
          successes: health?.successes ?? 0,
          updatedAt: health?.updatedAt ?? "",
        }))
        .filter((health) => health.penalty > 0 || health.failures > 0)
        .sort((left, right) => right.penalty - left.penalty),
    [runtimeSourceHealth],
  );
  const playbackDiagnostics = useMemo<MusicPlaybackDiagnostics>(() => {
    const queueIndex = visibleQueueItems.findIndex(
      (item) => item.key === currentQueueKey,
    );
    const audioState = isResolving || resolvingTrackId
      ? "resolving"
      : mediaPhase !== "idle"
        ? mediaPhase
        : isPlaying
          ? "playing"
          : currentLikeKey
            ? "paused"
            : "idle";
    const resolvedState = currentResolvedKey
      ? resolvedUrls[currentResolvedKey]
        ? "resolved"
        : currentStoredDownload?.audioUrl
          ? "from cached record"
          : "not resolved"
      : "no item";
    const fallbackItem = libraryFallbackItemRef.current;
    const fallbackState = fallbackItem
      ? `${fallbackItem.title} / ${fallbackItem.provider.toUpperCase()}`
      : "none";

    return {
      audioState,
      cacheState: currentStoredDownload
        ? currentStoredDownload.storageStatus
        : "no cache record",
      currentKey: currentLikeKey,
      currentQueueKey,
      currentTime,
      duration,
      events: playbackEvents,
      fallbackState,
      lastError: playError,
      lastMessage: downloadMessage,
      queuePosition:
        queueIndex >= 0
          ? `${queueIndex + 1}/${visibleQueueItems.length}`
          : visibleQueueItems.length > 0
            ? `not in current view / ${visibleQueueItems.length}`
            : "empty",
      resolvedState,
      runtimeHealthDetails,
      runtimeHealthState:
        runtimeHealthDetails.length > 0
          ? runtimeHealthDetails
              .map((source) => `${source.label} -${source.penalty}`)
              .join(" / ")
          : "all clear",
      sourceStatus: playbackSourceStatus,
      volume: clampVolume(volume),
    };
  }, [
    currentLikeKey,
    currentQueueKey,
    currentResolvedKey,
    currentStoredDownload,
    currentTime,
    downloadMessage,
    duration,
    isPlaying,
    isResolving,
    mediaPhase,
    playError,
    playbackEvents,
    playbackSourceStatus,
    resolvedUrls,
    resolvingTrackId,
    runtimeHealthDetails,
    visibleQueueItems,
    volume,
  ]);

  useEffect(() => {
    writeStoredMusicValue(
      musicPlayerStorageKeys.playbackMode,
      playbackMode,
    );
  }, [playbackMode]);

  useEffect(() => {
    writeStoredMusicValue(
      musicPlayerStorageKeys.queueItems,
      JSON.stringify(queueItems.slice(0, 200)),
    );
  }, [queueItems]);

  useEffect(() => {
    writeStoredMusicValue(
      musicPlayerStorageKeys.currentQueueKey,
      currentQueueKey,
    );
  }, [currentQueueKey]);

  useEffect(() => {
    writeStoredMusicValue(
      musicPlayerStorageKeys.volume,
      String(clampVolume(volume)),
    );
  }, [volume]);

  useEffect(() => {
    const snapshot = buildMusicPlaybackSnapshot({
      candidate: safeSelectedCandidate,
      currentTime,
      duration,
      track: safeSelectedCandidate ? null : currentTrack,
    });

    if (!snapshot) return;

    writeStoredMusicValue(
      musicPlayerStorageKeys.playbackSnapshot,
      JSON.stringify(snapshot),
    );
  }, [currentTime, currentTrack, duration, safeSelectedCandidate]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = clampVolume(volume) / 100;
    audio.muted = volume === 0;
  }, [volume]);

  function updateForm(patch: Partial<MusicForm>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function recordPlaybackEvent(
    event: Omit<MusicPlaybackDiagnosticEvent, "id" | "time">,
  ) {
    setPlaybackEvents((current) =>
      [
        {
          ...event,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          time: getPlaybackDiagnosticTime(),
        },
        ...current,
      ].slice(0, 16),
    );
  }

  function markNextPause(intent: PlaybackPauseIntent) {
    pauseIntentRef.current = intent;
  }

  function recordAudioDiagnosticEvent(
    audio: HTMLAudioElement,
    event: Omit<MusicPlaybackDiagnosticEvent, "id" | "time" | "detail"> & {
      detail?: string;
    },
  ) {
    const itemKey = event.itemKey || currentQueueKey || currentLikeKey;
    if (!itemKey) return;

    const snapshot = getAudioElementSnapshot(audio);
    const dedupeKey = `${event.title}:${itemKey}:${snapshot}`;

    if (dedupeKey === lastAudioDiagnosticEventRef.current) return;

    lastAudioDiagnosticEventRef.current = dedupeKey;
    recordPlaybackEvent({
      ...event,
      detail: event.detail ? `${event.detail} / ${snapshot}` : snapshot,
      itemKey,
    });
  }

  function updateRuntimeSourceHealth(
    provider: StudioMusicPluginProvider,
    delta: number,
    reason: string,
  ) {
    const updatedAt = getPlaybackDiagnosticTime();

    setRuntimeSourceHealth((current) => {
      const previous = current[provider] ?? {
        failures: 0,
        lastReason: "",
        penalty: 0,
        successes: 0,
        updatedAt: "",
      };
      const nextPenalty = Math.min(120, Math.max(0, previous.penalty + delta));
      const next = {
        ...previous,
        failures: previous.failures + (delta > 0 ? 1 : 0),
        lastReason: reason,
        penalty: nextPenalty,
        successes: previous.successes + (delta < 0 ? 1 : 0),
        updatedAt,
      };

      if (
        next.penalty === previous.penalty &&
        next.failures === previous.failures &&
        next.successes === previous.successes &&
        next.lastReason === previous.lastReason
      ) {
        return current;
      }

      return {
        ...current,
        [provider]: next,
      };
    });

    if (delta > 0) {
      recordPlaybackEvent({
        detail: `${pluginProviderLabels[provider]} 临时降权 +${delta}：${reason}`,
        itemKey: currentQueueKey || currentLikeKey,
        title: "音源健康降权",
        tone: "warning",
      });
    } else if (delta < 0) {
      recordPlaybackEvent({
        detail: `${pluginProviderLabels[provider]} 成功恢复 ${Math.abs(delta)}：${reason}`,
        itemKey: currentQueueKey || currentLikeKey,
        title: "音源健康恢复",
        tone: "success",
      });
    }
  }

  function resetRuntimeSourceHealth() {
    const affectedCount = Object.values(runtimeSourceHealth).filter(
      (health) => (health?.penalty ?? 0) > 0,
    ).length;

    if (affectedCount === 0) return;

    setRuntimeSourceHealth({});
    recordPlaybackEvent({
      detail: `已恢复 ${affectedCount} 个远程源的会话内排序。`,
      itemKey: currentQueueKey || currentLikeKey,
      title: "重置音源健康",
      tone: "success",
    });
  }

  function createTrack() {
    setForm({
      ...emptyMusicForm,
      sortOrder: tracks.length,
    });
    setDialogOpen(true);
  }

  function editTrack(track: StudioMusicTrack) {
    setForm(trackToForm(track));
    setDialogOpen(true);
  }

  async function toggleLiked(item: StudioMusicLibraryItem | null) {
    if (!item) return;

    setPlayError("");
    setDownloadMessage("");

    try {
      await onToggleFavorite(item);
    } catch (error) {
      setPlayError(error instanceof Error ? error.message : "收藏状态更新失败。");
    }
  }

  function getCurrentLibraryItem() {
    if (safeSelectedCandidate) {
      const cacheKey = getCandidateLikeKey(safeSelectedCandidate);

      return candidateToLibraryItem(
        safeSelectedCandidate,
        resolvedUrls[cacheKey] ?? "",
        candidateLyrics[cacheKey] ?? "",
      );
    }

    if (currentTrack) {
      return trackToLibraryItem(
        currentTrack,
        resolvedUrls[currentTrack.id] ?? currentTrack.audioUrl,
      );
    }

    return null;
  }

  function changeVolume(value: number) {
    setVolume(clampVolume(value));
  }

  function setQueueContext(items: StudioMusicQueueItem[], currentKey: string) {
    setQueueItems(items);
    setCurrentQueueKey(currentKey);
  }

  function getQueueStep(direction: 1 | -1) {
    if (activeQueueItems.length === 0) return null;

    if (playbackMode === "repeat-one" && currentQueueKey) {
      return activeQueueItems.find((item) => item.key === currentQueueKey) ?? null;
    }

    if (playbackMode === "shuffle" && activeQueueItems.length > 1) {
      const currentIndexInQueue = activeQueueItems.findIndex(
        (item) => item.key === currentQueueKey,
      );
      let nextIndex = currentIndexInQueue;

      while (nextIndex === currentIndexInQueue) {
        nextIndex = Math.floor(Math.random() * activeQueueItems.length);
      }

      return activeQueueItems[nextIndex] ?? null;
    }

    const currentIndexInQueue = activeQueueItems.findIndex(
      (item) => item.key === currentQueueKey,
    );
    const baseIndex = currentIndexInQueue >= 0 ? currentIndexInQueue : 0;
    const nextIndex =
      (baseIndex + direction + activeQueueItems.length) % activeQueueItems.length;

    return activeQueueItems[nextIndex] ?? null;
  }

  async function submitForm() {
    await onSave({
      ...form,
      title: form.title.trim() || "Untitled Track",
      artist: form.artist.trim() || "Unknown Artist",
    });
    setDialogOpen(false);
  }

  async function resolvePlayableUrl(track: StudioMusicTrack) {
    const storedDownload = downloadsByItemKey.get(getTrackLikeKey(track));

    if (storedDownload && canUseStoredDownload(storedDownload)) {
      const storedAudioUrl = getStoredDownloadPlaybackUrl(storedDownload);

      if (storedAudioUrl) {
        return storedAudioUrl;
      }
    }

    if (track.provider === "manual" && track.audioUrl) {
      return track.audioUrl;
    }

    if (resolvedUrls[track.id]) {
      return resolvedUrls[track.id];
    }

    setResolvingTrackId(track.id);
    try {
      const result = await onResolveMusic({
        album: track.album,
        audioUrl: track.audioUrl,
        artist: track.artist,
        coverUrl: track.coverUrl,
        provider: track.provider,
        quality: track.quality,
        songId: track.sourceSongId,
        sourcePath: sourcePath.trim() || undefined,
        title: track.title,
      });

      setResolvedUrls((current) => ({
        ...current,
        [track.id]: result.audioUrl,
      }));

      return result.audioUrl;
    } finally {
      setResolvingTrackId(null);
    }
  }

  async function resolveCandidateUrl(candidate: StudioMusicSearchCandidate) {
    const cacheKey = getCandidateLikeKey(candidate);
    const storedDownload = downloadsByItemKey.get(cacheKey);

    if (
      searchSources.length > 0 &&
      !enabledSearchProviderSet.has(candidate.source)
    ) {
      throw new Error("这个远程搜索源已停用，请重新搜索或启用对应音源。");
    }

    if (storedDownload && canUseStoredDownload(storedDownload)) {
      const storedAudioUrl = getStoredDownloadPlaybackUrl(storedDownload);

      if (storedAudioUrl) {
        setCandidateLyrics((current) => ({
          ...current,
          [cacheKey]: storedDownload.lyric,
        }));

        return storedAudioUrl;
      }
    }

    if (resolvedUrls[cacheKey]) {
      return resolvedUrls[cacheKey];
    }

    setResolvingTrackId(cacheKey);
    try {
      const result = await onPluginResolveMusic({
        candidate,
        provider: candidate.source,
        quality: "320k",
        songId: candidate.id,
      });

      setResolvedUrls((current) => ({
        ...current,
        [cacheKey]: result.audioUrl,
      }));

      if (result.lyric) {
        setCandidateLyrics((current) => ({
          ...current,
          [cacheKey]: result.lyric ?? "",
        }));
      }

      if (result.lyricSource) {
        setCandidateLyricSources((current) => ({
          ...current,
          [cacheKey]: result.lyricSource!,
        }));
      }

      return result.audioUrl;
    } finally {
      setResolvingTrackId(null);
    }
  }

  function getCandidateFallbacks(candidate: StudioMusicSearchCandidate) {
    return visibleSearchCandidates
      .filter(
        (item) =>
          getCandidateLikeKey(item) !== getCandidateLikeKey(candidate) &&
          (searchSources.length === 0 || enabledSearchProviderSet.has(item.source)),
      )
      .map((item) => ({
        candidate: item,
        score:
          getCandidateSimilarityScore(candidate, item) +
          (searchSourceHealthByProvider.get(item.source) ?? 0) / 20,
      }))
      .filter((item) => item.score >= 70)
      .sort((left, right) => right.score - left.score)
      .map((item) => item.candidate)
      .slice(0, 5);
  }

  async function searchLibraryItemFallbacks(
    item: StudioMusicLibraryItem,
    excludeProvider?: StudioMusicPluginProvider,
  ) {
    const keyword = [item.title, item.artist]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (!keyword || enabledSearchProviders.length === 0) return [];

    const candidates = await utils.music.pluginSearch.fetch({
      keyword,
      limit: 24,
      providers: enabledSearchProviders as StudioMusicPluginProvider[],
    });
    const baseCandidate = libraryItemToCandidate(item) ?? {
      album: item.album,
      artist: item.artist,
      artwork: item.coverUrl,
      duration: 0,
      id: item.sourceSongId || item.itemKey,
      raw: {},
      source: item.provider === "manual" ? "wy" : item.provider,
      title: item.title,
    };

    return candidates
      .filter(
        (candidate) =>
          candidate.source !== excludeProvider &&
          getCandidateLikeKey(candidate) !== item.itemKey &&
          (searchSources.length === 0 ||
            enabledSearchProviderSet.has(candidate.source)),
      )
      .map((candidate) => ({
        candidate,
        score:
          getCandidateSimilarityScore(baseCandidate, candidate) +
          (searchSourceHealthByProvider.get(candidate.source) ?? 0) / 20,
      }))
      .filter((candidate) => candidate.score >= 70)
      .sort((left, right) => right.score - left.score)
      .map((candidate) => candidate.candidate)
      .slice(0, 5);
  }

  async function playTrack(
    track: StudioMusicTrack,
    index: number,
    nextQueue = libraryQueue,
    startTime = 0,
  ) {
    const audio = audioRef.current;
    if (!audio) return;
    const requestId = ++playRequestIdRef.current;

    setPlayError("");
    setDownloadMessage("");
    setSelectedCandidate(null);
    libraryFallbackItemRef.current = null;
    setQueueContext(nextQueue, getTrackLikeKey(track));
    recordPlaybackEvent({
      detail: `${track.artist || "Unknown"} / ${providerLabels[track.provider]}`,
      itemKey: getTrackLikeKey(track),
      title: `开始播放曲库：${track.title}`,
      tone: "info",
    });
    const matchedIndex = tracks.findIndex((item) => item.id === track.id);
    setCurrentIndex(matchedIndex >= 0 ? matchedIndex : index);

    try {
      const audioUrl = await resolvePlayableUrl(track);
      if (requestId !== playRequestIdRef.current) return;
      markNextPause({
        kind: "source-switch",
        suppressTimeline: true,
        title: "切换曲库音频源",
      });
      setMediaPhase("loading");
      audio.src = audioUrl;
      audio.load();
      if (startTime > 0) {
        audio.currentTime = startTime;
        setCurrentTime(startTime);
      }
      await audio.play();
      if (requestId !== playRequestIdRef.current) return;
      setIsPlaying(true);
      {
        const storedDownload = downloadsByItemKey.get(getTrackLikeKey(track));
        const recordAudioUrl =
          storedDownload && canUseStoredDownload(storedDownload)
            ? storedDownload.audioUrl
            : audioUrl;

        onRecordPlay(trackToLibraryItem(track, recordAudioUrl || audioUrl));
      }
      recordPlaybackEvent({
        detail: audioUrl.includes("r2.cloudflarestorage.com")
          ? "音频地址来自 R2 或 R2 兼容域名。"
          : "音频地址已解析并开始播放。",
        itemKey: getTrackLikeKey(track),
        title: `播放成功：${track.title}`,
        tone: "success",
      });
    } catch (error) {
      if (requestId !== playRequestIdRef.current) return;
      const playbackFailure = getPlaybackAttemptFailure(error);

      if (playbackFailure) {
        markNextPause({
          detail: playbackFailure.detail,
          kind: playbackFailure.kind,
          title: playbackFailure.title,
          tone: playbackFailure.tone,
        });
      }

      setMediaPhase("error");
      setIsPlaying(false);
      recordPlaybackEvent({
        detail: playbackFailure
          ? `${playbackFailure.detail} 原始错误：${getErrorText(error)}`
          : getErrorText(error),
        itemKey: getTrackLikeKey(track),
        title: playbackFailure
          ? `${playbackFailure.title}：${track.title}`
          : `曲库播放失败：${track.title}`,
        tone: playbackFailure?.tone ?? "error",
      });
      setPlayError(
        playbackFailure
          ? `${playbackFailure.detail} ${getErrorText(error)}`
          : error instanceof Error
            ? error.message
            : "音源解析或播放失败。",
      );
    }
  }

  async function playCandidate(
    candidate: StudioMusicSearchCandidate,
    nextQueue = searchQueue,
    startTime = 0,
    attemptedKeys = new Set<string>(),
    libraryFallbackItem: StudioMusicLibraryItem | null = null,
    queueKeyOverride = "",
  ) {
    const audio = audioRef.current;
    if (!audio) return false;
    const requestId = ++playRequestIdRef.current;

    const cacheKey = getCandidateLikeKey(candidate);
    const currentAttempts = new Set(attemptedKeys);
    currentAttempts.add(cacheKey);
    libraryFallbackItemRef.current = libraryFallbackItem;
    setSelectedCandidate(candidate);
    setPlayError("");
    setDownloadMessage("");
    setQueueContext(nextQueue, queueKeyOverride || cacheKey);
    recordPlaybackEvent({
      detail: `${pluginProviderLabels[candidate.source]} / ${candidate.id}`,
      itemKey: queueKeyOverride || cacheKey,
      title: `开始播放搜索源：${candidate.title}`,
      tone: libraryFallbackItem ? "warning" : "info",
    });

    try {
      const audioUrl = await resolveCandidateUrl(candidate);
      if (requestId !== playRequestIdRef.current) return false;
      mediaErrorCandidateKeysRef.current.delete(cacheKey);
      markNextPause({
        kind: "source-switch",
        suppressTimeline: true,
        title: "切换搜索源音频",
      });
      setMediaPhase("loading");
      audio.src = audioUrl;
      audio.load();
      if (startTime > 0) {
        audio.currentTime = startTime;
        setCurrentTime(startTime);
      }
      await audio.play();
      if (requestId !== playRequestIdRef.current) return false;
      setIsPlaying(true);
      {
        const storedDownload = downloadsByItemKey.get(cacheKey);
        const recordAudioUrl =
          storedDownload && canUseStoredDownload(storedDownload)
            ? storedDownload.audioUrl
            : audioUrl;

        onRecordPlay(
          candidateToLibraryItem(
            candidate,
            recordAudioUrl || audioUrl,
            candidateLyrics[cacheKey] ?? "",
          ),
        );
      }
      updateRuntimeSourceHealth(candidate.source, -18, "播放成功");
      recordPlaybackEvent({
        detail: `${pluginProviderLabels[candidate.source]} 已解析并开始播放。`,
        itemKey: queueKeyOverride || cacheKey,
        title: `播放成功：${candidate.title}`,
        tone: "success",
      });
      return true;
    } catch (error) {
      if (requestId !== playRequestIdRef.current) return false;
      const playbackFailure = getPlaybackAttemptFailure(error);

      if (playbackFailure) {
        markNextPause({
          detail: playbackFailure.detail,
          kind: playbackFailure.kind,
          title: playbackFailure.title,
          tone: playbackFailure.tone,
        });
      }

      setMediaPhase("error");
      setIsPlaying(false);
      const fallback = getCandidateFallbacks(candidate).find(
        (item) => !currentAttempts.has(getCandidateLikeKey(item)),
      );

      if (fallback && shouldTryCandidateFallback(error)) {
        updateRuntimeSourceHealth(candidate.source, 34, getErrorText(error));
        const fallbackQueue =
          libraryFallbackItem && queueKeyOverride
            ? replaceLibraryItemWithCandidateInQueue(
                nextQueue,
                libraryFallbackItem,
                fallback,
              )
            : replaceCandidateInQueue(nextQueue, candidate, fallback);

        recordPlaybackEvent({
          detail: `${pluginProviderLabels[candidate.source]} 失败：${getErrorText(error)}；尝试 ${pluginProviderLabels[fallback.source]}。`,
          itemKey: queueKeyOverride || cacheKey,
          title: `自动切源：${candidate.title}`,
          tone: "warning",
        });
        setDownloadMessage(
          `正在从 ${pluginProviderLabels[candidate.source]} 切换到 ${
            pluginProviderLabels[fallback.source]
          }：${fallback.title}`,
        );
        await playCandidate(
          fallback,
          fallbackQueue,
          startTime,
          currentAttempts,
          libraryFallbackItem,
          queueKeyOverride,
        );
        return true;
      }

      if (!playbackFailure || playbackFailure.penalizeSource) {
        updateRuntimeSourceHealth(candidate.source, 45, getErrorText(error));
      }

      recordPlaybackEvent({
        detail: playbackFailure
          ? `${playbackFailure.detail} 原始错误：${getErrorText(error)}`
          : getErrorText(error),
        itemKey: queueKeyOverride || cacheKey,
        title: playbackFailure
          ? `${playbackFailure.title}：${candidate.title}`
          : `搜索源播放失败：${candidate.title}`,
        tone: playbackFailure?.tone ?? "error",
      });
      setPlayError(
        playbackFailure
          ? `${playbackFailure.detail} ${getErrorText(error)}`
          : getErrorText(error) || "插件搜索结果解析或播放失败。",
      );
      return false;
    }
  }

  function getPendingPlaybackStartTime() {
    if (!pendingPlaybackRestore) return 0;

    const expectedKey = safeSelectedCandidate
      ? getCandidateLikeKey(safeSelectedCandidate)
      : currentTrack
        ? getTrackLikeKey(currentTrack)
        : "";

    if (expectedKey !== pendingPlaybackRestore.itemKey) return 0;

    return pendingPlaybackRestore.currentTime;
  }

  function clearPendingPlaybackRestore() {
    if (pendingPlaybackRestore) setPendingPlaybackRestore(null);
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || (!currentTrack && !safeSelectedCandidate)) return;

    if (isPlaying) {
      markNextPause({
        kind: "user",
        suppressTimeline: true,
        title: "用户主动暂停",
      });
      audio.pause();
      setMediaPhase("paused");
      setIsPlaying(false);
      recordPlaybackEvent({
        detail: currentLikeKey || "unknown item",
        itemKey: currentQueueKey || currentLikeKey,
        title: "用户主动暂停",
        tone: "info",
      });
      return;
    }

    const startTime = getPendingPlaybackStartTime();
    clearPendingPlaybackRestore();

    if (safeSelectedCandidate) {
      void playCandidate(safeSelectedCandidate, activeQueueItems, startTime);
      return;
    }

    if (currentTrack) {
      const matchedIndex = tracks.findIndex((track) => track.id === currentTrack.id);
      void playTrack(
        currentTrack,
        matchedIndex >= 0 ? matchedIndex : currentIndex,
        activeQueueItems,
        startTime,
      );
    }
  }

  function playQueueItem(
    item: StudioMusicQueueItem,
    nextQueue = activeQueueItems,
    startTime = 0,
  ) {
    const libraryItems = [...favorites, ...playHistory, ...downloads];
    const fallbackLibraryKey =
      item.libraryItemKey ||
      (item.kind === "candidate" && !item.key.startsWith("candidate:")
        ? item.key
        : "");
    const fallbackLibraryItem = fallbackLibraryKey
      ? libraryItems.find((candidate) => candidate.itemKey === fallbackLibraryKey) ??
        null
      : null;
    const embeddedCandidate =
      item.kind === "candidate" ? item.candidate ?? null : null;

    if (embeddedCandidate) {
      void playCandidate(
        embeddedCandidate,
        nextQueue,
        startTime,
        new Set<string>(),
        fallbackLibraryItem,
        fallbackLibraryKey,
      );
      return;
    }

    const matchedTrack =
      item.kind === "track"
        ? tracks.find((track) => getTrackLikeKey(track) === item.key)
        : null;

    if (matchedTrack) {
      libraryFallbackItemRef.current = null;
      void playTrack(
        matchedTrack,
        tracks.indexOf(matchedTrack),
        nextQueue,
        startTime,
      );
      return;
    }

    const matchedCandidate =
      visibleSearchCandidates.find(
        (candidate) => getCandidateLikeKey(candidate) === item.key,
      ) ?? null;

    if (matchedCandidate) {
      void playCandidate(matchedCandidate, nextQueue, startTime);
      return;
    }

    const libraryItem =
      fallbackLibraryItem ??
      libraryItems.find((candidate) => candidate.itemKey === item.key);

    if (libraryItem) {
      void playLibraryItem(libraryItem, nextQueue, startTime);
    }
  }

  function nextTrack() {
    markNextPause({
      kind: "track-change",
      title: "切到下一首",
      tone: "info",
    });
    const nextItem = getQueueStep(1);

    if (nextItem) {
      playQueueItem(nextItem, activeQueueItems);
      return;
    }

    if (tracks.length === 0) return;
    const nextIndex = (currentIndex + 1) % tracks.length;
    void playTrack(tracks[nextIndex], nextIndex, libraryQueue);
  }

  function previousTrack() {
    markNextPause({
      kind: "track-change",
      title: "切到上一首",
      tone: "info",
    });
    const previousItem = getQueueStep(-1);

    if (previousItem) {
      playQueueItem(previousItem, activeQueueItems);
      return;
    }

    if (tracks.length === 0) return;
    const previousIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    void playTrack(tracks[previousIndex], previousIndex, libraryQueue);
  }

  function handleSeek(value: number) {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const nextTime = (value / 100) * duration;
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
    clearPendingPlaybackRestore();
  }

  function handleAudioError(event: SyntheticEvent<HTMLAudioElement>) {
    const message = getMediaErrorText(event.currentTarget.error);

    markNextPause({
      detail: message,
      kind: "media-error",
      title: "浏览器媒体错误",
      tone: "error",
    });
    setMediaPhase("error");
    setIsPlaying(false);
    recordAudioDiagnosticEvent(event.currentTarget, {
      detail: message,
      itemKey: currentQueueKey || currentLikeKey,
      title: "浏览器媒体错误",
      tone: "error",
    });

    if (safeSelectedCandidate) {
      const currentKey = getCandidateLikeKey(safeSelectedCandidate);
      const fallback = getCandidateFallbacks(safeSelectedCandidate).find(
        (item) =>
          item.source !== safeSelectedCandidate.source &&
          !mediaErrorCandidateKeysRef.current.has(getCandidateLikeKey(item)),
      );

      if (fallback) {
        mediaErrorCandidateKeysRef.current.add(currentKey);
        updateRuntimeSourceHealth(safeSelectedCandidate.source, 38, message);
        const libraryFallbackItem = libraryFallbackItemRef.current;
        const fallbackQueue = libraryFallbackItem
          ? replaceLibraryItemWithCandidateInQueue(
              activeQueueItems,
              libraryFallbackItem,
              fallback,
            )
          : replaceCandidateInQueue(activeQueueItems, safeSelectedCandidate, fallback);

        recordPlaybackEvent({
          detail: `媒体错误后从 ${pluginProviderLabels[safeSelectedCandidate.source]} 切到 ${pluginProviderLabels[fallback.source]}。`,
          itemKey: libraryFallbackItem?.itemKey ?? currentKey,
          title: `媒体错误兜底：${fallback.title}`,
          tone: "warning",
        });
        setDownloadMessage(
          `当前音源播放中断，正在切换到 ${pluginProviderLabels[fallback.source]}：${fallback.title}`,
        );
        void playCandidate(
          fallback,
          fallbackQueue,
          0,
          new Set<string>(),
          libraryFallbackItem,
          libraryFallbackItem?.itemKey ?? "",
        );
        return;
      }
    }

    const libraryItem = libraryFallbackItemRef.current;

    if (libraryItem && libraryItem.provider !== "manual") {
      const originalProvider = libraryItem.provider;

      updateRuntimeSourceHealth(originalProvider, 30, message);
      recordPlaybackEvent({
        detail: `${libraryItem.title} 的 ${pluginProviderLabels[originalProvider]} 源播放中断，开始搜索其它源。`,
        itemKey: libraryItem.itemKey,
        title: "收藏源兜底搜索",
        tone: "warning",
      });
      setDownloadMessage("当前收藏音源播放中断，正在搜索其它可用源...");
      void searchLibraryItemFallbacks(libraryItem, originalProvider).then(
        ([fallback]) => {
          if (!fallback) {
            updateRuntimeSourceHealth(originalProvider, 20, "未找到可用兜底源");
            recordPlaybackEvent({
              detail: "没有找到可用的相似搜索源。",
              itemKey: libraryItem.itemKey,
              title: `收藏源兜底失败：${libraryItem.title}`,
              tone: "error",
            });
            setPlayError(message);
            return;
          }

          updateRuntimeSourceHealth(fallback.source, -12, "兜底源命中");
          recordPlaybackEvent({
            detail: `从 ${pluginProviderLabels[originalProvider]} 切到 ${pluginProviderLabels[fallback.source]}。`,
            itemKey: libraryItem.itemKey,
            title: `收藏源兜底命中：${fallback.title}`,
            tone: "success",
          });
          setDownloadMessage(
            `收藏里的 ${pluginProviderLabels[originalProvider]} 源不可用，正在切到 ${pluginProviderLabels[fallback.source]}：${fallback.title}`,
          );
          void playCandidate(
            fallback,
            replaceLibraryItemWithCandidateInQueue(
              activeQueueItems,
              libraryItem,
              fallback,
            ),
            0,
            new Set<string>(),
            libraryItem,
            libraryItem.itemKey,
          );
        },
        () => {
          updateRuntimeSourceHealth(originalProvider, 20, "搜索相似源请求失败");
          recordPlaybackEvent({
            detail: "搜索相似源请求失败。",
            itemKey: libraryItem.itemKey,
            title: `收藏源兜底失败：${libraryItem.title}`,
            tone: "error",
          });
          setPlayError(message);
        },
      );
      return;
    }

    setPlayError(message);
  }

  useMusicMediaSession({
    audioRef,
    currentTime,
    duration,
    isPlaying,
    item: mediaSessionItem,
    onNext: nextTrack,
    onPrevious: previousTrack,
    onSeek: handleSeek,
    onTogglePlay: togglePlay,
  });

  function handleLoadedMetadata(event: SyntheticEvent<HTMLAudioElement>) {
    const audio = event.currentTarget;
    const nextDuration = audio.duration || 0;

    setMediaPhase("metadata");
    setDuration(nextDuration);
    recordAudioDiagnosticEvent(audio, {
      detail: "浏览器已读取音频时长和元数据。",
      itemKey: currentQueueKey || currentLikeKey,
      title: "音频元数据就绪",
      tone: "info",
    });

    if (!pendingPlaybackRestore) return;

    const expectedKey = safeSelectedCandidate
      ? getCandidateLikeKey(safeSelectedCandidate)
      : currentTrack
        ? getTrackLikeKey(currentTrack)
        : "";

    if (expectedKey !== pendingPlaybackRestore.itemKey) return;

    const maxSeekTime = nextDuration > 1 ? Math.max(0, nextDuration - 1) : 0;
    const startTime = Math.min(pendingPlaybackRestore.currentTime, maxSeekTime);

    if (startTime > 0) {
      audio.currentTime = startTime;
      setCurrentTime(startTime);
    }

    setPendingPlaybackRestore(null);
  }

  function handleAudioPause(event: SyntheticEvent<HTMLAudioElement>) {
    const audio = event.currentTarget;
    const intent = pauseIntentRef.current;

    pauseIntentRef.current = null;
    setMediaPhase(audio.ended ? "ended" : "paused");
    setIsPlaying(false);

    if (!currentLikeKey && !currentQueueKey) return;

    const nearEnd =
      audio.duration > 0 && audio.currentTime >= Math.max(0, audio.duration - 0.8);
    const inferredIntent: PlaybackPauseIntent = intent ?? {
      kind: nearEnd ? "ended" : "unknown",
      title: nearEnd ? "播放自然结束" : "浏览器触发暂停",
      tone: nearEnd ? "success" : "warning",
    };

    if (inferredIntent.suppressTimeline) return;

    recordAudioDiagnosticEvent(audio, {
      detail: inferredIntent.detail,
      itemKey: currentQueueKey || currentLikeKey,
      title: inferredIntent.title,
      tone: inferredIntent.tone ?? (nearEnd ? "success" : "warning"),
    });
  }

  function handleAudioEnded() {
    markNextPause({
      kind: "ended",
      suppressTimeline: true,
      title: "播放自然结束",
      tone: "success",
    });
    setMediaPhase("ended");
    recordPlaybackEvent({
      detail: currentLikeKey || "unknown item",
      itemKey: currentQueueKey || currentLikeKey,
      title: "播放自然结束，进入下一首",
      tone: "success",
    });
    nextTrack();
  }

  function handleAudioPlay() {
    pauseIntentRef.current = null;
    setMediaPhase("loading");
    setIsPlaying(true);
  }

  function handleAudioCanPlay(event: SyntheticEvent<HTMLAudioElement>) {
    const audio = event.currentTarget;

    setMediaPhase("can-play");
    recordAudioDiagnosticEvent(audio, {
      detail: "浏览器认为当前音频可以开始播放。",
      itemKey: currentQueueKey || currentLikeKey,
      title: "音频可播放",
      tone: "success",
    });
  }

  function handleAudioPlaying(event: SyntheticEvent<HTMLAudioElement>) {
    const audio = event.currentTarget;

    pauseIntentRef.current = null;
    setMediaPhase("playing");
    setIsPlaying(true);
    recordAudioDiagnosticEvent(audio, {
      detail: "音频已经进入实际输出状态。",
      itemKey: currentQueueKey || currentLikeKey,
      title: "音频开始输出",
      tone: "success",
    });
  }

  function handleAudioWaiting(event: SyntheticEvent<HTMLAudioElement>) {
    const audio = event.currentTarget;

    setMediaPhase("waiting");
    recordAudioDiagnosticEvent(audio, {
      detail: "浏览器正在等待更多音频数据。",
      itemKey: currentQueueKey || currentLikeKey,
      title: "音频缓冲等待",
      tone: "warning",
    });
  }

  function handleAudioStalled(event: SyntheticEvent<HTMLAudioElement>) {
    const audio = event.currentTarget;

    setMediaPhase("stalled");
    recordAudioDiagnosticEvent(audio, {
      detail: "浏览器尝试加载音频，但网络读取停滞。",
      itemKey: currentQueueKey || currentLikeKey,
      title: "音频加载停滞",
      tone: "warning",
    });
  }

  function markStoredDownload(download: StudioMusicDownload) {
    setDownloadProgress({
      fileName: buildDownloadName(
        download.title,
        inferAudioExtension(download.audioUrl),
      ),
      itemKey: download.itemKey,
      phase: "complete",
      progress: 100,
      receivedBytes: 0,
      title: download.title,
      totalBytes: 0,
    });
    setDownloadMessage(getDownloadStorageMessage(download));
  }

  async function prepareAndDownload(
    item: StudioMusicLibraryItem,
    candidate?: StudioMusicSearchCandidate,
    options: {
      quiet?: boolean;
      attemptedKeys?: Set<string>;
      allowFallback?: boolean;
      downloadFile?: boolean;
    } = {},
  ) {
    const attemptedKeys = new Set(options.attemptedKeys ?? []);
    const allowFallback = options.allowFallback ?? Boolean(candidate);
    const downloadFile = options.downloadFile ?? false;
    const quiet = options.quiet ?? false;

    if (candidate) {
      attemptedKeys.add(getCandidateLikeKey(candidate));
    }

    setPlayError("");
    if (!quiet) setDownloadMessage("");
    setDownloadProgress({
      fileName: buildDownloadName(item.title, inferAudioExtension(item.audioUrl)),
      itemKey: item.itemKey,
      phase: "preparing",
      progress: 12,
      receivedBytes: 0,
      title: item.title,
      totalBytes: 0,
    });

    try {
      if (!quiet) setDownloadMessage(`Saving to R2: ${item.title}`);
      const result = await onPrepareDownload({
        ...item,
        candidate,
      });
      const playbackUrl =
        getStoredDownloadPlaybackUrl(result.download) || result.download.audioUrl;

      if (item.itemKind === "track" && item.trackId) {
        setResolvedUrls((current) => ({
          ...current,
          [item.trackId!]: playbackUrl,
        }));
      } else {
        setResolvedUrls((current) => ({
          ...current,
          [item.itemKey]: playbackUrl,
        }));
      }

      markStoredDownload(result.download);

      if (downloadFile) {
        triggerStoredDownloadFile(result.download);
      }

      if (result.warnings.length > 0) {
        setDownloadMessage(
          `${getDownloadStorageMessage(result.download)}. ${result.warnings.join(" ")}`,
        );
      }

      if (candidate && allowFallback && shouldRetryDownloadWithFallback(result)) {
        const fallback = getCandidateFallbacks(candidate).find(
          (item) => !attemptedKeys.has(getCandidateLikeKey(item)),
        );

        if (fallback) {
          const fallbackKey = getCandidateLikeKey(fallback);
          const storedFallback = downloadsByItemKey.get(fallbackKey);

          if (storedFallback && canUseStoredDownload(storedFallback)) {
            setDownloadMessage(
              `当前源未完整写入 R2，已切换到 ${
                pluginProviderLabels[fallback.source]
              } 的云端版本。`,
            );
            markStoredDownload(storedFallback);
            if (downloadFile) {
              triggerStoredDownloadFile(storedFallback);
            }
            return {
              download: storedFallback,
              warnings: [],
            } satisfies StudioPrepareMusicDownloadResult;
          }

          setDownloadMessage(
            `当前源未完整写入 R2，正在尝试 ${
              pluginProviderLabels[fallback.source]
            }：${fallback.title}`,
          );
          return await prepareAndDownload(
            candidateToLibraryItem(
              fallback,
              resolvedUrls[fallbackKey] ?? "",
              candidateLyrics[fallbackKey] ?? "",
            ),
            fallback,
            {
              allowFallback,
              attemptedKeys,
              downloadFile,
              quiet,
            },
          );
        }
      }

      return result;
    } catch (error) {
      if (candidate && allowFallback && shouldTryCandidateFallback(error)) {
        const fallback = getCandidateFallbacks(candidate).find(
          (item) => !attemptedKeys.has(getCandidateLikeKey(item)),
        );

        if (fallback) {
          const fallbackKey = getCandidateLikeKey(fallback);
          setDownloadMessage(
            `保存失败，正在切换到 ${
              pluginProviderLabels[fallback.source]
            }：${fallback.title}`,
          );
          return await prepareAndDownload(
            candidateToLibraryItem(
              fallback,
              resolvedUrls[fallbackKey] ?? "",
              candidateLyrics[fallbackKey] ?? "",
            ),
            fallback,
            {
              allowFallback,
              attemptedKeys,
              downloadFile,
              quiet,
            },
          );
        }
      }

      setDownloadProgress((current) =>
        current
          ? {
              ...current,
              phase: "error",
            }
          : null,
      );
      setDownloadMessage(
        error instanceof Error ? error.message : "下载前解析音源失败。",
      );
      return null;
    }
  }

  async function downloadTrack(track: StudioMusicTrack) {
    const storedDownload = downloadsByItemKey.get(getTrackLikeKey(track));

    if (storedDownload && canUseStoredDownload(storedDownload)) {
      markStoredDownload(storedDownload);
      triggerStoredDownloadFile(storedDownload);
      return;
    }

    await prepareAndDownload(
      trackToLibraryItem(track, resolvedUrls[track.id] ?? track.audioUrl),
      undefined,
      { downloadFile: true },
    );
  }

  async function downloadCandidate(candidate: StudioMusicSearchCandidate) {
    if (
      searchSources.length > 0 &&
      !enabledSearchProviderSet.has(candidate.source)
    ) {
      setPlayError("这个远程搜索源已停用，请重新搜索或启用对应音源。");
      return;
    }

    const cacheKey = getCandidateLikeKey(candidate);
    const storedDownload = downloadsByItemKey.get(cacheKey);

    if (storedDownload && canUseStoredDownload(storedDownload)) {
      markStoredDownload(storedDownload);
      triggerStoredDownloadFile(storedDownload);
      return;
    }

    await prepareAndDownload(
      candidateToLibraryItem(
        candidate,
        resolvedUrls[cacheKey] ?? "",
        candidateLyrics[cacheKey] ?? "",
      ),
      candidate,
      { downloadFile: true },
    );
  }

  async function playLibraryItem(
    item: StudioMusicLibraryItem,
    nextQueue = [libraryItemToQueueItem(item)],
    startTime = 0,
    allowSearchFallback = true,
  ) {
    const matchedTrack = item.trackId
      ? tracks.find((track) => track.id === item.trackId)
      : null;

    if (matchedTrack) {
      void playTrack(
        matchedTrack,
        tracks.indexOf(matchedTrack),
        nextQueue,
        startTime,
      );
      return;
    }

    const candidate = libraryItemToCandidate(item);

    if (candidate) {
      libraryFallbackItemRef.current = item;
      if (item.audioUrl) {
        setResolvedUrls((current) => ({
          ...current,
          [item.itemKey]: item.audioUrl,
        }));
      }

      if (item.lyric) {
        setCandidateLyrics((current) => ({
          ...current,
          [item.itemKey]: item.lyric,
        }));
      }

      const played = await playCandidate(
        candidate,
        nextQueue,
        startTime,
        new Set<string>(),
        item,
        item.itemKey,
      );

      if (!played && allowSearchFallback && enabledSearchProviders.length > 0) {
        const fallbacks = await searchLibraryItemFallbacks(item, candidate.source);
        const [fallback] = fallbacks;

        if (fallback) {
          setDownloadMessage(
            `收藏里的 ${pluginProviderLabels[candidate.source]} 源不可用，正在切到 ${pluginProviderLabels[fallback.source]}：${fallback.title}`,
          );
          await playCandidate(
            fallback,
            replaceLibraryItemWithCandidateInQueue(nextQueue, item, fallback),
            startTime,
            new Set<string>(),
            item,
            item.itemKey,
          );
        }
      }
      return;
    }

    setPlayError("这首歌没有可用的源信息，可能原曲库记录已被删除。");
  }

  async function switchLibraryItemSource(
    item: StudioMusicLibraryItem,
    nextQueue = [libraryItemToQueueItem(item)],
  ) {
    if (item.provider === "manual") {
      setPlayError("本地/R2 手动歌曲没有其它远程源可以切换。");
      return;
    }

    setPlayError("");
    setDownloadMessage(`正在为 ${item.title} 搜索其它音源...`);

    try {
      const fallbacks = await searchLibraryItemFallbacks(item, item.provider);
      const [fallback] = fallbacks;

      if (!fallback) {
        setPlayError("没有找到相似的可切换音源。");
        return;
      }

      setDownloadMessage(
        `正在从 ${pluginProviderLabels[item.provider]} 切到 ${pluginProviderLabels[fallback.source]}：${fallback.title}`,
      );
      await playCandidate(
        fallback,
        replaceLibraryItemWithCandidateInQueue(nextQueue, item, fallback),
        0,
        new Set<string>(),
        item,
        item.itemKey,
      );
    } catch (error) {
      setPlayError(error instanceof Error ? error.message : "换源失败。");
    }
  }

  function playlistToQueue(playlist: StudioMusicPlaylist) {
    return playlist.items.map((item) => ({
      ...libraryItemToQueueItem(item),
      sourceLabel: playlist.name,
    }));
  }

  function playPlaylist(playlist: StudioMusicPlaylist) {
    const [firstItem] = playlist.items;

    if (!firstItem) {
      setDownloadMessage("这个歌单还没有歌曲。");
      return;
    }

    void playLibraryItem(firstItem, playlistToQueue(playlist));
  }

  function playPlaylistItem(
    item: StudioMusicPlaylistItem,
    playlist: StudioMusicPlaylist,
  ) {
    void playLibraryItem(item, playlistToQueue(playlist));
  }

  async function addCurrentToPlaylist(playlistId: string) {
    const item = getCurrentLibraryItem();

    if (!item) {
      setDownloadMessage("先播放或选中一首歌。");
      return;
    }

    setPlayError("");
    setDownloadMessage("");

    try {
      await onAddPlaylistItem(playlistId, item);
      setDownloadMessage(`已加入歌单：${item.title}`);
    } catch (error) {
      setPlayError(error instanceof Error ? error.message : "加入歌单失败。");
    }
  }

  async function addItemToPlaylist(
    playlistId: string,
    item: StudioMusicLibraryItem,
  ) {
    setPlayError("");
    setDownloadMessage("");

    try {
      await onAddPlaylistItem(playlistId, item);
      setDownloadMessage(`已加入歌单：${item.title}`);
    } catch (error) {
      setPlayError(error instanceof Error ? error.message : "加入歌单失败。");
    }
  }

  async function createPlaylist(name: string) {
    setPlayError("");
    setDownloadMessage("");

    try {
      await onCreatePlaylist(name);
      setDownloadMessage(`已创建歌单：${name}`);
    } catch (error) {
      setPlayError(error instanceof Error ? error.message : "创建歌单失败。");
    }
  }

  async function importExternalPlaylistFromUrl(
    url: string,
  ): Promise<StudioMusicPlaylistImportResult> {
    setPlayError("");
    setDownloadMessage("Importing QQ playlist...");

    try {
      const result = await onImportExternalPlaylist(url);

      setDownloadMessage(
        `Imported QQ playlist ${result.playlist.name}: ${result.importedCount}/${result.totalCount} songs.`,
      );

      return result;
    } catch (error) {
      setPlayError(
        error instanceof Error ? error.message : "External playlist import failed.",
      );
      throw error;
    }
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
    setPlayError("");
    setDownloadMessage("");

    try {
      await onUpdatePlaylist(playlist, patch);
      setDownloadMessage(`已更新歌单：${patch.name ?? playlist.name}`);
    } catch (error) {
      setPlayError(error instanceof Error ? error.message : "更新歌单失败。");
    }
  }

  async function uploadPlaylistCover(file: File) {
    setPlayError("");
    setDownloadMessage("");

    try {
      const url = await onUploadAudio(file, "covers");

      if (url) {
        setDownloadMessage("歌单封面已上传到 R2。");
      }

      return url;
    } catch (error) {
      setPlayError(error instanceof Error ? error.message : "歌单封面上传失败。");
      return null;
    }
  }

  async function reorderPlaylistItems(playlistId: string, itemIds: string[]) {
    setPlayError("");
    setDownloadMessage("");

    try {
      await onReorderPlaylistItems(playlistId, itemIds);
      setDownloadMessage("已调整歌单排序。");
    } catch (error) {
      setPlayError(error instanceof Error ? error.message : "调整排序失败。");
    }
  }

  async function removePlaylistItem(
    item: StudioMusicPlaylistItem,
    playlist: StudioMusicPlaylist,
  ) {
    setPlayError("");
    setDownloadMessage("");

    try {
      await onRemovePlaylistItem({
        id: item.id,
        playlistId: playlist.id,
        title: item.title,
      });
      setDownloadMessage(`已移出歌单：${item.title}`);
    } catch (error) {
      setPlayError(error instanceof Error ? error.message : "移出歌单失败。");
    }
  }

  async function removePlaylistItems(
    items: StudioMusicPlaylistItem[],
    playlist: StudioMusicPlaylist,
  ) {
    if (items.length === 0) return;

    setPlayError("");
    setDownloadMessage(`正在从歌单移出 ${items.length} 首歌曲...`);
    setPlaylistBatching(true);

    let removed = 0;
    let failed = 0;

    try {
      for (const item of items) {
        try {
          await onRemovePlaylistItem({
            id: item.id,
            playlistId: playlist.id,
            title: item.title,
          });
          removed += 1;
        } catch {
          failed += 1;
        }
      }

      setDownloadMessage(
        failed > 0
          ? `歌单批量移出完成：${removed} 首成功，${failed} 首需要检查。`
          : `歌单批量移出完成：${removed} 首已移出。`,
      );
    } finally {
      setPlaylistBatching(false);
    }
  }

  async function copyPlaylistItemsToPlaylist(
    items: StudioMusicPlaylistItem[],
    playlistId: string,
  ) {
    if (items.length === 0) return;

    const targetPlaylist = playlists.find((playlist) => playlist.id === playlistId);

    if (!targetPlaylist) {
      setPlayError("没有找到目标歌单。");
      return;
    }

    setPlayError("");
    setDownloadMessage(
      `正在复制 ${items.length} 首歌曲到歌单：${targetPlaylist.name}`,
    );
    setPlaylistBatching(true);

    let copied = 0;
    let failed = 0;

    try {
      for (const item of items) {
        try {
          await onAddPlaylistItem(playlistId, item);
          copied += 1;
        } catch {
          failed += 1;
        }
      }

      setDownloadMessage(
        failed > 0
          ? `批量复制完成：${copied} 首已加入 ${targetPlaylist.name}，${failed} 首需要检查。`
          : `批量复制完成：${copied} 首已加入 ${targetPlaylist.name}。`,
      );
    } finally {
      setPlaylistBatching(false);
    }
  }

  async function deletePlaylistRecord(playlist: StudioMusicPlaylist) {
    setPlayError("");
    setDownloadMessage("");

    try {
      await onDeletePlaylist(playlist);
      setDownloadMessage(`已删除歌单：${playlist.name}`);
    } catch (error) {
      setPlayError(error instanceof Error ? error.message : "删除歌单失败。");
    }
  }

  async function downloadLibraryItem(item: StudioMusicLibraryItem) {
    if (isMusicDownloadItem(item)) {
      setPlayError("");
      setDownloadMessage("");

      try {
        if (canUseStoredDownload(item)) {
          markStoredDownload(item);
          triggerStoredDownloadFile(item);
        } else {
          await prepareAndDownload(item, libraryItemToCandidate(item) ?? undefined, {
            downloadFile: true,
          });
        }
      } catch (error) {
        setDownloadProgress((current) =>
          current
            ? {
                ...current,
                phase: "error",
              }
            : null,
        );
        setDownloadMessage(
          error instanceof Error ? error.message : "下载记录读取失败。",
        );
      }

      return;
    }

    const matchedTrack = item.trackId
      ? tracks.find((track) => track.id === item.trackId)
      : null;

    if (matchedTrack) {
      void downloadTrack(matchedTrack);
      return;
    }

    const candidate = libraryItemToCandidate(item);

    if (candidate) {
      await prepareAndDownload(item, candidate, { downloadFile: true });
      return;
    }

    await prepareAndDownload(item, undefined, { downloadFile: true });
  }

  async function repairDownloadLibrary() {
    if (repairableDownloads.length === 0) {
      setDownloadMessage("下载库状态正常，没有需要补传的记录。");
      return;
    }

    setPlayError("");
    setDownloadMessage(`准备修复 ${repairableDownloads.length} 条下载记录...`);
    setRepairingDownloads(true);

    let repaired = 0;
    let failed = 0;

    try {
      for (const download of repairableDownloads) {
        setDownloadMessage(
          `正在修复下载记录 ${repaired + failed + 1}/${
            repairableDownloads.length
          }：${download.title}`,
        );

        try {
          const result = await prepareAndDownload(
            download,
            libraryItemToCandidate(download) ?? undefined,
            { quiet: true },
          );

          if (result?.download.storageStatus === "ready") {
            repaired += 1;
          } else {
            failed += 1;
          }
        } catch {
          failed += 1;
        }
      }

      setDownloadMessage(
        failed > 0
          ? `下载库修复完成：${repaired} 条已补传到 R2，${failed} 条仍需检查。`
          : `下载库修复完成：${repaired} 条已补传到 R2。`,
      );
    } finally {
      setRepairingDownloads(false);
    }
  }

  async function downloadPlaylistToR2(playlist: StudioMusicPlaylist) {
    if (playlist.items.length === 0) {
      setDownloadMessage("这个歌单还没有歌曲。");
      return;
    }

    setPlayError("");
    setDownloadMessage(`准备补存歌单：${playlist.name}`);
    setDownloadingPlaylistId(playlist.id);

    let ready = 0;
    let failed = 0;

    try {
      for (const item of playlist.items) {
        const storedDownload = downloadsByItemKey.get(item.itemKey);

        if (storedDownload?.storageStatus === "ready") {
          ready += 1;
          continue;
        }

        setDownloadMessage(
          `正在补存歌单 ${playlist.name}：${ready + failed + 1}/${
            playlist.items.length
          } ${item.title}`,
        );

        const result = await prepareAndDownload(
          item,
          libraryItemToCandidate(item) ?? undefined,
          { quiet: true },
        );

        if (result?.download.storageStatus === "ready") {
          ready += 1;
        } else {
          failed += 1;
        }
      }

      setDownloadMessage(
        failed > 0
          ? `歌单补存完成：${ready} 首已在 R2，${failed} 首仍需检查。`
          : `歌单补存完成：${ready} 首已在 R2。`,
      );
    } finally {
      setDownloadingPlaylistId("");
    }
  }

  async function downloadPlaylistItemsToR2(
    playlist: StudioMusicPlaylist,
    items: StudioMusicPlaylistItem[],
  ) {
    if (items.length === 0) {
      setDownloadMessage("这个歌单还没有可补存的歌曲。");
      return;
    }

    setPlayError("");
    setDownloadMessage(`准备补存 ${items.length} 首歌单歌曲到 R2`);
    setDownloadingPlaylistId(playlist.id);

    let ready = 0;
    let failed = 0;

    try {
      for (const item of items) {
        const storedDownload = downloadsByItemKey.get(item.itemKey);

        if (storedDownload?.storageStatus === "ready") {
          ready += 1;
          continue;
        }

        setDownloadMessage(
          `正在补存歌单 ${playlist.name}：${ready + failed + 1}/${
            items.length
          } ${item.title}`,
        );

        const result = await prepareAndDownload(
          item,
          libraryItemToCandidate(item) ?? undefined,
          { quiet: true },
        );

        if (result?.download.storageStatus === "ready") {
          ready += 1;
        } else {
          failed += 1;
        }
      }

      setDownloadMessage(
        failed > 0
          ? `歌单批量补存完成：${ready} 首已在 R2，${failed} 首仍需检查。`
          : `歌单批量补存完成：${ready} 首已在 R2。`,
      );
    } finally {
      setDownloadingPlaylistId("");
    }
  }

  async function deleteDownloadRecord(download: StudioMusicDownload) {
    setPlayError("");
    setDownloadMessage("");

    try {
      await onDeleteDownload(download);
      setDownloadMessage(`已删除下载记录：${download.title}`);
      setDownloadProgress((current) =>
        current?.itemKey === download.itemKey ? null : current,
      );
    } catch (error) {
      setDownloadMessage(
        error instanceof Error ? error.message : "删除下载记录失败。",
      );
    }
  }

  function renderDownloadProgress() {
    if (!downloadProgress) return null;

    const phaseLabel =
      downloadProgress.phase === "preparing"
        ? "Saving to R2"
        : downloadProgress.phase === "complete"
          ? "Resolving source and writing to R2"
          : downloadProgress.phase === "error"
            ? "Check the error message"
            : "Processing";
    const sizeLabel =
      downloadProgress.phase === "complete"
        ? "Stored in cloud"
        : downloadProgress.phase === "preparing"
          ? "解析并写入 R2"
          : downloadProgress.phase === "error"
            ? "请查看错误提示"
            : "正在处理";

    return (
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 rounded-2xl border border-emerald-200/70 bg-white/70 p-4 shadow-lg shadow-emerald-900/5 backdrop-blur-xl dark:border-emerald-300/15 dark:bg-emerald-300/10"
        exit={{ opacity: 0, y: -8 }}
        initial={{ opacity: 0, y: 8 }}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-emerald-500">
              {phaseLabel}
            </p>
            <p className="mt-1 truncate text-sm font-black text-slate-950 dark:text-white">
              {downloadProgress.title}
            </p>
          </div>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-300">
            {sizeLabel}
          </p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
          <motion.div
            animate={{ width: `${downloadProgress.progress}%` }}
            className="h-full rounded-full bg-emerald-400"
            transition={{ duration: 0.25, ease: "easeOut" }}
          />
        </div>
      </motion.div>
    );
  }

  function downloadCurrent() {
    if (safeSelectedCandidate) {
      void downloadCandidate(safeSelectedCandidate);
      return;
    }

    if (currentTrack) {
      void downloadTrack(currentTrack);
      return;
    }

    setDownloadMessage("先选择一首音乐。");
  }

  async function importChangqingSource() {
    setPlayError("");
    setDownloadMessage("");

    try {
      await onImportChangqingSource();
      setDownloadMessage("长青音源已导入 PG，并会优先用于平台 ID 解析。");
    } catch (error) {
      setPlayError(
        error instanceof Error ? error.message : "长青音源导入失败。",
      );
    }
  }

  async function checkChangqingVersion() {
    setPlayError("");
    setDownloadMessage("");

    try {
      const status = await onCheckChangqingVersion();
      const message = status.error
        ? `长青源远端检查失败：${status.error}`
        : status.updateAvailable
          ? `长青源有更新：本地 ${status.localVersion || "未导入"} / 远端 ${status.remoteVersion}`
          : `长青源已是最新：${status.localVersion || status.remoteVersion || "未知版本"}`;

      setDownloadMessage(message);
    } catch (error) {
      setPlayError(
        error instanceof Error ? error.message : "长青源版本检查失败。",
      );
    }
  }

  async function updateChangqingSource() {
    setPlayError("");
    setDownloadMessage("");

    try {
      await onUpdateChangqingSource(sourceUpdateCode);
      setSourceUpdateCode("");
      setDownloadMessage("长青源已写入 PG，后续解析会使用新版脚本。");
    } catch (error) {
      setPlayError(
        error instanceof Error ? error.message : "长青源更新写入失败。",
      );
    }
  }

  async function importDefaultSearchSources() {
    setPlayError("");
    setDownloadMessage("");

    try {
      await onImportDefaultSearchSources();
      setDownloadMessage("远程搜索源已同步到 PG。");
    } catch (error) {
      setPlayError(
        error instanceof Error ? error.message : "远程搜索源同步失败。",
      );
    }
  }

  async function updateSearchSource(
    source: StudioMusicSearchSource,
    patch: Partial<Pick<StudioMusicSearchSource, "enabled" | "name" | "sortOrder" | "url" | "version">>,
  ) {
    setPlayError("");
    setDownloadMessage("");

    try {
      await onUpdateSearchSource(source, patch);
      setDownloadMessage(`已更新搜索源：${source.name}`);
    } catch (error) {
      setPlayError(
        error instanceof Error ? error.message : "远程搜索源更新失败。",
      );
    }
  }

  async function testSearchSource(source: StudioMusicSearchSource) {
    const keyword = sourceTestKeyword.trim() || "晴天";

    setPlayError("");
    setDownloadMessage("");
    setTestingSourceId(source.id);

    try {
      const result = await onTestSearchSource(source, keyword);
      setSourceTestResults((current) => ({
        ...current,
        [source.id]: result,
      }));
      setDownloadMessage(
        result.ok
          ? `${source.name} 测试完成：${result.total} 条结果`
          : `${source.name} 测试失败：${result.error}`,
      );
    } catch (error) {
      setPlayError(
        error instanceof Error ? error.message : "远程搜索源测试失败。",
      );
    } finally {
      setTestingSourceId("");
    }
  }

  async function testSearchSourcesBatch(onlyEnabled: boolean) {
    const targets = onlyEnabled
      ? searchSources.filter((source) => source.enabled)
      : searchSources;
    const keyword = sourceTestKeyword.trim() || "晴天";

    if (targets.length === 0) {
      setDownloadMessage(onlyEnabled ? "没有已启用的搜索源。" : "还没有搜索源。");
      return;
    }

    setPlayError("");
    setDownloadMessage(`正在测试 ${targets.length} 个搜索源...`);
    setTestingBatch(true);

    try {
      const results: StudioMusicSearchSourceTestResult[] = [];

      for (const source of targets) {
        setTestingSourceId(source.id);
        const result = await onTestSearchSource(source, keyword);
        results.push(result);
        setSourceTestResults((current) => ({
          ...current,
          [source.id]: result,
        }));
      }

      const searchable = results.filter((result) => result.total > 0).length;
      const playable = results.filter((result) => result.resolve?.audioOk).length;
      const lyricReady = results.filter((result) => result.resolve?.lyricOk).length;

      setDownloadMessage(
        `批量测试完成：${searchable}/${results.length} 可搜索，${playable}/${results.length} 可播放，${lyricReady}/${results.length} 有歌词。`,
      );
    } catch (error) {
      setPlayError(
        error instanceof Error ? error.message : "批量测试搜索源失败。",
      );
    } finally {
      setTestingSourceId("");
      setTestingBatch(false);
    }
  }

  async function disableFailedSearchSources() {
    const failedSourceIds = new Set(
      Object.values(sourceTestResults)
        .filter((result) => result.total === 0 || !result.resolve?.audioOk)
        .map((result) => result.sourceId),
    );
    const targets = searchSources.filter(
      (source) => source.enabled && failedSourceIds.has(source.id),
    );

    if (targets.length === 0) {
      setDownloadMessage("没有需要停用的异常搜索源。");
      return;
    }

    setPlayError("");
    setDownloadMessage(`正在停用 ${targets.length} 个异常搜索源...`);

    try {
      for (const source of targets) {
        await onUpdateSearchSource(source, { enabled: false });
      }

      setDownloadMessage(`已停用 ${targets.length} 个异常搜索源。`);
    } catch (error) {
      setPlayError(
        error instanceof Error ? error.message : "停用异常搜索源失败。",
      );
    }
  }

  async function applyRecommendedSearchSourceOrder() {
    const scoredSources = [...searchSources].sort((left, right) => {
      const scoreDiff =
        getSearchSourceHealthScore(right) - getSearchSourceHealthScore(left);

      if (scoreDiff !== 0) return scoreDiff;

      return left.sortOrder - right.sortOrder;
    });

    if (scoredSources.length === 0) {
      setDownloadMessage("还没有搜索源可以排序。");
      return;
    }

    setPlayError("");
    setDownloadMessage("正在按最近体检结果重排搜索源...");

    try {
      for (const [index, source] of scoredSources.entries()) {
        if (source.sortOrder !== index) {
          await onUpdateSearchSource(source, { sortOrder: index });
        }
      }

      setDownloadMessage("已按最近体检结果推荐排序。");
    } catch (error) {
      setPlayError(
        error instanceof Error ? error.message : "推荐排序失败。",
      );
    }
  }

  const player = (
    <MusicBottomPlayer
      currentTime={currentTime}
      currentCandidate={safeSelectedCandidate}
      currentQueueKey={currentQueueKey}
      currentTrack={safeSelectedCandidate ? null : currentTrack}
      duration={duration}
      isLiked={currentLiked}
      isPlaying={isPlaying}
      isResolving={isResolving || Boolean(resolvingTrackId)}
      lyric={currentLyric}
      lyricSource={currentLyricSource}
      playbackMode={playbackMode}
      playbackDiagnostics={playbackDiagnostics}
      progress={progress}
      queueItems={visibleQueueItems}
      sourceStatus={playbackSourceStatus}
      volume={volume}
      onDownload={downloadCurrent}
      onLikeToggle={() => void toggleLiked(getCurrentLibraryItem())}
      onModeChange={setPlaybackMode}
      onNext={nextTrack}
      onOpenImmersive={() => setImmersiveOpen(true)}
      onPlayQueueItem={(item) => playQueueItem(item, visibleQueueItems)}
      onPrevious={previousTrack}
      onResetRuntimeHealth={resetRuntimeSourceHealth}
      onSeek={handleSeek}
      onTogglePlay={togglePlay}
      onVolumeChange={changeVolume}
    />
  );
  const audioNode = (
    <audio
      onCanPlay={handleAudioCanPlay}
      onEnded={handleAudioEnded}
      onError={handleAudioError}
      onLoadedMetadata={handleLoadedMetadata}
      onPause={handleAudioPause}
      onPlay={handleAudioPlay}
      onPlaying={handleAudioPlaying}
      onStalled={handleAudioStalled}
      onTimeUpdate={(event) => {
        setCurrentTime(event.currentTarget.currentTime);
        setDuration(event.currentTarget.duration || 0);
      }}
      onWaiting={handleAudioWaiting}
      ref={audioRef}
    />
  );
  const immersivePlayer = (
    <AnimatePresence>
      {immersiveOpen ? (
        <MusicImmersivePlayer
          currentCandidate={safeSelectedCandidate}
          currentTime={currentTime}
          currentTrack={safeSelectedCandidate ? null : currentTrack}
          duration={duration}
          isLiked={currentLiked}
          isPlaying={isPlaying}
          isResolving={isResolving || Boolean(resolvingTrackId)}
          lyric={currentLyric}
          lyricSource={currentLyricSource}
          playbackMode={playbackMode}
          progress={progress}
          sourceStatus={playbackSourceStatus}
          volume={volume}
          onClose={() => setImmersiveOpen(false)}
          onDownload={downloadCurrent}
          onLikeToggle={() => void toggleLiked(getCurrentLibraryItem())}
          onModeChange={setPlaybackMode}
          onNext={nextTrack}
          onPrevious={previousTrack}
          onSeek={handleSeek}
          onTogglePlay={togglePlay}
          onVolumeChange={changeVolume}
        />
      ) : null}
    </AnimatePresence>
  );

  if (mode === "background") {
    return (
      <>
        {audioNode}
        <MusicBackgroundPlayer
          currentCandidate={safeSelectedCandidate}
          currentTime={currentTime}
          currentTrack={currentTrack}
          duration={duration}
          isPlaying={isPlaying}
          isResolving={isResolving || Boolean(resolvingTrackId)}
          progress={progress}
          volume={volume}
          onDownload={downloadCurrent}
          onNext={nextTrack}
          onOpenImmersive={() => setImmersiveOpen(true)}
          onPrevious={previousTrack}
          onSeek={handleSeek}
          onTogglePlay={togglePlay}
          onVolumeChange={changeVolume}
        />
        {immersivePlayer}
      </>
    );
  }

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="studio-panel flex min-h-[780px] overflow-hidden bg-slate-50/90 p-0 text-slate-950 dark:bg-slate-950/70 dark:text-white"
      initial={{ opacity: 0, y: 18 }}
      transition={{ duration: 0.45 }}
    >
      {audioNode}

      <MusicStudioSidebar
        activeView={sidebarView}
        tracks={tracks}
        onViewChange={setSidebarView}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 px-8 py-5">
          <Button size="icon" type="button" variant="ghost" title="后退">
            <ArrowLeft className="size-5" />
          </Button>
          <Button size="icon" type="button" variant="ghost" title="前进">
            <ArrowRight className="size-5" />
          </Button>
          <label className="flex h-11 w-full max-w-sm items-center gap-2 rounded-2xl bg-slate-200/80 px-4 text-slate-500 dark:bg-white/10">
            <Search className="size-4" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="搜索音乐"
              value={searchText}
            />
          </label>
          <div className="ml-auto hidden min-w-0 flex-1 items-center gap-2 lg:flex">
            <span className="text-xs font-bold text-slate-400">临时脚本</span>
            <input
              className="h-10 min-w-0 flex-1 rounded-2xl bg-white px-4 text-xs font-semibold outline-none ring-1 ring-slate-200 transition focus:ring-emerald-300 dark:bg-white/10 dark:ring-white/10"
              onChange={(event) => setSourcePath(event.target.value)}
              placeholder="可选：未导入 PG 音源时填写本地 LX 脚本路径"
              value={sourcePath}
            />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-8 pb-4">
          {sidebarView === "sources" ? (
            <MusicSourcesPanel
              changqingSource={changqingSource}
              enabledSearchPriorityText={enabledSearchPriorityText}
              enabledSources={enabledSources}
              hasChangqingSource={hasChangqingSource}
              isSearchSourceUpdating={isSearchSourceUpdating}
              isSourceImporting={isSourceImporting}
              isSourceUpdating={isSourceUpdating}
              persistedSearchSourceSummary={persistedSearchSourceSummary}
              qingMusicStatus={qingMusicStatus}
              searchSources={searchSources}
              sourceTestKeyword={sourceTestKeyword}
              sourceTestResults={sourceTestResults}
              sourceTestSummary={sourceTestSummary}
              sourceUpdateCode={sourceUpdateCode}
              sourceVersionStatus={sourceVersionStatus}
              testingBatch={testingBatch}
              testingSourceId={testingSourceId}
              onApplyRecommendedOrder={() =>
                void applyRecommendedSearchSourceOrder()
              }
              onCheckChangqingVersion={() => void checkChangqingVersion()}
              onDisableFailedSearchSources={() =>
                void disableFailedSearchSources()
              }
              onImportChangqingSource={() => void importChangqingSource()}
              onImportDefaultSearchSources={() =>
                void importDefaultSearchSources()
              }
              onSourceTestKeywordChange={setSourceTestKeyword}
              onSourceUpdateCodeChange={setSourceUpdateCode}
              onTestSearchSource={(source) => void testSearchSource(source)}
              onTestSearchSourcesBatch={(onlyEnabled) =>
                void testSearchSourcesBatch(onlyEnabled)
              }
              onUpdateChangqingSource={() => void updateChangqingSource()}
              onUpdateSearchSource={(source, patch) =>
                void updateSearchSource(source, patch)
              }
            />
          ) : null}

          {sidebarView === "library" ? (
            <MusicLibraryPanel
              currentLiked={currentLiked}
              currentTrack={safeSelectedCandidate ? null : currentTrack}
              downloadMessage={downloadMessage}
              downloadProgress={renderDownloadProgress()}
              isLoading={isLoading}
              isPlaying={isPlaying}
              likedKeys={likedKeys}
              playError={playError}
              playlists={playlists}
              resolvingTrackId={resolvingTrackId}
              searchCandidates={visibleSearchCandidates}
              searchKeyword={searchText}
              searchLoading={
                enabledSearchProviders.length > 0 && searchCandidates.isFetching
              }
              tracks={filteredTracks}
              onAddCandidateToPlaylist={(candidate, playlistId) =>
                void addItemToPlaylist(
                  playlistId,
                  candidateToLibraryItem(
                    candidate,
                    resolvedUrls[getCandidateLikeKey(candidate)] ?? "",
                    candidateLyrics[getCandidateLikeKey(candidate)] ?? "",
                  ),
                )
              }
              onAddTrackToPlaylist={(track, playlistId) =>
                void addItemToPlaylist(
                  playlistId,
                  trackToLibraryItem(track, resolvedUrls[track.id] ?? track.audioUrl),
                )
              }
              onCreateTrack={createTrack}
              onDelete={setDeleteTarget}
              onDownloadCandidate={(candidate) => void downloadCandidate(candidate)}
              onDownloadCurrent={downloadCurrent}
              onDownloadTrack={(track) => void downloadTrack(track)}
              onEdit={editTrack}
              onLikeCandidate={(candidate) =>
                void toggleLiked(
                  candidateToLibraryItem(
                    candidate,
                    resolvedUrls[getCandidateLikeKey(candidate)] ?? "",
                    candidateLyrics[getCandidateLikeKey(candidate)] ?? "",
                  ),
                )
              }
              onLikeCurrent={() => void toggleLiked(getCurrentLibraryItem())}
              onLikeTrack={(track) =>
                void toggleLiked(
                  trackToLibraryItem(track, resolvedUrls[track.id] ?? track.audioUrl),
                )
              }
              onPlay={(track, index) => void playTrack(track, index, libraryQueue)}
              onPlayCandidate={(candidate) => void playCandidate(candidate, searchQueue)}
              onTogglePlay={togglePlay}
            />
          ) : null}

          {sidebarView === "favorites" ? (
            <MusicMemoryList
              emptyText="还没有喜欢的音乐，点任意歌曲旁边的爱心就会出现在这里。"
              items={favorites}
              likedKeys={likedKeys}
              playlists={playlists}
              subtitle="My Library"
              title="喜欢"
              onAddToPlaylist={(item, playlistId) =>
                void addItemToPlaylist(playlistId, item)
              }
              onDownload={(item) => void downloadLibraryItem(item)}
              onLike={(item) => void toggleLiked(item)}
              onPlay={(item) => void playLibraryItem(item, favoriteQueue)}
              onSwitchSource={(item) =>
                void switchLibraryItemSource(item, favoriteQueue)
              }
            />
          ) : null}

          {sidebarView === "history" ? (
            <MusicMemoryList
              emptyText="还没有播放历史，播放一首歌后这里会记录最近听过的音乐。"
              items={playHistory}
              likedKeys={likedKeys}
              playlists={playlists}
              subtitle="Recently Played"
              title="最近"
              onAddToPlaylist={(item, playlistId) =>
                void addItemToPlaylist(playlistId, item)
              }
              onDownload={(item) => void downloadLibraryItem(item)}
              onLike={(item) => void toggleLiked(item)}
              onPlay={(item) => void playLibraryItem(item, historyQueue)}
              onSwitchSource={(item) =>
                void switchLibraryItemSource(item, historyQueue)
              }
            />
          ) : null}

          {sidebarView === "downloads" ? (
            <MusicDownloadsPanel
              counts={downloadStorageCounts}
              deletingDownloadId={deletingDownloadId}
              downloads={filteredDownloads}
              emptyText={getDownloadFilterEmptyText(downloadStorageFilter)}
              filter={downloadStorageFilter}
              isRepairDisabled={
                repairingDownloads || repairableDownloads.length === 0 || isResolving
              }
              likedKeys={likedKeys}
              playlists={playlists}
              repairableCount={repairableDownloads.length}
              repairingDownloads={repairingDownloads}
              onAddToPlaylist={(item, playlistId) =>
                void addItemToPlaylist(playlistId, item)
              }
              onDeleteDownload={setDownloadDeleteTarget}
              onDownload={(item) => void downloadLibraryItem(item)}
              onFilterChange={setDownloadStorageFilter}
              onLike={(item) => void toggleLiked(item)}
              onPlay={(item) => void playLibraryItem(item, downloadQueue)}
              onRepair={() => void repairDownloadLibrary()}
              onSwitchSource={(item) =>
                void switchLibraryItemSource(item, downloadQueue)
              }
            />
          ) : null}
          {sidebarView === "playlists" ? (
            <MusicPlaylistBoard
              currentItem={getCurrentLibraryItem()}
              downloadingPlaylistId={downloadingPlaylistId}
              downloadsByItemKey={downloadsByItemKey}
              isBatching={playlistBatching}
              isImportingExternalPlaylist={isPlaylistImporting}
              likedKeys={likedKeys}
              playlists={playlists}
              onAddCurrent={(playlistId) => void addCurrentToPlaylist(playlistId)}
              onCopyItemsToPlaylist={(items, playlistId) =>
                copyPlaylistItemsToPlaylist(items, playlistId)
              }
              onCreatePlaylist={(name) => void createPlaylist(name)}
              onDeletePlaylist={setPlaylistDeleteTarget}
              onDownloadItem={(item) => void downloadLibraryItem(item)}
              onDownloadItems={(playlist, items) =>
                downloadPlaylistItemsToR2(playlist, items)
              }
              onDownloadPlaylist={(playlist) => void downloadPlaylistToR2(playlist)}
              onImportExternalPlaylist={importExternalPlaylistFromUrl}
              onLike={(item) => void toggleLiked(item)}
              onPlayItem={playPlaylistItem}
              onPlayPlaylist={playPlaylist}
              onReorderItems={(playlistId, itemIds) =>
                void reorderPlaylistItems(playlistId, itemIds)
              }
              onRemoveItem={(item, playlist) =>
                void removePlaylistItem(item, playlist)
              }
              onRemoveItems={(items, playlist) =>
                removePlaylistItems(items, playlist)
              }
              onUpdatePlaylist={(playlist, patch) =>
                void updatePlaylist(playlist, patch)
              }
              onUploadCover={uploadPlaylistCover}
            />
          ) : null}
          {sidebarView !== "library" ? (
            <AnimatePresence>{renderDownloadProgress()}</AnimatePresence>
          ) : null}
        </main>

        {player}
      </div>

      <MusicTrackDialog
        form={form}
        isSaving={isSaving}
        open={dialogOpen}
        uploadOpen={uploadOpen}
        uploadStatus={uploadStatus}
        onChange={updateForm}
        onClose={() => setDialogOpen(false)}
        onOpenUpload={setUploadOpen}
        onSave={submitForm}
        onUploadAudio={onUploadAudio}
      />

      <ConfirmDialog
        confirmLabel="删除音乐"
        description={
          deleteTarget
            ? `确定删除《${deleteTarget.title}》吗？只会删除曲库记录，不会删除 R2 源文件。`
            : ""
        }
        open={Boolean(deleteTarget)}
        title="确认删除音乐"
        tone="danger"
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget);
          setDeleteTarget(null);
        }}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      />

      <ConfirmDialog
        confirmLabel="删除下载"
        description={
          downloadDeleteTarget
            ? `确定删除《${downloadDeleteTarget.title}》的下载记录吗？会同时尝试删除 R2 中的音频和封面缓存。`
            : ""
        }
        isPending={deletingDownloadId === downloadDeleteTarget?.id}
        open={Boolean(downloadDeleteTarget)}
        title="确认删除下载"
        tone="danger"
        onConfirm={async () => {
          if (downloadDeleteTarget) {
            await deleteDownloadRecord(downloadDeleteTarget);
          }
          setDownloadDeleteTarget(null);
        }}
        onOpenChange={(open) => {
          if (!open && deletingDownloadId !== downloadDeleteTarget?.id) {
            setDownloadDeleteTarget(null);
          }
        }}
      />

      <ConfirmDialog
        confirmLabel="删除歌单"
        description={
          playlistDeleteTarget
            ? `确定删除歌单《${playlistDeleteTarget.name}》吗？歌单里的歌曲记录会被移除，但不会删除曲库或 R2 文件。`
            : ""
        }
        open={Boolean(playlistDeleteTarget)}
        title="确认删除歌单"
        tone="danger"
        onConfirm={async () => {
          if (playlistDeleteTarget) {
            await deletePlaylistRecord(playlistDeleteTarget);
          }
          setPlaylistDeleteTarget(null);
        }}
        onOpenChange={(open) => {
          if (!open) setPlaylistDeleteTarget(null);
        }}
      />

      {immersivePlayer}
    </motion.section>
  );
}
