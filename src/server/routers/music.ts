import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { hasDatabase } from "@/db";
import {
  musicDownloads,
  musicFavorites,
  musicPlaylistItems,
  musicPlaylists,
  musicPlayHistory,
  musicSearchSources,
  musicSources,
  musicTracks,
} from "@/db/schema";
import {
  resolveLxSourceMusicUrl,
  runLxSourceDryRun,
} from "@/lib/lx-source-lab";
import {
  defaultMusicPluginDefinitions,
  getMusicPluginDefinitions,
  type MusicPluginDefinition,
  type MusicPluginProvider,
  type MusicPluginResolveResult,
  resolveMusicPlugin,
  type MusicSearchCandidate,
  resolveMusicPluginWithFallback,
  searchMusicPlugins,
} from "@/lib/music-plugins";
import {
  fetchQingMusicManifest,
  getEnabledQingMusicProviderIds,
  QING_MUSIC_MANIFEST_URL,
  type QingMusicProviderId,
} from "@/lib/qing-music";
import {
  deleteR2Object,
  getPublicR2Url,
  r2ObjectExists,
  uploadR2Object,
} from "@/lib/r2";
import {
  createTRPCRouter,
  publicProcedure,
  studioProcedure,
} from "@/server/trpc";

const providerSchema = z.enum(["manual", "wy", "tx", "kg", "kw", "mg"]);
const pluginProviderSchema = z.enum(["wy", "kw", "kg", "tx", "mg", "bilibili"]);
const libraryItemProviderSchema = z.enum([
  "manual",
  "wy",
  "tx",
  "kg",
  "kw",
  "mg",
  "bilibili",
]);
const sourceProviderSchema = z.enum(["wy", "tx", "kg", "kw", "mg"]);
const qualitySchema = z.enum(["128k", "320k", "flac"]);
const MAX_SOURCE_CODE_BYTES = 512 * 1024;
const MAX_COVER_BYTES = 6 * 1024 * 1024;
const MAX_AUDIO_BYTES = 80 * 1024 * 1024;
const QING_MUSIC_RESOLVE_TIMEOUT_MS = 12_000;
const QING_MUSIC_RESOLVE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const QQ_MUSIC_PLAYLIST_IMPORT_LIMIT = 2000;
const CHANGQING_MANIFEST_URL = "https://13413.kstore.vip/lxmusic/changqing.json";
const CHANGQING_SOURCE_NAME = "长青 SVIP 音源";
const CHANGQING_SOURCE_PATH =
  "E:/tools/talk/xwechat_files/wxid_7o71z0me71h922_adb4/msg/file/2026-05/【推荐】长青SVIP音源v1.2.0（全平台支持无损）.js";

const trackInput = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(160),
  artist: z.string().min(1).max(160).default("Unknown Artist"),
  album: z.string().max(160).default(""),
  coverUrl: z.string().url().or(z.literal("")).default(""),
  audioUrl: z.string().url().or(z.literal("")).default(""),
  lyric: z.string().max(20000).default(""),
  provider: providerSchema.default("manual"),
  sourceSongId: z.string().max(120).default(""),
  quality: qualitySchema.default("320k"),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  enabled: z.boolean().default(true),
});

const musicLibraryItemInput = z.object({
  album: z.string().max(180).default(""),
  artist: z.string().min(1).max(180).default("Unknown Artist"),
  audioUrl: z.string().url().or(z.literal("")).default(""),
  coverUrl: z.string().url().or(z.literal("")).default(""),
  itemKey: z.string().min(1).max(260),
  itemKind: z.enum(["track", "candidate"]).default("track"),
  lyric: z.string().max(20000).default(""),
  provider: libraryItemProviderSchema.default("manual"),
  quality: qualitySchema.default("320k"),
  sourceSongId: z.string().max(180).default(""),
  title: z.string().min(1).max(180),
  trackId: z.string().max(120).optional(),
});
type MusicLibraryItemInput = z.infer<typeof musicLibraryItemInput>;

const musicDownloadInput = musicLibraryItemInput.extend({
  candidate: z
    .object({
      album: z.string().default(""),
      artist: z.string().default(""),
      artwork: z.string().default(""),
      duration: z.number().default(0),
      id: z.string().min(1),
      raw: z.record(z.string(), z.unknown()),
      source: pluginProviderSchema,
      title: z.string().min(1),
    })
    .optional(),
});

const seedTracks = [
  {
    id: "seed-midnight-refactor",
    title: "Midnight Refactor",
    artist: "MyNewBlog Lab",
    album: "Studio Drafts",
    coverUrl:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80",
    audioUrl:
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    lyric: "[00:00.00] Midnight Refactor\n[00:08.00] Keep the page breathing\n[00:16.00] Let the editor glow",
    provider: "manual",
    sourceSongId: "",
    quality: "320k",
    sortOrder: 0,
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
] as const;

function assertDatabase() {
  if (!hasDatabase) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Music studio needs DATABASE_URL to write tracks.",
    });
  }
}

function toPublicTrack(track: typeof musicTracks.$inferSelect) {
  return {
    ...track,
    createdAt: track.createdAt.toISOString(),
    updatedAt: track.updatedAt.toISOString(),
  };
}

function toPublicFavorite(favorite: typeof musicFavorites.$inferSelect) {
  return {
    album: favorite.album,
    artist: favorite.artist,
    audioUrl: favorite.audioUrl,
    coverUrl: favorite.coverUrl,
    createdAt: favorite.createdAt.toISOString(),
    id: favorite.id,
    itemKey: favorite.itemKey,
    itemKind: favorite.itemKind,
    lyric: favorite.lyric,
    provider: favorite.provider,
    quality: favorite.quality,
    sourceSongId: favorite.sourceSongId,
    title: favorite.title,
    trackId: favorite.trackId ?? undefined,
    updatedAt: favorite.updatedAt.toISOString(),
  };
}

function toPublicPlayHistory(history: typeof musicPlayHistory.$inferSelect) {
  return {
    album: history.album,
    artist: history.artist,
    audioUrl: history.audioUrl,
    coverUrl: history.coverUrl,
    id: history.id,
    itemKey: history.itemKey,
    itemKind: history.itemKind,
    lyric: history.lyric,
    playedAt: history.playedAt.toISOString(),
    provider: history.provider,
    quality: history.quality,
    sourceSongId: history.sourceSongId,
    title: history.title,
    trackId: history.trackId ?? undefined,
  };
}

function toPublicDownload(download: typeof musicDownloads.$inferSelect) {
  return {
    album: download.album,
    artist: download.artist,
    audioObjectKey: download.audioObjectKey,
    audioUrl: download.audioUrl,
    coverObjectKey: download.coverObjectKey,
    coverUrl: download.coverUrl,
    downloadedAt: download.downloadedAt.toISOString(),
    id: download.id,
    itemKey: download.itemKey,
    itemKind: download.itemKind,
    lyric: download.lyric,
    provider: download.provider,
    quality: download.quality,
    sourceSongId: download.sourceSongId,
    title: download.title,
    trackId: download.trackId ?? undefined,
  };
}

function toPublicPlaylistItem(item: typeof musicPlaylistItems.$inferSelect) {
  return {
    album: item.album,
    artist: item.artist,
    audioUrl: item.audioUrl,
    coverUrl: item.coverUrl,
    createdAt: item.createdAt.toISOString(),
    id: item.id,
    itemKey: item.itemKey,
    itemKind: item.itemKind,
    lyric: item.lyric,
    playlistId: item.playlistId,
    provider: item.provider,
    quality: item.quality,
    sortOrder: item.sortOrder,
    sourceSongId: item.sourceSongId,
    title: item.title,
    trackId: item.trackId ?? undefined,
  };
}

function toPublicPlaylist(
  playlist: typeof musicPlaylists.$inferSelect,
  items: Array<typeof musicPlaylistItems.$inferSelect>,
) {
  return {
    coverUrl: playlist.coverUrl,
    createdAt: playlist.createdAt.toISOString(),
    description: playlist.description,
    id: playlist.id,
    items: items.map(toPublicPlaylistItem),
    name: playlist.name,
    sortOrder: playlist.sortOrder,
    updatedAt: playlist.updatedAt.toISOString(),
  };
}

async function toPublicDownloadWithStorage(
  download: typeof musicDownloads.$inferSelect,
) {
  const audioObjectKey = download.audioObjectKey.trim();
  const coverObjectKey = download.coverObjectKey.trim();
  const [audioExists, coverExists] = await Promise.all([
    audioObjectKey ? r2ObjectExists(audioObjectKey) : Promise.resolve(null),
    coverObjectKey ? r2ObjectExists(coverObjectKey) : Promise.resolve(null),
  ]);
  const storageStatus = !audioObjectKey
    ? "record-only"
    : audioExists === true
      ? "ready"
      : audioExists === false
        ? "missing"
        : "unknown";

  return {
    ...toPublicDownload(download),
    audioExists,
    coverExists,
    storageStatus,
  };
}

function musicLibraryItemValues(
  input: z.infer<typeof musicLibraryItemInput>,
  userId: string,
) {
  return {
    album: input.album.trim(),
    artist: input.artist.trim() || "Unknown Artist",
    audioUrl: input.audioUrl.trim(),
    coverUrl: input.coverUrl.trim(),
    createdBy: userId,
    itemKey: input.itemKey.trim(),
    itemKind: input.itemKind,
    lyric: input.lyric,
    provider: input.provider,
    quality: input.quality,
    sourceSongId: input.sourceSongId.trim(),
    title: input.title.trim(),
    trackId: input.trackId?.trim() || null,
  };
}

function musicPlaylistItemValues(
  playlistId: string,
  input: z.infer<typeof musicLibraryItemInput>,
  sortOrder = 0,
) {
  const item = musicLibraryItemValues(input, "__playlist__");

  return {
    album: item.album,
    artist: item.artist,
    audioUrl: item.audioUrl,
    coverUrl: item.coverUrl,
    itemKey: item.itemKey,
    itemKind: item.itemKind,
    lyric: item.lyric,
    playlistId,
    provider: item.provider,
    quality: item.quality,
    sortOrder,
    sourceSongId: item.sourceSongId,
    title: item.title,
    trackId: item.trackId,
  };
}

