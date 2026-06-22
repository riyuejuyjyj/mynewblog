export const QING_MUSIC_MANIFEST_URL =
  "https://13413.kstore.vip/QingMusic/music.json";

const QING_MUSIC_FETCH_TIMEOUT_MS = 12_000;
const QING_MUSIC_SEARCH_TIMEOUT_MS = 10_000;

const qingMusicProviderIds = ["kw", "kg", "wy", "tx", "mg"] as const;
const qingMusicLevels = [
  "standard",
  "exhigh",
  "lossless",
  "hires",
  "atmos",
  "atmos_plus",
  "master",
  "clear",
] as const;

export type QingMusicProviderId = (typeof qingMusicProviderIds)[number];
export type QingMusicLevel = (typeof qingMusicLevels)[number];

export type QingMusicLine = {
  detailApi: string;
  enabled: boolean;
  id: QingMusicProviderId;
  levels: QingMusicLevel[];
  name: string;
  searchApi: string;
};

export type QingMusicManifest = {
  checkedAt: string;
  lines: QingMusicLine[];
  playableLevelCount: number;
  recommendedProviderIds: QingMusicProviderId[];
  url: string;
};

export type QingMusicSearchCandidate = {
  album: string;
  artist: string;
  artwork: string;
  duration: number;
  id: string;
  raw: Record<string, unknown>;
  source: QingMusicProviderId;
  title: string;
};

type RawQingMusicLine = {
  detailApi?: unknown;
  enabled?: unknown;
  id?: unknown;
  levels?: unknown;
  name?: unknown;
  searchApi?: unknown;
};

type RawQingMusicManifest = {
  lines?: unknown;
};

type KuwoSearchPayload = {
  abslist?: unknown;
};

const KUWO_SEARCH_URL = "https://search.kuwo.cn/r.s";
const KUWO_SEARCH_PAGE_SIZE = 30;

function isQingMusicProviderId(value: unknown): value is QingMusicProviderId {
  return (
    typeof value === "string" &&
    (qingMusicProviderIds as readonly string[]).includes(value)
  );
}

function isQingMusicLevel(value: unknown): value is QingMusicLevel {
  return (
    typeof value === "string" &&
    (qingMusicLevels as readonly string[]).includes(value)
  );
}

function normalizeLine(value: RawQingMusicLine): QingMusicLine | null {
  if (!isQingMusicProviderId(value.id) || typeof value.name !== "string") {
    return null;
  }

  return {
    detailApi: typeof value.detailApi === "string" ? value.detailApi.trim() : "",
    enabled: value.enabled === true,
    id: value.id,
    levels: Array.isArray(value.levels)
      ? value.levels.filter(isQingMusicLevel)
      : [],
    name: value.name.trim() || value.id,
    searchApi: typeof value.searchApi === "string" ? value.searchApi.trim() : "",
  };
}

export function toStudioQuality(level: QingMusicLevel) {
  if (level === "lossless") return "flac";
  if (level === "exhigh") return "320k";
  if (level === "standard") return "128k";

  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getText(record: Record<string, unknown>, key: string) {
  const value = record[key];

  return typeof value === "string" ? value.trim() : "";
}

function getNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];

  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) return parsed;
  }

  return 0;
}

