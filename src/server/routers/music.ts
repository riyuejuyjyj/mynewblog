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
  resolveMusicPluginLyricWithFallback,
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

function toPluginProvider(provider: z.infer<typeof providerSchema>) {
  return provider === "manual" ? null : (provider satisfies MusicPluginProvider);
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

async function resolveBuiltInProviderAudio(input: {
  provider: z.infer<typeof sourceProviderSchema>;
  quality: z.infer<typeof qualitySchema>;
  songId: string;
}) {
  const songId = input.songId.trim();

  if (input.provider !== "kw" || !songId) return null;

  const url = new URL("https://antiserver.kuwo.cn/anti.s");

  url.searchParams.set("type", "convert_url3");
  url.searchParams.set("rid", `MUSIC_${songId}`);
  url.searchParams.set("format", input.quality === "flac" ? "flac" : "mp3");
  url.searchParams.set("response", "url");

  const response = await fetch(url, {
    cache: "no-store",
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
  const audioUrl = extractAudioUrl(payload);

  if (!audioUrl) {
    throw new Error("Kuwo built-in resolver did not return an audio URL.");
  }

  return {
    audioUrl,
    provider: input.provider,
    quality: input.quality,
    sourceFileName: "kuwo-built-in",
    warnings: ["Used built-in Kuwo URL resolver."],
  };
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
        configuredErrorMessages.push(
          `Built-in provider resolver failed: ${toErrorMessage(error)}`,
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
            message: "本地/R2 歌曲需要音频 URL。",
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

      if (!input.songId.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "平台音源播放需要歌曲 ID / hash / mid。",
        });
      }

      const configuredErrorMessages: string[] = [];
      const configuredResult = await resolveWithConfiguredSource(ctx, {
        provider: input.provider,
        quality: input.quality,
        songId: input.songId,
      }).catch((error: unknown) => {
        configuredErrorMessages.push(
          error instanceof Error ? error.message : "PG 音源解析失败。",
        );
        return null;
      });

      if (configuredResult) return configuredResult;

      const builtInResult = await resolveBuiltInProviderAudio({
        provider: input.provider,
        quality: input.quality,
        songId: input.songId,
      }).catch((error: unknown) => {
        configuredErrorMessages.push(toErrorMessage(error));
        return null;
      });

      if (builtInResult) return builtInResult;

      const pluginProvider = toPluginProvider(input.provider);
      const searchDefinitions = await getConfiguredSearchDefinitions(ctx);

      if (
        pluginProvider &&
        searchDefinitions.some((definition) => definition.provider === pluginProvider)
      ) {
        const fallbackCandidate = makeFallbackCandidate({
          album: input.album,
          artist: input.artist,
          coverUrl: input.coverUrl,
          provider: pluginProvider,
          songId: input.songId,
          title: input.title,
        });
        const fallbackResult = await resolveMusicPluginWithFallback({
          candidate: fallbackCandidate,
          definitions: searchDefinitions,
          provider: pluginProvider,
          quality: input.quality,
          songId: input.songId,
        }).catch(() => null);

        if (fallbackResult) {
          return {
            audioUrl: fallbackResult.audioUrl,
            lyric: fallbackResult.lyric,
            lyricSource: fallbackResult.lyricSource,
            provider: input.provider,
            quality: input.quality,
            sourceFileName: pluginProvider,
            warnings: [
              ...configuredErrorMessages.map(
                (message) => `PG 音源失败，已切换远程搜索源：${message}`,
              ),
              ...fallbackResult.warnings,
            ],
          };
        }
      }

      if (!input.sourcePath.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            configuredErrorMessages.at(-1) ??
            "还没有可用的 PG/远程音源配置，请先导入长青源或启用远程搜索源。",
        });
      }

      return resolveLxSourceMusicUrl({
        provider: input.provider,
        quality: input.quality,
        songId: input.songId,
        sourcePath: input.sourcePath,
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
          () => new Set<QingMusicProviderId>(["kw"]),
        );
        const providerEnabled =
          searchDefinitions.some(
            (definition) => definition.provider === input.provider,
          ) ||
          (sourceProvider.success &&
            qingMusicEnabledProviders.has(sourceProvider.data));

        if (!providerEnabled) {
          throw new Error(`${input.provider} 搜索源已停用。`);
        }

        if (input.provider !== "bilibili" && input.songId.trim()) {
          const lyricPromise = resolveMusicPluginLyricWithFallback({
            ...input,
            definitions: searchDefinitions,
          }).catch(() => null);
          const configuredResult = await resolveWithConfiguredSource(ctx, {
            provider: input.provider,
            quality: input.quality,
            songId: input.songId,
          }).catch(() => null);

          if (configuredResult) {
            const lyricResult = await lyricPromise;

            return {
              audioUrl: configuredResult.audioUrl,
              ...(lyricResult
                ? {
                    lyric: lyricResult.lyric,
                    lyricSource: lyricResult.source,
                  }
                : {}),
              source: input.provider,
              title: input.candidate?.title,
              warnings: [
                `已使用 PG 音源 ${configuredResult.sourceFileName} 解析。`,
                ...configuredResult.warnings,
              ],
            };
          }

          const builtInResult = sourceProvider.success
            ? await resolveBuiltInProviderAudio({
                provider: sourceProvider.data,
                quality: input.quality,
                songId: input.songId,
              }).catch(() => null)
            : null;

          if (builtInResult) {
            const lyricResult = await lyricPromise;

            return {
              audioUrl: builtInResult.audioUrl,
              ...(lyricResult
                ? {
                    lyric: lyricResult.lyric,
                    lyricSource: lyricResult.source,
                  }
                : {}),
              source: input.provider,
              title: input.candidate?.title,
              warnings: builtInResult.warnings,
            };
          }
        }

        return await resolveMusicPluginWithFallback({
          ...input,
          definitions: searchDefinitions,
        });
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error ? error.message : "插件音源解析失败，请换一个来源试试。",
        });
      }
    }),
});