function safeR2FileName(title: string, extension: string) {
  return `${title || "cover"}.${extension}`
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function extensionFromContentType(contentType: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("avif")) return "avif";

  return "jpg";
}

function extensionFromAudioContentType(contentType: string) {
  if (contentType.includes("flac")) return "flac";
  if (contentType.includes("mpeg") || contentType.includes("mp3")) return "mp3";
  if (contentType.includes("mp4") || contentType.includes("m4a")) return "m4a";
  if (contentType.includes("ogg")) return "ogg";
  if (contentType.includes("opus")) return "opus";
  if (contentType.includes("wav")) return "wav";

  return "mp3";
}

function isPublicR2Url(value: string) {
  const probeUrl = getPublicR2Url("__probe__");

  if (!probeUrl) return false;

  const baseUrl = probeUrl.replace(/\/__probe__$/, "");

  return value === baseUrl || value.startsWith(`${baseUrl}/`);
}

async function cacheCoverToR2(input: {
  coverUrl: string;
  itemKey: string;
  title: string;
}) {
  const coverUrl = input.coverUrl.trim();

  if (!coverUrl || coverUrl.startsWith("data:") || isPublicR2Url(coverUrl)) {
    return {
      coverObjectKey: "",
      coverUrl,
      warnings: [] as string[],
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    let response: Response;

    try {
      response = await fetch(coverUrl, {
        cache: "no-store",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new Error(`cover fetch failed with ${response.status}`);
    }

    const contentType =
      response.headers.get("content-type")?.split(";")[0]?.trim() ||
      "image/jpeg";

    if (!contentType.startsWith("image/")) {
      throw new Error("cover is not an image");
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);

    if (contentLength > MAX_COVER_BYTES) {
      throw new Error("cover is larger than 6MB");
    }

    const bytes = new Uint8Array(await response.arrayBuffer());

    if (bytes.byteLength > MAX_COVER_BYTES) {
      throw new Error("cover is larger than 6MB");
    }

    const extension = extensionFromContentType(contentType);
    const uploaded = await uploadR2Object({
      body: bytes,
      contentType,
      fileName: safeR2FileName(input.title, extension),
      folder: "covers",
      objectKey: `covers/music/${input.itemKey.replace(/[^a-zA-Z0-9._-]+/g, "-")}.${extension}`,
    });

    if (!uploaded?.publicUrl) {
      return {
        coverObjectKey: "",
        coverUrl,
        warnings: ["R2 未配置或上传失败，已保留原始封面地址。"],
      };
    }

    return {
      coverObjectKey: uploaded.objectKey,
      coverUrl: uploaded.publicUrl,
      warnings: [] as string[],
    };
  } catch (error) {
    return {
      coverObjectKey: "",
      coverUrl,
      warnings: [
        error instanceof Error
          ? `封面缓存到 R2 失败：${error.message}`
          : "封面缓存到 R2 失败。",
      ],
    };
  }
}

async function cacheAudioToR2(input: {
  audioUrl: string;
  itemKey: string;
  title: string;
}) {
  const audioUrl = input.audioUrl.trim();

  if (!audioUrl || audioUrl.startsWith("data:") || isPublicR2Url(audioUrl)) {
    return {
      audioObjectKey: "",
      audioUrl,
      warnings: [] as string[],
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 35_000);
    let response: Response;

    try {
      response = await fetch(audioUrl, {
        cache: "no-store",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new Error(`audio fetch failed with ${response.status}`);
    }

    const contentType =
      response.headers.get("content-type")?.split(";")[0]?.trim() ||
      "audio/mpeg";

    if (!contentType.startsWith("audio/") && !contentType.includes("octet-stream")) {
      throw new Error("download target is not an audio file");
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);

    if (contentLength > MAX_AUDIO_BYTES) {
      throw new Error("audio is larger than 80MB");
    }

    const bytes = new Uint8Array(await response.arrayBuffer());

    if (bytes.byteLength > MAX_AUDIO_BYTES) {
      throw new Error("audio is larger than 80MB");
    }

    const extension = extensionFromAudioContentType(contentType);
    const uploaded = await uploadR2Object({
      body: bytes,
      contentType,
      fileName: safeR2FileName(input.title, extension),
      folder: "music",
      objectKey: `music/downloads/${input.itemKey.replace(/[^a-zA-Z0-9._-]+/g, "-")}.${extension}`,
    });

    if (!uploaded?.publicUrl) {
      return {
        audioObjectKey: "",
        audioUrl,
        warnings: ["R2 未配置或音频上传失败，已保留解析后的音频地址。"],
      };
    }

    return {
      audioObjectKey: uploaded.objectKey,
      audioUrl: uploaded.publicUrl,
      warnings: [] as string[],
    };
  } catch (error) {
    return {
      audioObjectKey: "",
      audioUrl,
      warnings: [
        error instanceof Error
          ? `音频保存到 R2 失败：${error.message}`
          : "音频保存到 R2 失败。",
      ],
    };
  }
}

function toPublicSource(source: typeof musicSources.$inferSelect) {
  return {
    id: source.id,
    name: source.name,
    kind: source.kind,
    providerKeys: source.providerKeys,
    sourcePath: source.sourcePath,
    version: source.version,
    enabled: source.enabled,
    sortOrder: source.sortOrder,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
  };
}

function toPublicSearchSource(source: typeof musicSearchSources.$inferSelect) {
  return {
    id: source.id,
    name: source.name,
    provider: source.provider,
    url: source.url,
    version: source.version,
    enabled: source.enabled,
    sortOrder: source.sortOrder,
    lastTestedAt: source.lastTestedAt?.toISOString() ?? null,
    lastTestKeyword: source.lastTestKeyword,
    lastTestOk: source.lastTestOk,
    lastTestSearchable: source.lastTestSearchable,
    lastTestPlayable: source.lastTestPlayable,
    lastTestLyric: source.lastTestLyric,
    lastTestResultCount: source.lastTestResultCount,
    lastTestElapsedMs: source.lastTestElapsedMs,
    lastTestError: source.lastTestError,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
  };
}

function assertMusicPluginProvider(value: string): MusicPluginProvider {
  const parsed = pluginProviderSchema.safeParse(value);

  if (!parsed.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "不支持的远程搜索源 provider。",
    });
  }

  return parsed.data;
}

function assertPluginUrl(value: string) {
  try {
    const url = new URL(value.trim());

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("unsupported protocol");
    }

    return url.toString();
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "远程搜索源 URL 必须是 HTTP/HTTPS 地址。",
    });
  }
}

function assertSafeSourceCode(sourceCode: string) {
  const trimmedCode = sourceCode.trim();

  if (!trimmedCode.endsWith(";") && !trimmedCode.includes("lx.")) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "请粘贴完整的 LX 音源 JS 内容。",
    });
  }

  if (trimmedCode.length > MAX_SOURCE_CODE_BYTES) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "音源脚本超过 512KB，已停止写入。",
    });
  }

  return trimmedCode;
}

function compareVersions(currentVersion: string, nextVersion: string) {
  const currentParts = currentVersion.split(".").map((part) => Number(part) || 0);
  const nextParts = nextVersion.split(".").map((part) => Number(part) || 0);
  const length = Math.max(currentParts.length, nextParts.length);

  for (let index = 0; index < length; index += 1) {
    const current = currentParts[index] ?? 0;
    const next = nextParts[index] ?? 0;

    if (next > current) return 1;
    if (next < current) return -1;
  }

  return 0;
}

function normalizeManifestValue(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 600) : "";
}

async function fetchChangqingManifest() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(CHANGQING_MANIFEST_URL, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`manifest request failed with ${response.status}`);
    }

    const data = (await response.json()) as Record<string, unknown>;

    return {
      description: normalizeManifestValue(data.description),
      updateUrl: normalizeManifestValue(data.updateUrl),
      version: normalizeManifestValue(data.version),
    };
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        error instanceof Error
          ? `长青更新信息检查失败：${error.message}`
          : "长青更新信息检查失败。",
    });
  } finally {
    clearTimeout(timer);
  }
}

async function readSafeSourceFile(sourcePath: string): Promise<string> {
  void sourcePath;

  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Cloudflare 生产包已禁用本地音源脚本导入。",
  });
}

function providerFilter(provider: z.infer<typeof sourceProviderSchema>) {
  return sql`${musicSources.providerKeys} ? ${provider}`;
}

function makeFallbackCandidate(input: {
  album?: string;
  artist?: string;
  coverUrl?: string;
  provider: MusicPluginProvider;
  songId: string;
  title?: string;
}): MusicSearchCandidate {
  return {
    album: input.album ?? "",
    artist: input.artist ?? "",
    artwork: input.coverUrl ?? "",
    duration: 0,
    id: input.songId,
    raw: {
      album: input.album ?? "",
      artist: input.artist ?? "",
      artwork: input.coverUrl ?? "",
      id: input.songId,
      title: input.title ?? input.songId,
    },
    source: input.provider,
    title: input.title ?? input.songId,
  };
}

function toProviderSchemaValue(provider: z.infer<typeof libraryItemProviderSchema>) {
  return provider === "bilibili" ? "manual" : provider;
}

async function resolveWithConfiguredSource(
  ctx: { db: typeof import("@/db").db },
  input: {
    provider: z.infer<typeof sourceProviderSchema>;
    quality: z.infer<typeof qualitySchema>;
    songId: string;
  },
) {
  if (!hasDatabase) return null;

  const [source] = await ctx.db
    .select()
    .from(musicSources)
    .where(sql`${musicSources.enabled} = true and ${providerFilter(input.provider)}`)
    .orderBy(asc(musicSources.sortOrder), desc(musicSources.createdAt))
    .catch(() => []);

  if (!source) return null;

  return resolveLxSourceMusicUrl({
    provider: input.provider,
    quality: input.quality,
    songId: input.songId,
    sourceCode: source.sourceCode,
    sourceName: source.name,
    sourcePath: source.sourcePath,
  });
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown music source error.";
}

