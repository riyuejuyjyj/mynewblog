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

export const qingMusicSearchProviderIds = [
  "kw",
  "kg",
  "wy",
  "tx",
] as const satisfies readonly QingMusicProviderId[];

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
  searchableProviderIds: QingMusicProviderId[];
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
const KUGOU_SEARCH_URL = "https://songsearch.kugou.com/song_search_v2";
const NETEASE_SEARCH_URL = "https://music.163.com/api/search/get/web";
const TENCENT_SEARCH_URL = "https://u.y.qq.com/cgi-bin/musicu.fcg";
const KUWO_SEARCH_PAGE_SIZE = 30;
const QING_MUSIC_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

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

function getFirstText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = getText(record, key);

    if (value) return value;
  }

  return "";
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

function normalizeHttpUrl(value: string) {
  const trimmed = decodeHtmlEntities(value).trim();

  if (!trimmed) return "";

  let normalized = trimmed
    .replaceAll("{size}", "480")
    .replaceAll("/{size}", "/480");

  if (normalized.startsWith("//")) normalized = `https:${normalized}`;
  if (normalized.startsWith("http://")) {
    normalized = normalized.replace(/^http:\/\//i, "https://");
  }

  if (!/^https?:\/\//i.test(normalized)) return "";

  return normalized;
}

function getNestedRecord(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> | null {
  return asRecord(record[key]);
}

function getNestedText(record: Record<string, unknown>, path: string[]) {
  let current: Record<string, unknown> | null = record;

  for (const key of path.slice(0, -1)) {
    current = current ? getNestedRecord(current, key) : null;
  }

  return current ? getText(current, path[path.length - 1] ?? "") : "";
}

function joinRecordNames(value: unknown) {
  if (typeof value === "string") return decodeHtmlEntities(value.trim());
  if (!Array.isArray(value)) return "";

  return value
    .map((item) => {
      const record = asRecord(item);

      return record ? getText(record, "name") || getText(record, "Name") : "";
    })
    .filter(Boolean)
    .join(" / ");
}

async function fetchQingMusicJson(
  url: string | URL,
  init: RequestInit,
  label: string,
) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    QING_MUSIC_SEARCH_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`${label} failed with ${response.status}`);
    }

    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timer);
  }
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

function normalizeKugouArtwork(record: Record<string, unknown>) {
  return normalizeHttpUrl(
    getText(record, "Image") ||
      getText(record, "AlbumImage") ||
      getNestedText(record, ["trans_param", "union_cover"]),
  );
}

function toKugouCandidate(value: unknown): QingMusicSearchCandidate | null {
  const record = asRecord(value);

  if (!record) return null;

  const id = getFirstText(record, [
    "FileHash",
    "HQFileHash",
    "SQFileHash",
    "ResFileHash",
    "Hash",
    "ID",
  ]);
  const fileName = decodeHtmlEntities(getText(record, "FileName"));
  const title = decodeHtmlEntities(
    getFirstText(record, ["SongName", "OriSongName"]) ||
      fileName.split(" - ").slice(1).join(" - "),
  );

  if (!id || !title) return null;

  return {
    album: decodeHtmlEntities(getText(record, "AlbumName")),
    artist: decodeHtmlEntities(
      getText(record, "SingerName") ||
        joinRecordNames(record.Singers) ||
        fileName.split(" - ")[0] ||
        "",
    ),
    artwork: normalizeKugouArtwork(record),
    duration:
      getNumber(record, "Duration") ||
      getNumber(record, "HQDuration") ||
      getNumber(record, "SQDuration"),
    id,
    raw: record,
    source: "kg",
    title,
  };
}

function toNeteaseCandidate(value: unknown): QingMusicSearchCandidate | null {
  const record = asRecord(value);

  if (!record) return null;

  const id = String(getNumber(record, "id") || getText(record, "id"));
  const title = decodeHtmlEntities(getText(record, "name"));

  if (!id || id === "0" || !title) return null;

  const album = getNestedRecord(record, "album");
  const artists = record.artists ?? record.ar;

  return {
    album: album ? decodeHtmlEntities(getText(album, "name")) : "",
    artist: decodeHtmlEntities(joinRecordNames(artists)),
    artwork: normalizeHttpUrl(
      (album
        ? getText(album, "picUrl") || getText(album, "blurPicUrl")
        : "") ||
        (Array.isArray(artists)
          ? getText(asRecord(artists[0]) ?? {}, "img1v1Url")
          : ""),
    ),
    duration: Math.round(getNumber(record, "duration") / 1000),
    id,
    raw: record,
    source: "wy",
    title,
  };
}