function decodeHtmlEntities(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function normalizeKuwoArtwork(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  return `https://img1.kuwo.cn/star/albumcover/${trimmed}`;
}

function normalizeKuwoSongId(record: Record<string, unknown>) {
  const musicRid = getText(record, "MUSICRID").replace(/^MUSIC_/i, "");
  const targetId = getText(record, "DC_TARGETID");
  const id = getText(record, "id");

  return musicRid || targetId || id;
}

function toKuwoCandidate(value: unknown): QingMusicSearchCandidate | null {
  const record = asRecord(value);

  if (!record) return null;

  const id = normalizeKuwoSongId(record);
  const title = decodeHtmlEntities(
    getText(record, "SONGNAME") || getText(record, "NAME"),
  );

  if (!id || !title) return null;

  return {
    album: decodeHtmlEntities(getText(record, "ALBUM")),
    artist: decodeHtmlEntities(
      getText(record, "ARTIST") || getText(record, "FARTIST"),
    ),
    artwork: normalizeKuwoArtwork(getText(record, "web_albumpic_short")),
    duration: getNumber(record, "DURATION"),
    id,
    raw: record,
    source: "kw",
    title,
  };
}

async function searchKuwoMusic(input: {
  keyword: string;
  limit: number;
}): Promise<QingMusicSearchCandidate[]> {
  const url = new URL(KUWO_SEARCH_URL);
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    QING_MUSIC_SEARCH_TIMEOUT_MS,
  );

  url.searchParams.set("client", "kt");
  url.searchParams.set("all", input.keyword);
  url.searchParams.set("pn", "0");
  url.searchParams.set("rn", String(Math.min(input.limit, KUWO_SEARCH_PAGE_SIZE)));
  url.searchParams.set("uid", "2574101368");
  url.searchParams.set("ver", "kwplayer_ar_10.9.0.0");
  url.searchParams.set("vipver", "1");
  url.searchParams.set("ft", "music");
  url.searchParams.set("cluster", "0");
  url.searchParams.set("strategy", "2012");
  url.searchParams.set("encoding", "utf8");
  url.searchParams.set("rformat", "json");
  url.searchParams.set("vermerge", "1");
  url.searchParams.set("mobi", "1");

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        accept: "application/json,text/plain,*/*",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Kuwo search failed with ${response.status}`);
    }

    const payload = (await response.json()) as KuwoSearchPayload;
    const items = Array.isArray(payload.abslist) ? payload.abslist : [];

    return items
      .map(toKuwoCandidate)
      .filter((item): item is QingMusicSearchCandidate => Boolean(item))
      .slice(0, input.limit);
  } finally {
    clearTimeout(timer);
  }
}

export async function getEnabledQingMusicProviderIds() {
  const manifest = await fetchQingMusicManifest();

  return new Set(manifest.recommendedProviderIds);
}

export async function searchQingMusic(input: {
  keyword: string;
  limit?: number;
  providers?: QingMusicProviderId[];
}) {
  const keyword = input.keyword.trim();

  if (!keyword) return [];

  const enabledProviders = await getEnabledQingMusicProviderIds().catch(
    () => new Set<QingMusicProviderId>(["kw"]),
  );
  const requestedProviders =
    input.providers && input.providers.length > 0
      ? input.providers
      : Array.from(enabledProviders);
  const providerSet = new Set(requestedProviders);
  const tasks: Array<Promise<QingMusicSearchCandidate[]>> = [];

  if (enabledProviders.has("kw") && providerSet.has("kw")) {
    tasks.push(searchKuwoMusic({ keyword, limit: input.limit ?? 20 }));
  }

  if (tasks.length === 0) return [];

  const results = await Promise.allSettled(tasks);

  return results
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .slice(0, input.limit ?? 20);
}

export async function fetchQingMusicManifest(): Promise<QingMusicManifest> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QING_MUSIC_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(QING_MUSIC_MANIFEST_URL, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`QingMusic manifest request failed with ${response.status}`);
    }

    const data = (await response.json()) as RawQingMusicManifest;
    const rawLines = Array.isArray(data.lines) ? data.lines : [];
    const lines = rawLines
      .map((item) => normalizeLine(item as RawQingMusicLine))
      .filter((line): line is QingMusicLine => Boolean(line));
    const recommendedProviderIds = lines
      .filter((line) => line.enabled)
      .map((line) => line.id);
    const playableLevelCount = new Set(
      lines.flatMap((line) => line.levels.map(toStudioQuality).filter(Boolean)),
    ).size;

    return {
      checkedAt: new Date().toISOString(),
      lines,
      playableLevelCount,
      recommendedProviderIds,
      url: QING_MUSIC_MANIFEST_URL,
    };
  } finally {
    clearTimeout(timer);
  }
}