function assertHttpAudioUrl(value: string) {
  const trimmed = value.trim();

  try {
    const url = new URL(trimmed);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }

    return trimmed;
  } catch {
    return "";
  }
}

function normalizePlaybackAudioUrl(value: string) {
  const audioUrl = assertHttpAudioUrl(value);

  if (!audioUrl) return "";

  return audioUrl.replace(/^http:\/\//i, "https://");
}

function extractAudioUrl(value: unknown): string {
  if (typeof value === "string") return assertHttpAudioUrl(value);
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return "";
  }

  const record = value as Record<string, unknown>;

  for (const key of ["url", "musicUrl", "audioUrl", "playUrl", "data"]) {
    const candidate = record[key];
    const audioUrl = extractAudioUrl(candidate);

    if (audioUrl) return audioUrl;
  }

  return "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getRecordText(record: Record<string, unknown>, key: string) {
  const value = record[key];

  return typeof value === "string" ? value.trim() : "";
}

function getRecordValueText(record: Record<string, unknown>, key: string) {
  const value = record[key];

  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);

  return "";
}

function getRecordNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];

  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) return parsed;
  }

  return 0;
}

function getNestedRecord(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> | null {
  return asRecord(record[key]);
}

function extractLyricText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return "";
  }

  const record = value as Record<string, unknown>;

  for (const key of ["lyric", "lrc", "content", "text", "data"]) {
    const candidate = record[key];
    const lyric = extractLyricText(candidate);

    if (lyric) return lyric;
  }

  return "";
}

function formatLrcTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const wholeSeconds = Math.floor(safeSeconds % 60);
  const hundredths = Math.floor((safeSeconds - Math.floor(safeSeconds)) * 100);
  const pad = (value: number) => value.toString().padStart(2, "0");

  return `${pad(minutes)}:${pad(wholeSeconds)}.${pad(hundredths)}`;
}

function decodeBase64Utf8(value: string) {
  const binary = globalThis.atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes).trim();
}

function toKuwoLrc(payload: unknown) {
  const root = asRecord(payload);
  const data = root ? getNestedRecord(root, "data") : null;
  const lyricRows = data?.lrclist;

  if (!Array.isArray(lyricRows)) return extractLyricText(payload);

  return lyricRows
    .map((row) => {
      const record = asRecord(row);
      if (!record) return "";

      const lineLyric = getRecordText(record, "lineLyric");
      const time = Number(getRecordText(record, "time"));

      if (!lineLyric) return "";

      return `[${formatLrcTime(time)}]${lineLyric}`;
    })
    .filter(Boolean)
    .join("\n");
}

async function resolveKuwoBuiltInLyric(songId: string) {
  const url = new URL("https://m.kuwo.cn/newh5/singles/songinfoandlrc");

  url.searchParams.set("musicId", songId);

  const payload = await fetchJsonWithTimeout(
    url,
    {
      headers: {
        accept: "application/json,text/plain,*/*",
        referer: "https://m.kuwo.cn/",
        "user-agent": QING_MUSIC_RESOLVE_USER_AGENT,
      },
    },
    "Kuwo built-in lyric resolver",
  );

  return toKuwoLrc(payload);
}

async function resolveKugouBuiltInLyric(songId: string) {
  const searchUrl = new URL("https://lyrics.kugou.com/search");

  searchUrl.searchParams.set("ver", "1");
  searchUrl.searchParams.set("man", "yes");
  searchUrl.searchParams.set("client", "pc");
  searchUrl.searchParams.set("hash", songId);

  const searchPayload = await fetchJsonWithTimeout(
    searchUrl,
    {
      headers: {
        accept: "application/json,text/plain,*/*",
        referer: "https://www.kugou.com/",
        "user-agent": QING_MUSIC_RESOLVE_USER_AGENT,
      },
    },
    "Kugou lyric search",
  );
  const searchRecord = asRecord(searchPayload);
  const candidates = Array.isArray(searchRecord?.candidates)
    ? searchRecord.candidates
    : [];
  const firstCandidate = asRecord(candidates[0]);
  const lyricId = firstCandidate ? getRecordText(firstCandidate, "id") : "";
  const accessKey = firstCandidate
    ? getRecordText(firstCandidate, "accesskey")
    : "";

  if (!lyricId || !accessKey) return "";

  const downloadUrl = new URL("https://lyrics.kugou.com/download");

  downloadUrl.searchParams.set("ver", "1");
  downloadUrl.searchParams.set("client", "pc");
  downloadUrl.searchParams.set("id", lyricId);
  downloadUrl.searchParams.set("accesskey", accessKey);
  downloadUrl.searchParams.set("fmt", "lrc");
  downloadUrl.searchParams.set("charset", "utf8");

  const downloadPayload = await fetchJsonWithTimeout(
    downloadUrl,
    {
      headers: {
        accept: "application/json,text/plain,*/*",
        referer: "https://www.kugou.com/",
        "user-agent": QING_MUSIC_RESOLVE_USER_AGENT,
      },
    },
    "Kugou lyric download",
  );
  const downloadRecord = asRecord(downloadPayload);
  const encodedContent = downloadRecord
    ? getRecordText(downloadRecord, "content")
    : "";

  return encodedContent ? decodeBase64Utf8(encodedContent) : "";
}

async function resolveNeteaseBuiltInLyric(songId: string) {
  const url = new URL("https://music.163.com/api/song/lyric");

  url.searchParams.set("id", songId);
  url.searchParams.set("lv", "-1");
  url.searchParams.set("kv", "-1");
  url.searchParams.set("tv", "-1");

  const payload = await fetchJsonWithTimeout(
    url,
    {
      headers: {
        accept: "application/json,text/plain,*/*",
        referer: "https://music.163.com/",
        "user-agent": QING_MUSIC_RESOLVE_USER_AGENT,
      },
    },
    "Netease lyric resolver",
  );

  return extractLyricText(payload);
}

async function fetchJsonWithTimeout(
  url: URL,
  init: RequestInit,
  label: string,
) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    QING_MUSIC_RESOLVE_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`${label} failed with ${response.status}.`);
    }

    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeExternalPlaylistInput(value: string) {
  return value.trim().replace(/[，。,\s]+$/u, "").trim();
}

function normalizeExternalHttpUrl(value: string) {
  let normalized = value.trim();

  if (!normalized) return "";
  if (normalized.startsWith("//")) normalized = `https:${normalized}`;
  if (normalized.startsWith("http://")) {
    normalized = normalized.replace(/^http:\/\//i, "https://");
  }

  try {
    const url = new URL(normalized);

    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

function isQqMusicHost(hostname: string) {
  const normalized = hostname.toLowerCase();

  return normalized === "y.qq.com" || normalized.endsWith(".y.qq.com");
}

function extractQqMusicPlaylistId(value: string) {
  const normalized = normalizeExternalPlaylistInput(value);

  if (/^\d{4,}$/.test(normalized)) return normalized;

  try {
    const url = new URL(normalized);

    if (!isQqMusicHost(url.hostname)) {
      throw new Error("unsupported host");
    }

    const queryId =
      url.searchParams.get("id") ?? url.searchParams.get("disstid") ?? "";
    const pathId =
      url.pathname.match(/\/playlist\/(\d+)/i)?.[1] ??
      url.pathname.match(/\/(\d+)(?:\.html)?$/i)?.[1] ??
      "";
    const playlistId = (queryId || pathId).trim();

    if (/^\d{4,}$/.test(playlistId)) return playlistId;
  } catch {
    // Fall through to the uniform BAD_REQUEST below.
  }

  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Please paste a valid QQ Music playlist URL or numeric playlist id.",
  });
}

function joinQqSingerNames(value: unknown) {
  if (!Array.isArray(value)) return "";

  return value
    .map((item) => {
      const record = asRecord(item);

      return record
        ? getRecordText(record, "name") || getRecordText(record, "title")
        : "";
    })
    .filter(Boolean)
    .join(" / ");
}

function trimMusicField(value: string, fallback: string, maxLength: number) {
  const trimmed = value.trim() || fallback;

  return trimmed.slice(0, maxLength);
}

function toQqMusicPlaylistItem(
  value: unknown,
  playlistCoverUrl: string,
): MusicLibraryItemInput | null {
  const record = asRecord(value);

  if (!record) return null;

  const sourceSongId =
    getRecordText(record, "mid") ||
    getRecordText(record, "songmid") ||
    getRecordValueText(record, "id");
  const title = getRecordText(record, "title") || getRecordText(record, "name");

  if (!sourceSongId || !title) return null;

  const album = getNestedRecord(record, "album");
  const albumName = album
    ? getRecordText(album, "name") || getRecordText(album, "title")
    : "";
  const albumMid = album
    ? (getRecordText(album, "mid") || getRecordText(album, "pmid")).replace(
        /_\d+$/,
        "",
      )
    : "";
  const coverUrl = albumMid
    ? `https://y.qq.com/music/photo_new/T002R300x300M000${albumMid}.jpg?max_age=2592000`
    : playlistCoverUrl;

  return {
    album: trimMusicField(albumName, "", 180),
    artist: trimMusicField(
      joinQqSingerNames(record.singer),
      "Unknown Artist",
      180,
    ),
    audioUrl: "",
    coverUrl: normalizeExternalHttpUrl(coverUrl),
    itemKey: `candidate:tx:${sourceSongId}`,
    itemKind: "candidate",
    lyric: "",
    provider: "tx",
    quality: "320k",
    sourceSongId: trimMusicField(sourceSongId, "", 180),
    title: trimMusicField(title, "Untitled", 180),
  };
}

async function fetchQqMusicPlaylist(input: {
  limit: number;
  playlistId: string;
}) {
  const url = new URL("https://c.y.qq.com/v8/fcg-bin/fcg_v8_playlist_cp.fcg");

  url.searchParams.set("id", input.playlistId);
  url.searchParams.set("format", "json");
  url.searchParams.set("newsong", "1");
  url.searchParams.set("platform", "jqspaframe.json");

  const payload = await fetchJsonWithTimeout(
    url,
    {
      headers: {
        accept: "application/json,text/plain,*/*",
        origin: "https://y.qq.com",
        referer: `https://y.qq.com/n/yqq/playlist/${input.playlistId}.html`,
        "user-agent": QING_MUSIC_RESOLVE_USER_AGENT,
      },
    },
    "QQ Music playlist import",
  );
  const root = asRecord(payload);
  const code = root ? getRecordNumber(root, "code") : -1;
  const data = root ? getNestedRecord(root, "data") : null;
  const cdlist = data && Array.isArray(data.cdlist) ? data.cdlist : [];
  const playlist = asRecord(cdlist[0]);

  if (!root || code !== 0 || !playlist) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "QQ Music playlist could not be read or is private.",
    });
  }

  const playlistCoverUrl = normalizeExternalHttpUrl(
    getRecordText(playlist, "logo") ||
      getRecordText(playlist, "dir_pic_url2") ||
      getRecordText(playlist, "ifpicurl"),
  );
  const rawItems = Array.isArray(playlist.songlist) ? playlist.songlist : [];
  const items = rawItems
    .map((item) => toQqMusicPlaylistItem(item, playlistCoverUrl))
    .filter((item): item is MusicLibraryItemInput => Boolean(item))
    .slice(0, input.limit);

  return {
    coverUrl: playlistCoverUrl,
    description: getRecordText(playlist, "desc"),
    items,
    name: trimMusicField(
      getRecordText(playlist, "dissname"),
      `QQ Music Playlist ${input.playlistId}`,
      80,
    ),
    sourcePlaylistId: input.playlistId,
    totalCount:
      getRecordNumber(playlist, "songnum") ||
      getRecordNumber(playlist, "cur_song_num") ||
      rawItems.length,
  };
}