function toTencentCandidate(value: unknown): QingMusicSearchCandidate | null {
  const record = asRecord(value);

  if (!record) return null;

  const id = getText(record, "mid") || getText(record, "songmid");
  const title = decodeHtmlEntities(
    getText(record, "name") || getText(record, "title"),
  );

  if (!id || !title) return null;

  const album = getNestedRecord(record, "album");
  const albumMid = album
    ? getText(album, "mid") || getText(album, "pmid").replace(/_\d+$/, "")
    : "";

  return {
    album: album
      ? decodeHtmlEntities(getText(album, "name") || getText(album, "title"))
      : "",
    artist: decodeHtmlEntities(
      joinRecordNames(record.singer) || getText(record, "author"),
    ),
    artwork: albumMid
      ? `https://y.qq.com/music/photo_new/T002R800x800M000${albumMid}.jpg`
      : "",
    duration: getNumber(record, "interval"),
    id,
    raw: record,
    source: "tx",
    title,
  };
}

async function searchKuwoMusic(input: {
  keyword: string;
  limit: number;
}): Promise<QingMusicSearchCandidate[]> {
  const url = new URL(KUWO_SEARCH_URL);

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

  const payload = (await fetchQingMusicJson(
    url,
    {
      headers: {
        accept: "application/json,text/plain,*/*",
        "user-agent": QING_MUSIC_USER_AGENT,
      },
    },
    "Kuwo search",
  )) as KuwoSearchPayload;
  const items = Array.isArray(payload.abslist) ? payload.abslist : [];

  return items
    .map(toKuwoCandidate)
    .filter((item): item is QingMusicSearchCandidate => Boolean(item))
    .slice(0, input.limit);
}

async function searchKugouMusic(input: {
  keyword: string;
  limit: number;
}): Promise<QingMusicSearchCandidate[]> {
  const url = new URL(KUGOU_SEARCH_URL);

  url.searchParams.set("keyword", input.keyword);
  url.searchParams.set("page", "1");
  url.searchParams.set("pagesize", String(input.limit));
  url.searchParams.set("userid", "0");
  url.searchParams.set("clientver", "");
  url.searchParams.set("platform", "WebFilter");
  url.searchParams.set("filter", "2");
  url.searchParams.set("iscorrection", "1");
  url.searchParams.set("privilege_filter", "0");
  url.searchParams.set("area_code", "1");

  const payload = asRecord(
    await fetchQingMusicJson(
      url,
      {
        headers: {
          accept: "application/json,text/plain,*/*",
          "user-agent": QING_MUSIC_USER_AGENT,
        },
      },
      "Kugou search",
    ),
  );
  const data = payload ? asRecord(payload.data) : null;
  const items = data && Array.isArray(data.lists) ? data.lists : [];

  return items
    .map(toKugouCandidate)
    .filter((item): item is QingMusicSearchCandidate => Boolean(item))
    .slice(0, input.limit);
}

async function searchNeteaseMusic(input: {
  keyword: string;
  limit: number;
}): Promise<QingMusicSearchCandidate[]> {
  const body = new URLSearchParams({
    limit: String(input.limit),
    offset: "0",
    s: input.keyword,
    total: "true",
    type: "1",
  });
  const payload = asRecord(
    await fetchQingMusicJson(
      NETEASE_SEARCH_URL,
      {
        body,
        headers: {
          accept: "application/json,text/plain,*/*",
          "content-type": "application/x-www-form-urlencoded",
          origin: "https://music.163.com",
          referer: "https://music.163.com/",
          "user-agent": QING_MUSIC_USER_AGENT,
        },
        method: "POST",
      },
      "Netease search",
    ),
  );
  const result = payload ? asRecord(payload.result) : null;
  const items = result && Array.isArray(result.songs) ? result.songs : [];

  return items
    .map(toNeteaseCandidate)
    .filter((item): item is QingMusicSearchCandidate => Boolean(item))
    .slice(0, input.limit);
}

