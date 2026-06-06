import axios from "axios";
import * as cheerio from "cheerio";
import CryptoJS from "crypto-js";
import dayjs from "dayjs";
import he from "he";
import bigInt from "big-integer";
import qs from "qs";
import { Script, createContext } from "node:vm";

const PLUGIN_TIMEOUT_MS = 15_000;
const PLUGIN_EVAL_TIMEOUT_MS = 3_000;
const MAX_PLUGIN_BYTES = 768 * 1024;
const PLUGIN_OPERATION_TIMEOUT_MS = 12_000;

export type MusicPluginProvider = "wy" | "kw" | "kg" | "tx" | "mg" | "bilibili";

export type MusicPluginDefinition = {
  name: string;
  provider: MusicPluginProvider;
  url: string;
  version: string;
};

export type MusicSearchCandidate = {
  album: string;
  artist: string;
  artwork: string;
  duration: number;
  id: string;
  raw: Record<string, unknown>;
  source: MusicPluginProvider;
  title: string;
};

export type MusicPluginResolveInput = {
  candidate?: MusicSearchCandidate;
  definitions?: MusicPluginDefinition[];
  provider: MusicPluginProvider;
  quality?: "128k" | "320k" | "flac";
  songId?: string;
};

export type MusicPluginResolveResult = {
  audioUrl: string;
  lyric?: string;
  lyricSource?: MusicPluginProvider;
  source: MusicPluginProvider;
  title?: string;
  warnings: string[];
};

export type MusicPluginLyricResult = {
  lyric: string;
  source: MusicPluginProvider;
};

export const defaultMusicPluginProviders: MusicPluginProvider[] = [
  "kw",
  "kg",
  "wy",
  "tx",
  "mg",
  "bilibili",
];

export const defaultMusicPluginDefinitions: MusicPluginDefinition[] = [
  {
    name: "网易",
    provider: "wy",
    url: "https://13413.kstore.vip/yuanli/wy.js",
    version: "1.2.0",
  },
  {
    name: "酷我",
    provider: "kw",
    url: "https://13413.kstore.vip/yuanli/kw.js",
    version: "1.2.0",
  },
  {
    name: "酷狗",
    provider: "kg",
    url: "https://13413.kstore.vip/yuanli/kg.js",
    version: "1.2.0",
  },
  {
    name: "QQ",
    provider: "tx",
    url: "https://13413.kstore.vip/yuanli/qq.js",
    version: "1.2.0",
  },
  {
    name: "Bilibili",
    provider: "bilibili",
    url: "https://gitee.com/maotoumao/MusicFreePlugins/raw/v0.1/dist/bilibili/index.js",
    version: "0.1.0",
  },
  {
    name: "咪咕",
    provider: "mg",
    url: "https://13413.kstore.vip/yuanli/xiaomi.js",
    version: "1.2.0",
  },
];

type MusicFreePlugin = {
  getMediaSource?: (musicItem: Record<string, unknown>, quality?: string) => Promise<unknown>;
  getLyric?: (musicItem: Record<string, unknown>) => Promise<unknown>;
  getLyricInfo?: (musicItem: Record<string, unknown>) => Promise<unknown>;
  getMusicLyric?: (musicItem: Record<string, unknown>) => Promise<unknown>;
  getMediaLyric?: (musicItem: Record<string, unknown>) => Promise<unknown>;
  getLrc?: (musicItem: Record<string, unknown>) => Promise<unknown>;
  search?: (keyword: string, page: number, type: string) => Promise<unknown>;
};

const pluginCodeCache = new Map<string, Promise<string>>();
const musicFreePluginCache = new Map<string, Promise<MusicFreePlugin>>();

const pluginQualityAttempts: Record<
  NonNullable<MusicPluginResolveInput["quality"]>,
  string[]
