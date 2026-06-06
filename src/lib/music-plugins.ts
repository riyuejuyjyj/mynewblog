const DISABLED_REASON =
  "Server-side music plugin execution is disabled in the Cloudflare production bundle.";

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

export function getMusicPluginDefinitions() {
  return defaultMusicPluginDefinitions;
}

export async function searchMusicPlugins(input: {
  definitions?: MusicPluginDefinition[];
  keyword: string;
  limit?: number;
  providers?: MusicPluginProvider[];
}): Promise<MusicSearchCandidate[]> {
  void input;

  return [];
}

export async function resolveMusicPluginLyric(
  input: MusicPluginResolveInput,
): Promise<string> {
  void input;

  return "";
}

export async function resolveMusicPluginLyricWithFallback(
  input: MusicPluginResolveInput,
): Promise<MusicPluginLyricResult | null> {
  void input;

  return null;
}

export async function resolveMusicPlugin(
  input: MusicPluginResolveInput,
): Promise<MusicPluginResolveResult> {
  void input;

  throw new Error(DISABLED_REASON);
}

export async function resolveMusicPluginWithFallback(
  input: MusicPluginResolveInput,
): Promise<MusicPluginResolveResult> {
  void input;

  throw new Error(DISABLED_REASON);
}