function toQingMusicResolveLevel(quality: z.infer<typeof qualitySchema>) {
  if (quality === "flac") return "lossless";
  if (quality === "128k") return "standard";

  return "exhigh";
}

function toKuwoBitrate(quality: z.infer<typeof qualitySchema>) {
  if (quality === "flac") return "2000kflac";
  if (quality === "128k") return "128kmp3";

  return "320kmp3";
}

function hasBuiltInProviderResolver(provider: z.infer<typeof sourceProviderSchema>) {
  return provider === "kw" || provider === "kg" || provider === "wy";
}

function hasBuiltInProviderLyricResolver(
  provider: z.infer<typeof sourceProviderSchema>,
) {
  return provider === "kw" || provider === "kg" || provider === "wy";
}

async function resolveKuwoBuiltInAudio(input: {
  quality: z.infer<typeof qualitySchema>;
  songId: string;
}) {
  const url = new URL("http://mobi.kuwo.cn/mobi.s");

  url.searchParams.set("f", "web");
  url.searchParams.set("user", "0");
  url.searchParams.set("source", "kwplayercar_ar_6.0.0.9_B_jiakong_vh.apk");
  url.searchParams.set("type", "convert_url_with_sign");
  url.searchParams.set("br", toKuwoBitrate(input.quality));
  url.searchParams.set("sig", "0");
  url.searchParams.set("rid", input.songId);

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Kuwo built-in resolver failed with ${response.status}.`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();
  const trimmedText = text.trim();
  const payload =
    contentType.includes("application/json") || trimmedText.startsWith("{")
      ? JSON.parse(trimmedText)
      : trimmedText;
  const audioUrl = normalizePlaybackAudioUrl(extractAudioUrl(payload));

  if (!audioUrl) {
    throw new Error("Kuwo built-in resolver did not return an audio URL.");
  }

  return {
    audioUrl,
    sourceFileName: "kuwo-mobi-built-in",
    warnings: ["Used built-in Kuwo car/mobile URL resolver."],
  };
}

async function resolveKugouBuiltInAudio(input: {
  quality: z.infer<typeof qualitySchema>;
  songId: string;
}) {
  const url = new URL("https://music.haitangw.cc/kgqq1/kg.php");

  url.searchParams.set("id", input.songId);
  url.searchParams.set("type", "json");
  url.searchParams.set("level", toQingMusicResolveLevel(input.quality));

  const payload = await fetchJsonWithTimeout(
    url,
    {
      headers: {
        accept: "application/json,text/plain,*/*",
        referer: "https://www.kugou.com/",
        "user-agent": QING_MUSIC_RESOLVE_USER_AGENT,
      },
    },
    "Kugou built-in resolver",
  );
  const audioUrl = normalizePlaybackAudioUrl(extractAudioUrl(payload));

  if (!audioUrl) {
    throw new Error("Kugou built-in resolver did not return an audio URL.");
  }

  return {
    audioUrl,
    sourceFileName: "qingmusic-kugou-built-in",
    warnings: ["Used QingMusic-compatible built-in Kugou resolver."],
  };
}

async function resolveNeteaseBuiltInAudio(input: {
  quality: z.infer<typeof qualitySchema>;
  songId: string;
}) {
  const url = new URL("https://music.163.com/api/song/enhance/player/url/v1");
  const numericSongId = Number(input.songId);
  const songId =
    Number.isFinite(numericSongId) && numericSongId > 0
      ? numericSongId
      : input.songId;

  url.searchParams.set("ids", JSON.stringify([songId]));
  url.searchParams.set("level", toQingMusicResolveLevel(input.quality));
  url.searchParams.set("encodeType", "mp3");

  const payload = await fetchJsonWithTimeout(
    url,
    {
      headers: {
        accept: "application/json,text/plain,*/*",
        origin: "https://music.163.com",
        referer: "https://music.163.com/",
        "user-agent": QING_MUSIC_RESOLVE_USER_AGENT,
      },
      method: "POST",
    },
    "Netease built-in resolver",
  );
  const audioUrl = normalizePlaybackAudioUrl(extractAudioUrl(payload));

  if (!audioUrl) {
    throw new Error("Netease built-in resolver did not return an audio URL.");
  }

  return {
    audioUrl,
    sourceFileName: "netease-player-url-built-in",
    warnings: ["Used built-in Netease player URL resolver."],
  };
}

async function resolveBuiltInProviderAudio(input: {
  provider: z.infer<typeof sourceProviderSchema>;
  quality: z.infer<typeof qualitySchema>;
  songId: string;
}) {
  const songId = input.songId.trim();

  if (!songId) return null;

  const result =
    input.provider === "kw"
      ? await resolveKuwoBuiltInAudio({ quality: input.quality, songId })
      : input.provider === "kg"
        ? await resolveKugouBuiltInAudio({ quality: input.quality, songId })
        : input.provider === "wy"
          ? await resolveNeteaseBuiltInAudio({ quality: input.quality, songId })
          : null;

  if (!result) return null;

  return {
    audioUrl: result.audioUrl,
    provider: input.provider,
    quality: input.quality,
    sourceFileName: result.sourceFileName,
    warnings: result.warnings,
  };
}

async function resolveBuiltInProviderLyric(input: {
  provider: z.infer<typeof sourceProviderSchema>;
  songId: string;
}) {
  const songId = input.songId.trim();

  if (!songId || !hasBuiltInProviderLyricResolver(input.provider)) return null;

  const lyric =
    input.provider === "kw"
      ? await resolveKuwoBuiltInLyric(songId)
      : input.provider === "kg"
        ? await resolveKugouBuiltInLyric(songId)
        : await resolveNeteaseBuiltInLyric(songId);

  if (!lyric.trim()) return null;

  return {
    lyric,
    source: input.provider,
  };
}

function makeBuiltInProviderResolveErrorMessage(input: {
  lastErrorMessage?: string;
  provider: z.infer<typeof sourceProviderSchema>;
}) {
  if (hasBuiltInProviderResolver(input.provider)) {
    return input.lastErrorMessage
      ? `QingMusic online resolver failed for ${input.provider}: ${input.lastErrorMessage}`
      : `QingMusic online resolver failed for ${input.provider}; try another provider or retry later.`;
  }

  return `Cloudflare production does not include a built-in online resolver for ${input.provider}; use an R2-cached track or switch to kw/kg/wy.`;
}

async function resolveBuiltInLyricWithFallback(input: {
  candidate?: MusicSearchCandidate;
  definitions: MusicPluginDefinition[];
  provider: z.infer<typeof sourceProviderSchema>;
  songId: string;
}) {
  const directLyric = await resolveBuiltInProviderLyric({
    provider: input.provider,
    songId: input.songId,
  }).catch(() => null);

  if (directLyric?.lyric.trim()) return directLyric;

  const keyword = [input.candidate?.title, input.candidate?.artist]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!keyword) return null;

  const fallbackProviders = (["kw", "wy", "kg"] as const).filter(
    (provider) => provider !== input.provider,
  );
  const candidates = await searchMusicPlugins({
    definitions: input.definitions,
    keyword,
    limit: 12,
    providers: fallbackProviders,
  }).catch(() => []);

  for (const provider of fallbackProviders) {
    const candidate = candidates.find((item) => item.source === provider);

    if (!candidate) continue;

    const lyric = await resolveBuiltInProviderLyric({
      provider,
      songId: candidate.id,
    }).catch(() => null);

    if (lyric?.lyric.trim()) return lyric;
  }

  return null;
}

async function getConfiguredSearchDefinitions(ctx: { db: typeof import("@/db").db }) {
  if (!hasDatabase) return defaultMusicPluginDefinitions;

  const rows = await ctx.db
    .select()
    .from(musicSearchSources)
    .orderBy(asc(musicSearchSources.sortOrder), asc(musicSearchSources.provider))
    .catch(() => []);

  if (rows.length === 0) return defaultMusicPluginDefinitions;

  return rows
    .filter((source) => source.enabled)
    .map((source) => ({
      name: source.name,
      provider: assertMusicPluginProvider(source.provider),
      url: source.url,
      version: source.version,
    })) satisfies MusicPluginDefinition[];
}

function filterSearchDefinitions(
  definitions: MusicPluginDefinition[],
  providers?: MusicPluginProvider[],
) {
  if (!providers || providers.length === 0) return definitions;

  const providerSet = new Set(providers);
  return definitions.filter((definition) => providerSet.has(definition.provider));
}

async function resolveDownloadAudio(
  ctx: { db: typeof import("@/db").db },
  input: z.infer<typeof musicDownloadInput>,
) {
  if (input.audioUrl.trim() && input.provider === "manual") {
    return {
      audioUrl: input.audioUrl.trim(),
      lyric: input.lyric,
      warnings: [] as string[],
    };
  }

  const pluginProvider = pluginProviderSchema.safeParse(input.provider);

  if (pluginProvider.success) {
    const configuredErrorMessages: string[] = [];
    const sourceProvider = sourceProviderSchema.safeParse(pluginProvider.data);
    let builtInProviderErrorMessage = "";

    if (sourceProvider.success && input.sourceSongId.trim()) {
      const configuredResult = await resolveWithConfiguredSource(ctx, {
        provider: sourceProvider.data,
        quality: input.quality,
        songId: input.sourceSongId,
      }).catch((error: unknown) => {
        configuredErrorMessages.push(
          error instanceof Error
            ? error.message
            : "Configured music source resolve failed.",
        );
        return null;
      });

      if (configuredResult?.audioUrl) {
        return {
          audioUrl: configuredResult.audioUrl,
          lyric: input.lyric,
          warnings: configuredResult.warnings,
        };
      }
    }

    if (sourceProvider.success && input.sourceSongId.trim()) {
      const builtInResult = await resolveBuiltInProviderAudio({
        provider: sourceProvider.data,
        quality: input.quality,
        songId: input.sourceSongId,
      }).catch((error: unknown) => {
        builtInProviderErrorMessage = toErrorMessage(error);
        configuredErrorMessages.push(
          `Built-in provider resolver failed: ${builtInProviderErrorMessage}`,
        );
        return null;
      });

      if (builtInResult?.audioUrl) {
        return {
          audioUrl: builtInResult.audioUrl,
          lyric: input.lyric,
          warnings: builtInResult.warnings,
        };
      }

      if (!input.audioUrl.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: makeBuiltInProviderResolveErrorMessage({
            lastErrorMessage: builtInProviderErrorMessage,
            provider: sourceProvider.data,
          }),
        });
      }
    }

    const searchDefinitions = await getConfiguredSearchDefinitions(ctx);
    const candidate =
      input.candidate ??
      makeFallbackCandidate({
        album: input.album,
        artist: input.artist,
        coverUrl: input.coverUrl,
        provider: pluginProvider.data,
        songId: input.sourceSongId,
        title: input.title,
      });
    const resolved = await resolveMusicPluginWithFallback({
      candidate,
      definitions: searchDefinitions,
      provider: pluginProvider.data,
      quality: input.quality,
      songId: input.sourceSongId,
    }).catch((error: unknown) => {
      if (!input.audioUrl.trim()) {
        const pluginMessage = toErrorMessage(error);
        const configuredMessage = configuredErrorMessages.at(-1);

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: configuredMessage
            ? `Download audio resolve failed: configured source failed (${configuredMessage}); remote source failed (${pluginMessage}).`
            : `Download audio resolve failed: ${pluginMessage}`,
        });
      }

      return {
        audioUrl: input.audioUrl.trim(),
        lyric: input.lyric,
        source: pluginProvider.data,
        title: input.title,
        warnings: [
          "服务端插件解析已禁用，已使用记录中的音频 URL。",
        ],
      } satisfies MusicPluginResolveResult;
    });

    return {
      audioUrl: resolved.audioUrl,
      lyric: resolved.lyric ?? input.lyric,
      warnings: [
        ...configuredErrorMessages.map(
          (message) => `Configured music source failed; used remote source: ${message}`,
        ),
        ...resolved.warnings,
      ],
    };
  }

  const platformProvider = providerSchema.parse(toProviderSchemaValue(input.provider));

  if (platformProvider === "manual") {
    if (!input.audioUrl.trim()) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "这首歌没有可下载的音频地址。",
      });
    }

    return {
      audioUrl: input.audioUrl.trim(),
      lyric: input.lyric,
      warnings: [] as string[],
    };
  }

  const configuredResult = await resolveWithConfiguredSource(ctx, {
    provider: platformProvider,
    quality: input.quality,
    songId: input.sourceSongId,
  }).catch(() => null);

  if (configuredResult?.audioUrl) {
    return {
      audioUrl: configuredResult.audioUrl,
      lyric: input.lyric,
      warnings: configuredResult.warnings,
    };
  }

  if (input.audioUrl.trim()) {
    return {
      audioUrl: input.audioUrl.trim(),
      lyric: input.lyric,
      warnings: ["音源解析兜底未返回地址，已使用记录中的音频 URL。"],
    };
  }

  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "下载解析失败：没有可用音频地址。",
  });
}

export const musicRouter = createTRPCRouter({
  plugins: studioProcedure.query(() => getMusicPluginDefinitions()),

  favorites: studioProcedure.query(async ({ ctx }) => {
    if (!hasDatabase) return [];

    const rows = await ctx.db
      .select()
      .from(musicFavorites)
      .where(eq(musicFavorites.createdBy, ctx.session.user.id))
      .orderBy(desc(musicFavorites.createdAt))
      .catch(() => []);

    return rows.map(toPublicFavorite);
  }),

  toggleFavorite: studioProcedure
    .input(musicLibraryItemInput)
    .mutation(async ({ ctx, input }) => {
      assertDatabase();

      const [existing] = await ctx.db
        .select({ id: musicFavorites.id })
        .from(musicFavorites)
        .where(
          and(
            eq(musicFavorites.createdBy, ctx.session.user.id),
            eq(musicFavorites.itemKey, input.itemKey),
          ),
        )
        .limit(1);

      if (existing) {
        await ctx.db
          .delete(musicFavorites)
          .where(eq(musicFavorites.id, existing.id));

        return {
          favorite: null,
          itemKey: input.itemKey,
          liked: false,
        };
      }

      const [created] = await ctx.db
        .insert(musicFavorites)
        .values(musicLibraryItemValues(input, ctx.session.user.id))
        .returning();

      return {
        favorite: toPublicFavorite(created),
        itemKey: input.itemKey,
        liked: true,
      };
    }),

  playlists: studioProcedure.query(async ({ ctx }) => {
    if (!hasDatabase) return [];

    const playlists = await ctx.db
      .select()
      .from(musicPlaylists)
      .where(eq(musicPlaylists.createdBy, ctx.session.user.id))
      .orderBy(asc(musicPlaylists.sortOrder), desc(musicPlaylists.updatedAt))
      .catch(() => []);

    if (playlists.length === 0) return [];

    const items = await ctx.db
      .select()
      .from(musicPlaylistItems)
      .where(
        inArray(
          musicPlaylistItems.playlistId,
          playlists.map((playlist) => playlist.id),
        ),
      )
      .orderBy(
        asc(musicPlaylistItems.sortOrder),
        desc(musicPlaylistItems.createdAt),
      )
      .catch(() => []);

    return playlists.map((playlist) =>
      toPublicPlaylist(
        playlist,
        items.filter((item) => item.playlistId === playlist.id),
      ),
    );
  }),

  createPlaylist: studioProcedure
    .input(
      z.object({
        coverUrl: z.string().url().or(z.literal("")).default(""),
        description: z.string().max(500).default(""),
        name: z.string().min(1).max(80),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDatabase();

      const [created] = await ctx.db
        .insert(musicPlaylists)
        .values({
          coverUrl: input.coverUrl.trim(),
          createdBy: ctx.session.user.id,
          description: input.description.trim(),
          name: input.name.trim(),
        })
        .returning();

      return toPublicPlaylist(created, []);
    }),

  importExternalPlaylist: studioProcedure
    .input(
      z.object({
        limit: z
          .number()
          .int()
          .min(1)
          .max(QQ_MUSIC_PLAYLIST_IMPORT_LIMIT)
          .default(QQ_MUSIC_PLAYLIST_IMPORT_LIMIT),
        url: z.string().min(1).max(1200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDatabase();

      const sourcePlaylistId = extractQqMusicPlaylistId(input.url);
      const importedPlaylist = await fetchQqMusicPlaylist({
        limit: input.limit,
        playlistId: sourcePlaylistId,
      });
      const uniqueItems = Array.from(
        new Map(
          importedPlaylist.items.map((item) => [item.itemKey, item]),
        ).values(),
      );
      const [createdPlaylist] = await ctx.db
        .insert(musicPlaylists)
        .values({
          coverUrl:
            importedPlaylist.coverUrl || uniqueItems[0]?.coverUrl || "",
          createdBy: ctx.session.user.id,
          description: trimMusicField(
            [
              `Imported from QQ Music playlist ${sourcePlaylistId}.`,
              importedPlaylist.description,
            ]
              .filter(Boolean)
              .join(" "),
            "",
            500,
          ),
          name: importedPlaylist.name,
        })
        .returning();

      if (uniqueItems.length > 0) {
        const values = uniqueItems.map((item, index) =>
          musicPlaylistItemValues(createdPlaylist.id, item, index),
        );

        await ctx.db
          .insert(musicPlaylistItems)
          .values(values)
          .onConflictDoUpdate({
            target: [
              musicPlaylistItems.playlistId,
              musicPlaylistItems.itemKey,
            ],
            set: {
              album: sql`excluded.album`,
              artist: sql`excluded.artist`,
              audioUrl: sql`excluded.audio_url`,
              coverUrl: sql`excluded.cover_url`,
              itemKind: sql`excluded.item_kind`,
              lyric: sql`excluded.lyric`,
              provider: sql`excluded.provider`,
              quality: sql`excluded.quality`,
              sortOrder: sql`excluded.sort_order`,
              sourceSongId: sql`excluded.source_song_id`,
              title: sql`excluded.title`,
              trackId: sql`excluded.track_id`,
            },
          });
      }

      const items = await ctx.db
        .select()
        .from(musicPlaylistItems)
        .where(eq(musicPlaylistItems.playlistId, createdPlaylist.id))
        .orderBy(
          asc(musicPlaylistItems.sortOrder),
          desc(musicPlaylistItems.createdAt),
        );
      const [playlist] = await ctx.db
        .select()
        .from(musicPlaylists)
        .where(eq(musicPlaylists.id, createdPlaylist.id))
        .limit(1);

      return {
        importedCount: items.length,
        playlist: toPublicPlaylist(playlist ?? createdPlaylist, items),
        provider: "tx" as const,
        skippedCount: Math.max(0, importedPlaylist.totalCount - items.length),
        sourcePlaylistId,
        totalCount: importedPlaylist.totalCount,
      };
    }),

  updatePlaylist: studioProcedure
    .input(
      z.object({
        coverUrl: z.string().max(1000).optional(),
        description: z.string().max(500).optional(),
        id: z.string().min(1),
        name: z.string().min(1).max(80).optional(),
        sortOrder: z.number().int().min(0).max(9999).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDatabase();

      const [playlist] = await ctx.db
        .select()
        .from(musicPlaylists)
        .where(eq(musicPlaylists.id, input.id))
        .limit(1);

      if (!playlist || playlist.createdBy !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Playlist was not found.",
        });
      }

      const name =
        input.name === undefined ? playlist.name : input.name.trim();

      if (!name) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Playlist name cannot be empty.",
        });
      }

      const [updated] = await ctx.db
        .update(musicPlaylists)
        .set({
          coverUrl:
            input.coverUrl === undefined
              ? playlist.coverUrl
              : input.coverUrl.trim(),
          description:
            input.description === undefined
              ? playlist.description
              : input.description.trim(),
          name,
          sortOrder:
            input.sortOrder === undefined
              ? playlist.sortOrder
              : input.sortOrder,
          updatedAt: new Date(),
        })
        .where(eq(musicPlaylists.id, input.id))
        .returning();

      const items = await ctx.db
        .select()
        .from(musicPlaylistItems)
        .where(eq(musicPlaylistItems.playlistId, input.id))
        .orderBy(
          asc(musicPlaylistItems.sortOrder),
          desc(musicPlaylistItems.createdAt),
        );

      return toPublicPlaylist(updated, items);
    }),

  deletePlaylist: studioProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      assertDatabase();

      const [playlist] = await ctx.db
        .select()
        .from(musicPlaylists)
        .where(eq(musicPlaylists.id, input.id))
        .limit(1);

      if (!playlist || playlist.createdBy !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Playlist was not found.",
        });
      }

      await ctx.db.delete(musicPlaylists).where(eq(musicPlaylists.id, input.id));

      return { deleted: true, id: input.id };
    }),

  addPlaylistItem: studioProcedure
    .input(
      z.object({
        item: musicLibraryItemInput,
        playlistId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDatabase();

      const [playlist] = await ctx.db
        .select()
        .from(musicPlaylists)
        .where(eq(musicPlaylists.id, input.playlistId))
        .limit(1);

      if (!playlist || playlist.createdBy !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Playlist was not found.",
        });
      }

      const [{ count }] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(musicPlaylistItems)
        .where(eq(musicPlaylistItems.playlistId, input.playlistId));
      const values = musicPlaylistItemValues(input.playlistId, input.item, count);
      const [created] = await ctx.db
        .insert(musicPlaylistItems)
        .values(values)
        .onConflictDoUpdate({
          target: [
            musicPlaylistItems.playlistId,
            musicPlaylistItems.itemKey,
          ],
          set: {
            album: values.album,
            artist: values.artist,
            audioUrl: values.audioUrl,
            coverUrl: values.coverUrl,
            itemKind: values.itemKind,
            lyric: values.lyric,
            provider: values.provider,
            quality: values.quality,
            sourceSongId: values.sourceSongId,
            title: values.title,
            trackId: values.trackId,
          },
        })
        .returning();

      await ctx.db
        .update(musicPlaylists)
        .set({
          coverUrl: playlist.coverUrl || values.coverUrl,
          updatedAt: new Date(),
        })
        .where(eq(musicPlaylists.id, input.playlistId));

      return toPublicPlaylistItem(created);
    }),

  removePlaylistItem: studioProcedure
    .input(
      z.object({
        id: z.string().min(1),
        playlistId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDatabase();

      const [playlist] = await ctx.db
        .select()
        .from(musicPlaylists)
        .where(eq(musicPlaylists.id, input.playlistId))
        .limit(1);

      if (!playlist || playlist.createdBy !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Playlist was not found.",
        });
      }

      await ctx.db
        .delete(musicPlaylistItems)
        .where(eq(musicPlaylistItems.id, input.id));

      await ctx.db
        .update(musicPlaylists)
        .set({ updatedAt: new Date() })
        .where(eq(musicPlaylists.id, input.playlistId));

      return { deleted: true, id: input.id };
    }),

  reorderPlaylistItems: studioProcedure
    .input(
      z.object({
        itemIds: z.array(z.string().min(1)).min(1).max(200),
        playlistId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDatabase();

      const [playlist] = await ctx.db
        .select()
        .from(musicPlaylists)
        .where(eq(musicPlaylists.id, input.playlistId))
        .limit(1);

      if (!playlist || playlist.createdBy !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Playlist was not found.",
        });
      }

      const items = await ctx.db
        .select({ id: musicPlaylistItems.id })
        .from(musicPlaylistItems)
        .where(eq(musicPlaylistItems.playlistId, input.playlistId));
      const ownedItemIds = new Set(items.map((item) => item.id));
      const inputItemIds = new Set(input.itemIds);

      if (
        inputItemIds.size !== input.itemIds.length ||
        input.itemIds.length !== items.length ||
        input.itemIds.some((itemId) => !ownedItemIds.has(itemId))
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Playlist order contains an unknown item.",
        });
      }

      await Promise.all(
        input.itemIds.map((itemId, index) =>
          ctx.db
            .update(musicPlaylistItems)
            .set({ sortOrder: index })
            .where(
              and(
                eq(musicPlaylistItems.id, itemId),
                eq(musicPlaylistItems.playlistId, input.playlistId),
              ),
            ),
        ),
      );

      await ctx.db
        .update(musicPlaylists)
        .set({ updatedAt: new Date() })
        .where(eq(musicPlaylists.id, input.playlistId));

      return { playlistId: input.playlistId, reordered: true };
    }),

  playHistory: studioProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(80).default(40),
        })
        .default({ limit: 40 }),
    )
    .query(async ({ ctx, input }) => {
      if (!hasDatabase) return [];

      const rows = await ctx.db
        .select()
        .from(musicPlayHistory)
        .where(eq(musicPlayHistory.createdBy, ctx.session.user.id))
        .orderBy(desc(musicPlayHistory.playedAt))
        .limit(input.limit)
        .catch(() => []);

      return rows.map(toPublicPlayHistory);
    }),

  downloads: studioProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(80).default(40),
        })
        .default({ limit: 40 }),
    )
    .query(async ({ ctx, input }) => {
      if (!hasDatabase) return [];

      const rows = await ctx.db
        .select()
        .from(musicDownloads)
        .where(eq(musicDownloads.createdBy, ctx.session.user.id))
        .orderBy(desc(musicDownloads.downloadedAt))
        .limit(input.limit)
        .catch(() => []);

      return Promise.all(rows.map(toPublicDownloadWithStorage));
    }),

  recordPlay: studioProcedure
    .input(musicLibraryItemInput)
    .mutation(async ({ ctx, input }) => {
      assertDatabase();

      const [created] = await ctx.db
        .insert(musicPlayHistory)
        .values(musicLibraryItemValues(input, ctx.session.user.id))
        .onConflictDoUpdate({
          target: [musicPlayHistory.createdBy, musicPlayHistory.itemKey],
          set: {
            album: input.album.trim(),
            artist: input.artist.trim() || "Unknown Artist",
            audioUrl: input.audioUrl.trim(),
            coverUrl: input.coverUrl.trim(),
            itemKind: input.itemKind,
            lyric: input.lyric,
            playedAt: new Date(),
            provider: input.provider,
            quality: input.quality,
            sourceSongId: input.sourceSongId.trim(),
            title: input.title.trim(),
            trackId: input.trackId?.trim() || null,
          },
        })
        .returning();

      return toPublicPlayHistory(created);
    }),

  prepareDownload: studioProcedure
    .input(musicDownloadInput)
    .mutation(async ({ ctx, input }) => {
      assertDatabase();

      const [existingDownload] = await ctx.db
        .select()
        .from(musicDownloads)
        .where(
          and(
            eq(musicDownloads.createdBy, ctx.session.user.id),
            eq(musicDownloads.itemKey, input.itemKey),
          ),
        )
        .limit(1);
      const audioResult = await resolveDownloadAudio(ctx, input);
      const coverResult = await cacheCoverToR2({
        coverUrl: input.coverUrl,
        itemKey: input.itemKey,
        title: input.title,
      });
      const audioCacheResult = await cacheAudioToR2({
        audioUrl: audioResult.audioUrl,
        itemKey: input.itemKey,
        title: input.title,
      });
      const nextAudioUrl =
        audioCacheResult.audioObjectKey || !existingDownload
          ? audioCacheResult.audioUrl
          : existingDownload.audioUrl || audioCacheResult.audioUrl;
      const nextAudioObjectKey =
        audioCacheResult.audioObjectKey ||
        existingDownload?.audioObjectKey ||
        "";
      const nextCoverUrl =
        coverResult.coverObjectKey || !existingDownload
          ? coverResult.coverUrl
          : existingDownload.coverUrl || coverResult.coverUrl;
      const nextCoverObjectKey =
        coverResult.coverObjectKey || existingDownload?.coverObjectKey || "";
      const baseValues = musicLibraryItemValues(
        {
          ...input,
          audioUrl: nextAudioUrl,
          coverUrl: nextCoverUrl,
          lyric: audioResult.lyric,
        },
        ctx.session.user.id,
      );
      const [created] = await ctx.db
        .insert(musicDownloads)
        .values({
          ...baseValues,
          audioObjectKey: nextAudioObjectKey,
          coverObjectKey: nextCoverObjectKey,
        })
        .onConflictDoUpdate({
          target: [musicDownloads.createdBy, musicDownloads.itemKey],
          set: {
            album: baseValues.album,
            artist: baseValues.artist,
            audioObjectKey: nextAudioObjectKey,
            audioUrl: nextAudioUrl,
            coverObjectKey: nextCoverObjectKey,
            coverUrl: nextCoverUrl,
            downloadedAt: new Date(),
            itemKind: baseValues.itemKind,
            lyric: baseValues.lyric,
            provider: baseValues.provider,
            quality: baseValues.quality,
            sourceSongId: baseValues.sourceSongId,
            title: baseValues.title,
            trackId: baseValues.trackId,
          },
        })
        .returning();

      return {
        download: await toPublicDownloadWithStorage(created),
        warnings: [
          ...audioResult.warnings,
          ...coverResult.warnings,
          ...audioCacheResult.warnings,
        ],
      };
    }),

  deleteDownload: studioProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      assertDatabase();

      const [download] = await ctx.db
        .select()
        .from(musicDownloads)
        .where(eq(musicDownloads.id, input.id))
        .limit(1);

      if (!download || download.createdBy !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Download record was not found.",
        });
      }

      const deletedObjects = await Promise.all(
        [download.audioObjectKey, download.coverObjectKey]
          .map((objectKey) => objectKey.trim())
          .filter(Boolean)
          .map((objectKey) => deleteR2Object(objectKey)),
      );

      await ctx.db.delete(musicDownloads).where(eq(musicDownloads.id, input.id));

      return {
        deleted: true,
        deletedObjects: deletedObjects.filter((result) => result.deleted).length,
        id: input.id,
      };
    }),

  searchSources: studioProcedure.query(async ({ ctx }) => {
    if (!hasDatabase) {
      return defaultMusicPluginDefinitions.map((source, index) => ({
        id: source.provider,
        name: source.name,
        provider: source.provider,
        url: source.url,
        version: source.version,
        enabled: true,
        sortOrder: index,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
      }));
    }

    const rows = await ctx.db
      .select()
      .from(musicSearchSources)
      .orderBy(asc(musicSearchSources.sortOrder), asc(musicSearchSources.provider))
      .catch(() => []);

    return rows.map(toPublicSearchSource);
  }),

  qingMusicManifest: studioProcedure.query(async () => {
    try {
      return {
        ...(await fetchQingMusicManifest()),
        error: "",
      };
    } catch (error) {
      return {
        checkedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "QingMusic manifest failed.",
        lines: [],
        playableLevelCount: 0,
        recommendedProviderIds: [],
        searchableProviderIds: [],
        url: QING_MUSIC_MANIFEST_URL,
      };
    }
  }),

  importDefaultSearchSources: studioProcedure.mutation(async ({ ctx }) => {
    assertDatabase();

    const results = [];

    for (const [index, source] of defaultMusicPluginDefinitions.entries()) {
      const values = {
        name: source.name,
        provider: source.provider,
        url: source.url,
        version: source.version,
        enabled: true,
        sortOrder: index,
        createdBy: ctx.session.user.id,
      };
      const [existing] = await ctx.db
        .select({ id: musicSearchSources.id })
        .from(musicSearchSources)
        .where(eq(musicSearchSources.provider, source.provider))
        .limit(1);

      if (existing) {
        const [updated] = await ctx.db
          .update(musicSearchSources)
          .set(values)
          .where(eq(musicSearchSources.id, existing.id))
          .returning();

        results.push(toPublicSearchSource(updated));
      } else {
        const [created] = await ctx.db
          .insert(musicSearchSources)
          .values(values)
          .returning();

        results.push(toPublicSearchSource(created));
      }
    }

    return results;
  }),

  updateSearchSource: studioProcedure
    .input(
      z.object({
        enabled: z.boolean().optional(),
        id: z.string().min(1),
        name: z.string().min(1).max(80).optional(),
        sortOrder: z.number().int().min(0).max(9999).optional(),
        url: z.string().url().optional(),
        version: z.string().max(40).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDatabase();

      const values = {
        ...(typeof input.enabled === "boolean" ? { enabled: input.enabled } : {}),
        ...(typeof input.name === "string" ? { name: input.name.trim() } : {}),
        ...(typeof input.sortOrder === "number" ? { sortOrder: input.sortOrder } : {}),
        ...(typeof input.url === "string" ? { url: assertPluginUrl(input.url) } : {}),
        ...(typeof input.version === "string" ? { version: input.version.trim() } : {}),
      };

      const [updated] = await ctx.db
        .update(musicSearchSources)
        .set(values)
        .where(eq(musicSearchSources.id, input.id))
        .returning();

      return toPublicSearchSource(updated);
    }),

  testSearchSource: studioProcedure
    .input(
      z.object({
        id: z.string().min(1),
        keyword: z.string().min(1).max(120).default("晴天"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDatabase();

      const [source] = await ctx.db
        .select()
        .from(musicSearchSources)
        .where(eq(musicSearchSources.id, input.id))
        .limit(1);

      if (!source) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Search source was not found.",
        });
      }

      const definition = {
        name: source.name,
        provider: assertMusicPluginProvider(source.provider),
        url: assertPluginUrl(source.url),
        version: source.version,
      } satisfies MusicPluginDefinition;
      const startedAt = Date.now();
      const testedAt = new Date();

      try {
        const candidates = await searchMusicPlugins({
          definitions: [definition],
          keyword: input.keyword,
          limit: 8,
          providers: [definition.provider],
        });
        const [firstCandidate] = candidates;
        const resolveStartedAt = Date.now();
        const resolveResult = firstCandidate
          ? await resolveMusicPlugin({
              candidate: firstCandidate,
              definitions: [definition],
              provider: definition.provider,
              quality: "320k",
              songId: firstCandidate.id,
            })
              .then((result) => ({
                audioOk: Boolean(result.audioUrl),
                elapsedMs: Date.now() - resolveStartedAt,
                error: "",
                lyricOk: Boolean(result.lyric?.trim()),
                lyricSource: result.lyricSource ?? null,
                title: result.title ?? firstCandidate.title,
                warnings: result.warnings,
              }))
              .catch((error: unknown) => ({
                audioOk: false,
                elapsedMs: Date.now() - resolveStartedAt,
                error:
                  error instanceof Error
                    ? error.message
                    : "Unknown playback resolve error.",
                lyricOk: false,
                lyricSource: null,
                title: firstCandidate.title,
                warnings: [] as string[],
              }))
          : null;
        const elapsedMs = Date.now() - startedAt;
        const testOk = candidates.length > 0 && Boolean(resolveResult?.audioOk);
        const testError = resolveResult?.error ?? "";

        await ctx.db
          .update(musicSearchSources)
          .set({
            lastTestedAt: testedAt,
            lastTestKeyword: input.keyword,
            lastTestOk: testOk,
            lastTestSearchable: candidates.length > 0,
            lastTestPlayable: Boolean(resolveResult?.audioOk),
            lastTestLyric: Boolean(resolveResult?.lyricOk),
            lastTestResultCount: candidates.length,
            lastTestElapsedMs: elapsedMs,
            lastTestError: testError,
          })
          .where(eq(musicSearchSources.id, source.id));

        return {
          elapsedMs,
          enabled: source.enabled,
          error: testError,
          keyword: input.keyword,
          ok: testOk,
          provider: definition.provider,
          resolve: resolveResult,
          sample: candidates.slice(0, 3),
          sourceId: source.id,
          total: candidates.length,
        };
      } catch (error) {
        const elapsedMs = Date.now() - startedAt;
        const message =
          error instanceof Error
            ? error.message
            : "Unknown search source error.";

        await ctx.db
          .update(musicSearchSources)
          .set({
            lastTestedAt: testedAt,
            lastTestKeyword: input.keyword,
            lastTestOk: false,
            lastTestSearchable: false,
            lastTestPlayable: false,
            lastTestLyric: false,
            lastTestResultCount: 0,
            lastTestElapsedMs: elapsedMs,
            lastTestError: message,
          })
          .where(eq(musicSearchSources.id, source.id));

        return {
          elapsedMs,
          enabled: source.enabled,
          error: message,
          keyword: input.keyword,
          ok: false,
          provider: definition.provider,
          resolve: null,
          sample: [],
          sourceId: source.id,
          total: 0,
        };
      }
    }),

  sources: studioProcedure.query(async ({ ctx }) => {
    if (!hasDatabase) return [];

    const rows = await ctx.db
      .select()
      .from(musicSources)
      .orderBy(asc(musicSources.sortOrder), desc(musicSources.createdAt))
      .catch(() => []);

    return rows.map(toPublicSource);
  }),

  importChangqingSource: studioProcedure.mutation(async ({ ctx }) => {
    assertDatabase();

    const sourceCode = await readSafeSourceFile(CHANGQING_SOURCE_PATH);
    const values = {
      name: CHANGQING_SOURCE_NAME,
      kind: "lx",
      providerKeys: ["wy", "tx", "kg", "kw", "mg"],
      sourceCode,
      sourcePath: CHANGQING_SOURCE_PATH,
      version: "1.2.0",
      enabled: true,
      sortOrder: 0,
      createdBy: ctx.session.user.id,
    };
    const [existing] = await ctx.db
      .select({ id: musicSources.id })
      .from(musicSources)
      .where(eq(musicSources.name, values.name))
      .limit(1);

    if (existing) {
      const [updated] = await ctx.db
        .update(musicSources)
        .set(values)
        .where(eq(musicSources.id, existing.id))
        .returning();

      return toPublicSource(updated);
    }

    const [created] = await ctx.db.insert(musicSources).values(values).returning();

    return toPublicSource(created);
  }),

  checkChangqingSourceVersion: studioProcedure.query(async ({ ctx }) => {
    let manifest = {
      description: "",
      updateUrl: "",
      version: "",
    };
    let error = "";

    try {
      manifest = await fetchChangqingManifest();
    } catch (manifestError) {
      error =
        manifestError instanceof Error
          ? manifestError.message
          : "Changqing remote manifest is not reachable.";
    }

    const [source] = hasDatabase
      ? await ctx.db
          .select()
          .from(musicSources)
          .where(eq(musicSources.name, CHANGQING_SOURCE_NAME))
          .limit(1)
          .catch(() => [])
      : [];
    const localVersion = source?.version ?? "";
    const remoteVersion = manifest.version;

    return {
      checkedAt: new Date().toISOString(),
      description: manifest.description,
      localVersion,
      remoteVersion,
      sourceId: source?.id ?? "",
      updateAvailable:
        Boolean(localVersion && remoteVersion) &&
        compareVersions(localVersion, remoteVersion) > 0,
      updateUrl: manifest.updateUrl,
      error,
    };
  }),

  updateChangqingSource: studioProcedure
    .input(
      z.object({
        sourceCode: z.string().min(100).max(MAX_SOURCE_CODE_BYTES),
        version: z.string().min(1).max(40).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDatabase();

      const sourceCode = assertSafeSourceCode(input.sourceCode);
      const manifest = input.version ? null : await fetchChangqingManifest();
      const version = input.version?.trim() || manifest?.version || "manual";
      const values = {
        name: CHANGQING_SOURCE_NAME,
        kind: "lx",
        providerKeys: ["wy", "tx", "kg", "kw", "mg"],
        sourceCode,
        sourcePath: CHANGQING_MANIFEST_URL,
        version,
        enabled: true,
        sortOrder: 0,
        createdBy: ctx.session.user.id,
      };
      const [existing] = await ctx.db
        .select({ id: musicSources.id })
        .from(musicSources)
        .where(eq(musicSources.name, CHANGQING_SOURCE_NAME))
        .limit(1);

      if (existing) {
        const [updated] = await ctx.db
          .update(musicSources)
          .set(values)
          .where(eq(musicSources.id, existing.id))
          .returning();

        return toPublicSource(updated);
      }

      const [created] = await ctx.db.insert(musicSources).values(values).returning();

      return toPublicSource(created);
    }),

  updateSourceStatus: studioProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        id: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDatabase();

      const [updated] = await ctx.db
        .update(musicSources)
        .set({ enabled: input.enabled })
        .where(eq(musicSources.id, input.id))
        .returning();

      return toPublicSource(updated);
    }),

  playlist: publicProcedure
    .input(
      z
        .object({
          includeDisabled: z.boolean().default(false),
          limit: z.number().int().min(1).max(100).default(50),
        })
        .default({ includeDisabled: false, limit: 50 }),
    )
    .query(async ({ ctx, input }) => {
      if (!hasDatabase) {
        return seedTracks.filter((track) => input.includeDisabled || track.enabled);
      }

      const rows = await ctx.db
        .select()
        .from(musicTracks)
        .where(
          input.includeDisabled ? undefined : eq(musicTracks.enabled, true),
        )
        .orderBy(asc(musicTracks.sortOrder), desc(musicTracks.createdAt))
        .limit(input.limit);

      return rows.map(toPublicTrack);
    }),

  upsertTrack: studioProcedure.input(trackInput).mutation(async ({ ctx, input }) => {
    assertDatabase();

    const values = {
      title: input.title.trim(),
      artist: input.artist.trim(),
      album: input.album.trim(),
      coverUrl: input.coverUrl.trim(),
      audioUrl: input.audioUrl.trim(),
      lyric: input.lyric,
      provider: input.provider,
      sourceSongId: input.sourceSongId.trim(),
      quality: input.quality,
      sortOrder: input.sortOrder,
      enabled: input.enabled,
      createdBy: ctx.session.user.id,
    };

    if (input.id) {
      const [updated] = await ctx.db
        .update(musicTracks)
        .set(values)
        .where(eq(musicTracks.id, input.id))
        .returning({ id: musicTracks.id });

      return { id: updated.id };
    }

    const [created] = await ctx.db
      .insert(musicTracks)
      .values(values)
      .returning({ id: musicTracks.id });

    return { id: created.id };
  }),

  deleteTrack: studioProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      assertDatabase();

      await ctx.db.delete(musicTracks).where(eq(musicTracks.id, input.id));

      return { ok: true };
    }),

  sourceLab: studioProcedure
    .input(
      z.object({
        provider: sourceProviderSchema.default("wy"),
        quality: qualitySchema.default("320k"),
        songId: z.string().min(1).max(160).default("dry-run-id"),
        sourcePath: z.string().min(1).max(600),
      }),
    )
    .mutation(async ({ input }) =>
      runLxSourceDryRun({
        provider: input.provider,
        quality: input.quality,
        songId: input.songId,
        sourcePath: input.sourcePath,
      }),
    ),

  resolveTrack: studioProcedure
    .input(
      z.object({
        audioUrl: z.string().url().or(z.literal("")).default(""),
        album: z.string().max(160).default(""),
        artist: z.string().max(160).default(""),
        coverUrl: z.string().url().or(z.literal("")).default(""),
        provider: providerSchema.default("manual"),
        quality: qualitySchema.default("320k"),
        songId: z.string().max(160).default(""),
        sourcePath: z.string().max(600).default(""),
        title: z.string().max(160).default(""),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.provider === "manual") {
        if (!input.audioUrl) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Manual/R2 tracks require an audio URL.",
          });
        }

        return {
          audioUrl: input.audioUrl,
          provider: input.provider,
          quality: input.quality,
          sourceFileName: "manual",
          warnings: [],
        };
      }

      const songId = input.songId.trim();

      if (!songId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Platform playback requires a song id, hash, or mid.",
        });
      }

      const configuredResult = await resolveWithConfiguredSource(ctx, {
        provider: input.provider,
        quality: input.quality,
        songId,
      }).catch(() => null);

      if (configuredResult) return configuredResult;

      let builtInProviderErrorMessage = "";
      const builtInResult = await resolveBuiltInProviderAudio({
        provider: input.provider,
        quality: input.quality,
        songId,
      }).catch((error: unknown) => {
        builtInProviderErrorMessage = toErrorMessage(error);
        return null;
      });

      if (builtInResult) return builtInResult;

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: makeBuiltInProviderResolveErrorMessage({
          lastErrorMessage: builtInProviderErrorMessage,
          provider: input.provider,
        }),
      });
    }),

  pluginSearch: studioProcedure
    .input(
      z.object({
        keyword: z.string().min(1).max(120),
        limit: z.number().int().min(1).max(50).default(20),
        providers: z.array(pluginProviderSchema).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const searchDefinitions = filterSearchDefinitions(
        await getConfiguredSearchDefinitions(ctx),
        input.providers,
      );
      const requestedProviders =
        input.providers && input.providers.length > 0
          ? input.providers
          : searchDefinitions.map((definition) => definition.provider);

      return searchMusicPlugins({
        definitions: searchDefinitions,
        keyword: input.keyword,
        limit: input.limit,
        providers: requestedProviders,
      });
    }),

  resolvePluginTrack: studioProcedure
    .input(
      z.object({
        candidate: z
          .object({
            album: z.string().default(""),
            artist: z.string().default(""),
            artwork: z.string().default(""),
            duration: z.number().default(0),
            id: z.string().min(1),
            raw: z.record(z.string(), z.unknown()),
            source: pluginProviderSchema,
            title: z.string().min(1),
          })
          .optional(),
        provider: pluginProviderSchema,
        quality: qualitySchema.default("320k"),
        songId: z.string().max(160).default(""),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const searchDefinitions = await getConfiguredSearchDefinitions(ctx);
        const sourceProvider = sourceProviderSchema.safeParse(input.provider);
        const qingMusicEnabledProviders = await getEnabledQingMusicProviderIds().catch(
          () => new Set<QingMusicProviderId>(["kw", "kg", "wy", "tx"]),
        );
        const providerEnabled =
          searchDefinitions.some(
            (definition) => definition.provider === input.provider,
          ) ||
          (sourceProvider.success &&
            qingMusicEnabledProviders.has(sourceProvider.data));

        if (!providerEnabled) {
          throw new Error(input.provider + " search provider is disabled.");
        }

        if (!sourceProvider.success) {
          throw new Error(
            "Cloudflare production cannot execute " +
              input.provider +
              " server-side music plugins.",
          );
        }

        const songId = input.songId.trim();

        if (!songId) {
          throw new Error("QingMusic playback requires a song id, hash, or mid.");
        }

        const lyricPromise = resolveBuiltInLyricWithFallback({
          candidate: input.candidate,
          definitions: searchDefinitions,
          provider: sourceProvider.data,
          songId,
        }).catch(() => null);
        const buildLyricPayload = async () => {
          const lyricResult = await lyricPromise;

          return lyricResult
            ? {
                lyric: lyricResult.lyric,
                lyricSource: lyricResult.source,
              }
            : {};
        };
        const configuredResult = await resolveWithConfiguredSource(ctx, {
          provider: sourceProvider.data,
          quality: input.quality,
          songId,
        }).catch(() => null);

        if (configuredResult) {
          const lyricPayload = await buildLyricPayload();

          return {
            audioUrl: configuredResult.audioUrl,
            ...lyricPayload,
            source: input.provider,
            title: input.candidate?.title,
            warnings: [
              "Used configured source " + configuredResult.sourceFileName + ".",
              ...configuredResult.warnings,
            ],
          };
        }

        let builtInProviderErrorMessage = "";
        const builtInResult = await resolveBuiltInProviderAudio({
          provider: sourceProvider.data,
          quality: input.quality,
          songId,
        }).catch((error) => {
          builtInProviderErrorMessage = toErrorMessage(error);
          return null;
        });

        if (builtInResult) {
          const lyricPayload = await buildLyricPayload();

          return {
            audioUrl: builtInResult.audioUrl,
            ...lyricPayload,
            source: input.provider,
            title: input.candidate?.title,
            warnings: builtInResult.warnings,
          };
        }

        throw new Error(
          makeBuiltInProviderResolveErrorMessage({
            lastErrorMessage: builtInProviderErrorMessage,
            provider: sourceProvider.data,
          }),
        );
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "QingMusic online playback resolve failed; try another provider.",
        });
      }
    }),
});