> = {
  "128k": ["standard", "128k"],
  "320k": ["standard", "higher", "exhigh", "320k"],
  flac: ["standard", "lossless", "flac"],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertHttpUrl(value: string) {
  const url = new URL(value);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only HTTP/HTTPS plugin URLs are allowed.");
  }

  return value;
}

function pluginFetch(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PLUGIN_TIMEOUT_MS);

  return fetch(url, {
    ...init,
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));
}

function withPluginTimeout<T>(promise: Promise<T>, label: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`${label} timed out.`)),
        PLUGIN_OPERATION_TIMEOUT_MS,
      );
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function fetchPluginCode(url: string) {
  const safeUrl = assertHttpUrl(url);
  const cached = pluginCodeCache.get(safeUrl);

  if (cached) return cached;

  const promise = pluginFetch(safeUrl).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Plugin fetch failed with ${response.status}.`);
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);

    if (contentLength > MAX_PLUGIN_BYTES) {
      throw new Error("Plugin file is too large.");
    }

    const code = await response.text();

    if (code.length > MAX_PLUGIN_BYTES) {
      throw new Error("Plugin file is too large.");
    }

    return code;
  });

  pluginCodeCache.set(safeUrl, promise);
  return promise;
}

function requirePluginDependency(name: string) {
  switch (name) {
    case "axios":
      return axios;
    case "cheerio":
      return cheerio;
    case "crypto-js":
      return CryptoJS;
    case "dayjs":
      return dayjs;
    case "he":
      return he;
    case "big-integer":
      return bigInt;
    case "qs":
      return qs;
    default:
      throw new Error(`Unsupported plugin dependency: ${name}`);
  }
}

async function loadMusicFreePlugin(plugin: MusicPluginDefinition) {
  const cached = musicFreePluginCache.get(plugin.url);

  if (cached) return cached;

  const promise = fetchPluginCode(plugin.url).then((code) => {
    const pluginModule = { exports: {} as Record<string, unknown> };
    const sandbox: Record<string, unknown> = {
      Buffer,
      URL,
      clearTimeout,
      console: {
        debug() {},
        error() {},
        info() {},
        log() {},
        warn() {},
      },
      exports: pluginModule.exports,
      fetch: pluginFetch,
      module: pluginModule,
      Promise,
      require: requirePluginDependency,
      setTimeout,
    };

    sandbox.global = sandbox;
    sandbox.globalThis = sandbox;

    new Script(code, { filename: plugin.url }).runInContext(
      createContext(sandbox),
      {
        timeout: PLUGIN_EVAL_TIMEOUT_MS,
      },
    );

    const exportsValue = pluginModule.exports;

    if (!isRecord(exportsValue)) {
      throw new Error("MusicFree plugin did not export an object.");
    }

    return exportsValue as MusicFreePlugin;
  });

  musicFreePluginCache.set(plugin.url, promise);
  return promise;
}

function pluginByProvider(
  provider: MusicPluginProvider,
  definitions = defaultMusicPluginDefinitions,
) {
  const plugin = definitions.find((item) => item.provider === provider);

  if (!plugin) {
    throw new Error(`Unknown music plugin provider: ${provider}`);
  }

  return plugin;
}

function normalizeString(value: unknown, fallback = "") {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "bigint") {
    return value.toString().trim();
  }

  return fallback;
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const trimmedValue = value.trim();
    const timeMatch = trimmedValue.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);

    if (timeMatch) {
      const first = Number(timeMatch[1]);
      const second = Number(timeMatch[2]);
      const third = timeMatch[3] ? Number(timeMatch[3]) : null;

      return third === null ? first * 60 + second : first * 3600 + second * 60 + third;
    }

    const numericValue = Number(trimmedValue);

    return Number.isFinite(numericValue) ? numericValue : 0;
  }

  return 0;
}

function normalizeArtist(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (isRecord(item)) return normalizeString(item.name ?? item.title);

        return "";
      })
      .filter(Boolean)
      .join(" / ");
  }

  return normalizeString(value);
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const normalizedValue = normalizeString(value);

    if (normalizedValue) return normalizedValue;
  }

  return "";
}

function extractNestedList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return [];

  for (const key of [
    "data",
    "list",
    "musicList",
    "results",
    "items",
    "songs",
    "records",
  ]) {
    const nestedValue = value[key];

    if (Array.isArray(nestedValue)) return nestedValue;

    const nestedList = extractNestedList(nestedValue);

    if (nestedList.length > 0) return nestedList;
  }

  return [];
}

function extractLyricText(value: unknown, depth = 0): string {
  if (depth > 4) return "";

  if (typeof value === "string") return value.trim();

  if (Array.isArray(value)) {
    return value
      .map((item) => extractLyricText(item, depth + 1))
      .filter(Boolean)
      .join("\n");
  }

  if (!isRecord(value)) return "";

  for (const key of [
    "rawLrc",
    "lyric",
    "lyrics",
    "lrc",
    "lrcText",
    "content",
    "text",
    "data",
  ]) {
    const text = extractLyricText(value[key], depth + 1);

    if (text) return text;
  }

  return firstString(value.lineLyric, value.words, value.sentence);
}

function normalizeMusicItem(
  source: MusicPluginProvider,
  value: unknown,
): MusicSearchCandidate | null {
  if (!isRecord(value)) return null;

  const title = firstString(value.title, value.name, value.songName, value.songname);
  const artist =
    normalizeArtist(
      value.artist ??
        value.artists ??
        value.singer ??
        value.singers ??
        value.author ??
        value.artistName ??
        value.singerName,
    ) || "Unknown";
  const id = firstString(
    value.id,
    value.mid,
    value.hash,
    value.songmid,
    value.rid,
    value.bvid,
    value.audioId,
  );

  if (!title || !id) return null;

  return {
    album: firstString(value.album, value.albumName, value.albumname),
    artist,
    artwork: firstString(
      value.artwork,
      value.picUrl,
      value.img,
      value.pic,
      value.cover,
      value.coverImg,
      value.coverImgUrl,
      value.avatar,
    ),
    duration: normalizeNumber(value.duration ?? value.interval ?? value.time),
    id,
    raw: value,
    source,
    title,
  };
}

function normalizeSearchResult(source: MusicPluginProvider, result: unknown) {
  const data = extractNestedList(result);

  return data
    .map((item) => normalizeMusicItem(source, item))
    .filter((item): item is MusicSearchCandidate => Boolean(item));
}

function extractPlayableUrl(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!isRecord(value)) return "";

  for (const key of ["url", "musicUrl", "audioUrl", "playUrl", "src"]) {
    const candidate = value[key];

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  if (isRecord(value.data)) return extractPlayableUrl(value.data);

  return "";
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown plugin error.";
}

function getQualityAttempts(quality: MusicPluginResolveInput["quality"]) {
  const requestedQuality = quality ?? "320k";

  return Array.from(
    new Set([...(pluginQualityAttempts[requestedQuality] ?? []), requestedQuality]),
  );
}

function normalizeComparableText(value: string) {
  return value
    .toLowerCase()
    .replace(/[（(].*?[）)]/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function similarityScore(left: string, right: string) {
  const leftValue = normalizeComparableText(left);
  const rightValue = normalizeComparableText(right);

  if (!leftValue || !rightValue) return 0;
  if (leftValue === rightValue) return 1;
  if (leftValue.includes(rightValue) || rightValue.includes(leftValue)) return 0.82;

  const leftTokens = new Set(leftValue.split(" ").filter(Boolean));
  const rightTokens = new Set(rightValue.split(" ").filter(Boolean));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token));

  return intersection.length / Math.max(leftTokens.size, rightTokens.size, 1);
}

function scoreLyricCandidate(
  target: Pick<MusicSearchCandidate, "artist" | "title">,
  candidate: MusicSearchCandidate,
) {
  const titleScore = similarityScore(target.title, candidate.title);
  const artistScore = similarityScore(target.artist, candidate.artist);

  return titleScore * 0.72 + artistScore * 0.28;
}

function rankFallbackCandidates(
  target: Pick<MusicSearchCandidate, "artist" | "title">,
  candidates: MusicSearchCandidate[],
  minScore = 0.52,
) {
  return candidates
    .map((candidate) => ({
      candidate,
      score: scoreLyricCandidate(target, candidate),
    }))
    .filter(({ score }) => score >= minScore)
    .sort((left, right) => right.score - left.score);
}

function interleaveSearchResults(
  groups: MusicSearchCandidate[][],
  limit: number,
) {
  const results: MusicSearchCandidate[] = [];
  const seen = new Set<string>();
  let cursor = 0;

  while (results.length < limit) {
    let added = false;

    for (const group of groups) {
      const candidate = group[cursor];

      if (!candidate) continue;

      const key = `${candidate.source}:${candidate.id}`;

      if (!seen.has(key)) {
        seen.add(key);
        results.push(candidate);
        added = true;
      }

      if (results.length >= limit) break;
    }

    if (!added) break;
    cursor += 1;
  }

  return results;
}

export async function resolveMusicPluginLyric(input: MusicPluginResolveInput) {
  const plugin = await loadMusicFreePlugin(
    pluginByProvider(input.provider, input.definitions),
  );
  const rawCandidate = input.candidate?.raw ?? {
    bvid: input.songId,
    id: input.songId,
  };
  const lyricMethods = [
    "getLyric",
    "getLyricInfo",
    "getMusicLyric",
    "getMediaLyric",
    "getLrc",
  ] as const;

  for (const methodName of lyricMethods) {
    const method = plugin[methodName];

    if (typeof method !== "function") continue;

    const lyric = extractLyricText(
      await withPluginTimeout(method(rawCandidate), `${input.provider} lyric`),
    ).slice(0, 20_000);

    if (lyric) return lyric;
  }

  return "";
}

export async function resolveMusicPluginLyricWithFallback(
  input: MusicPluginResolveInput,
): Promise<MusicPluginLyricResult | null> {
  const directLyric = await resolveMusicPluginLyric(input).catch(() => "");

  if (directLyric) {
    return {
      lyric: directLyric,
      source: input.provider,
    };
  }

  if (!input.candidate) return null;

  const definitions = input.definitions ?? defaultMusicPluginDefinitions;
  const providers = definitions
    .map((definition) => definition.provider)
    .filter((provider) => provider !== input.provider && provider !== "bilibili");
  const query = [input.candidate.title, input.candidate.artist]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!query || providers.length === 0) return null;

  const fallbackCandidates = await searchMusicPlugins({
    definitions,
    keyword: query,
    limit: Math.max(12, providers.length * 4),
    providers,
  }).catch(() => []);
  const rankedCandidates = rankFallbackCandidates(
    input.candidate,
    fallbackCandidates,
  ).slice(0, 8);

  for (const { candidate } of rankedCandidates) {
    const lyric = await resolveMusicPluginLyric({
      candidate,
      definitions,
      provider: candidate.source,
      quality: input.quality,
      songId: candidate.id,
    }).catch(() => "");

    if (lyric) {
      return {
        lyric,
        source: candidate.source,
      };
    }
  }

  return null;
}

export function getMusicPluginDefinitions() {
  return defaultMusicPluginDefinitions;
}

export async function searchMusicPlugins(input: {
  definitions?: MusicPluginDefinition[];
  keyword: string;
  limit?: number;
  providers?: MusicPluginProvider[];
}) {
  const keyword = input.keyword.trim();
  const limit = input.limit ?? 20;
  const providers =
    input.providers
      ? Array.from(new Set(input.providers))
      : (input.definitions ?? defaultMusicPluginDefinitions).map(
          (definition) => definition.provider,
        );

  if (!keyword || providers.length === 0) return [];

  const settled = await Promise.allSettled(
    providers.map(async (provider) => {
      const plugin = await loadMusicFreePlugin(
        pluginByProvider(provider, input.definitions),
      );

      if (typeof plugin.search !== "function") return [];

      const result = await withPluginTimeout(
        plugin.search(keyword, 1, "music"),
        `${provider} search`,
      );
      return normalizeSearchResult(provider, result);
    }),
  );

  return interleaveSearchResults(
    settled.map((item) => (item.status === "fulfilled" ? item.value : [])),
    limit,
  );
}

export async function resolveMusicPluginWithFallback(
  input: MusicPluginResolveInput,
) {
  try {
    return await resolveMusicPlugin(input);
  } catch (directError) {
    if (!input.candidate) throw directError;

    const definitions = input.definitions ?? defaultMusicPluginDefinitions;
    const fallbackProviders = definitions
      .map((definition) => definition.provider)
      .filter((provider) => provider !== input.provider);
    const query = [input.candidate.title, input.candidate.artist]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (!query || fallbackProviders.length === 0) throw directError;

    const fallbackCandidates = await searchMusicPlugins({
      definitions,
      keyword: query,
      limit: Math.max(16, fallbackProviders.length * 5),
      providers: fallbackProviders,
    }).catch(() => []);
    const rankedCandidates = rankFallbackCandidates(
      input.candidate,
      fallbackCandidates,
    ).slice(0, 10);
    const failures: string[] = [
      `${input.provider}: ${toErrorMessage(directError)}`,
    ];

    for (const { candidate } of rankedCandidates) {
      try {
        const result = await resolveMusicPlugin({
          candidate,
          definitions,
          provider: candidate.source,
          quality: input.quality,
          songId: candidate.id,
        });

        return {
          ...result,
          warnings: [
            `原音源 ${input.provider} 解析失败，已切换 ${candidate.source} 远程源兜底。`,
            ...result.warnings,
          ],
        } satisfies MusicPluginResolveResult;
      } catch (error) {
        failures.push(`${candidate.source}: ${toErrorMessage(error)}`);
      }
    }

    throw new Error(failures.at(-1) ?? toErrorMessage(directError));
  }
}

export async function resolveMusicPlugin(input: MusicPluginResolveInput) {
  const plugin = await loadMusicFreePlugin(
    pluginByProvider(input.provider, input.definitions),
  );

  if (typeof plugin.getMediaSource !== "function") {
    throw new Error(`${input.provider} plugin does not support getMediaSource.`);
  }

  const rawCandidate = input.candidate?.raw ?? {
    id: input.songId,
    bvid: input.songId,
  };
  const attemptedQualities = getQualityAttempts(input.quality);
  const failures: string[] = [];

  for (const pluginQuality of attemptedQualities) {
    try {
      const result = await withPluginTimeout(
        plugin.getMediaSource(rawCandidate, pluginQuality),
        `${input.provider} media`,
      );
      const audioUrl = extractPlayableUrl(result);

      if (audioUrl) {
        const requestedQuality = input.quality ?? "320k";
        const warnings =
          pluginQuality === requestedQuality
            ? []
            : [`已使用 ${pluginQuality} 兼容解析 ${requestedQuality} 音质。`];

        const lyricResult = await resolveMusicPluginLyricWithFallback(input);

        return {
          audioUrl,
          ...(lyricResult
            ? { lyric: lyricResult.lyric, lyricSource: lyricResult.source }
            : {}),
          source: input.provider,
          title: input.candidate?.title,
          warnings,
        } satisfies MusicPluginResolveResult;
      }

      failures.push(`${pluginQuality}: empty url`);
    } catch (error) {
      failures.push(`${pluginQuality}: ${toErrorMessage(error)}`);
    }
  }

  throw new Error(
    `插件 ${input.provider} 没有返回可播放地址，已尝试 ${attemptedQualities.join(
      " / ",
    )}。${failures.at(-1) ?? ""}`,
  );
}
