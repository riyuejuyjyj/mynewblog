export const QING_MUSIC_MANIFEST_URL =
  "https://13413.kstore.vip/QingMusic/music.json";

const QING_MUSIC_FETCH_TIMEOUT_MS = 12_000;

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