async function searchTencentMusic(input: {
  keyword: string;
  limit: number;
}): Promise<QingMusicSearchCandidate[]> {
  const body = {
    comm: {
      OpenUDID: "0",
      OpenUDID2: "0",
      QIMEI36: "0",
      aid: "0",
      chid: "0",
      ct: "11",
      cv: "14090508",
      deviceScore: "553.47",
      devicelevel: "50",
      modeSwitch: "6",
      nettype: "1020",
      newdevicelevel: "20",
      oaid: "0",
      os_ver: "12",
      phonetype: "EBG-AN10",
      rom: "HuaWei/EMOTION/EmotionUI_14.2.0",
      sid: "0",
      taid: "0",
      teenMode: "0",
      tid: "0",
      tmeAppID: "qqmusic",
      udid: "0",
      ui_mode: "2",
      uid: "0",
      v: "14090508",
      v4ip: "",
      wid: "0",
    },
    req: {
      method: "DoSearchForQQMusicMobile",
      module: "music.search.SearchCgiService",
      param: {
        cat: 2,
        grp: 1,
        highlight: 0,
        multi_zhida: 0,
        nqc_flag: 0,
        num_per_page: input.limit,
        page_num: 1,
        query: input.keyword,
        search_type: 0,
        sem: 0,
        sin: 0,
      },
    },
  };
  const payload = asRecord(
    await fetchQingMusicJson(
      TENCENT_SEARCH_URL,
      {
        body: JSON.stringify(body),
        headers: {
          accept: "application/json,text/plain,*/*",
          "content-type": "application/json",
          "user-agent": "QQMusic 14090508(android 12)",
        },
        method: "POST",
      },
      "QQ music search",
    ),
  );
  const req = payload ? asRecord(payload.req) : null;
  const data = req ? asRecord(req.data) : null;
  const bodyRecord = data ? asRecord(data.body) : null;
  const items =
    bodyRecord && Array.isArray(bodyRecord.item_song)
      ? bodyRecord.item_song
      : [];

  return items
    .map(toTencentCandidate)
    .filter((item): item is QingMusicSearchCandidate => Boolean(item))
    .slice(0, input.limit);
}

function searchProvider(input: {
  keyword: string;
  limit: number;
  provider: QingMusicProviderId;
}) {
  if (input.provider === "kw") {
    return searchKuwoMusic(input);
  }

  if (input.provider === "kg") {
    return searchKugouMusic(input);
  }

  if (input.provider === "wy") {
    return searchNeteaseMusic(input);
  }

  if (input.provider === "tx") {
    return searchTencentMusic(input);
  }

  return Promise.resolve([]);
}

function roundRobinCandidates(
  buckets: QingMusicSearchCandidate[][],
  limit: number,
) {
  const merged: QingMusicSearchCandidate[] = [];
  let index = 0;

  while (merged.length < limit) {
    let added = false;

    for (const bucket of buckets) {
      const candidate = bucket[index];

      if (candidate) {
        merged.push(candidate);
        added = true;

        if (merged.length >= limit) break;
      }
    }

    if (!added) break;
    index += 1;
  }

  return merged;
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
  const activeProviders = qingMusicSearchProviderIds.filter(
    (provider) => enabledProviders.has(provider) && providerSet.has(provider),
  );

  if (activeProviders.length === 0) return [];

  const limit = input.limit ?? 20;
  const providerLimit =
    activeProviders.length === 1
      ? limit
      : Math.max(4, Math.ceil(limit / activeProviders.length));
  const tasks = activeProviders.map((provider) =>
    searchProvider({ keyword, limit: providerLimit, provider }),
  );

  const results = await Promise.allSettled(tasks);
  const buckets = results.map((result) =>
    result.status === "fulfilled" ? result.value : [],
  );

  return roundRobinCandidates(buckets, limit);
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
    const searchableProviderSet = new Set<QingMusicProviderId>(
      qingMusicSearchProviderIds,
    );
    const searchableProviderIds = recommendedProviderIds.filter((provider) =>
      searchableProviderSet.has(provider),
    );
    const playableLevelCount = new Set(
      lines.flatMap((line) => line.levels.map(toStudioQuality).filter(Boolean)),
    ).size;

    return {
      checkedAt: new Date().toISOString(),
      lines,
      playableLevelCount,
      recommendedProviderIds,
      searchableProviderIds,
      url: QING_MUSIC_MANIFEST_URL,
    };
  } finally {
    clearTimeout(timer);
  }
}
