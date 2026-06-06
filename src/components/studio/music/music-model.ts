import type {
  StudioMusicPluginProvider,
  StudioMusicTrack,
} from "@/components/studio/types";

export type MusicForm = {
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
};

export const emptyMusicForm: MusicForm = {
  title: "",
  artist: "",
  album: "",
  coverUrl: "",
  audioUrl: "",
  lyric: "",
  provider: "manual",
  sourceSongId: "",
  quality: "320k",
  sortOrder: 0,
  enabled: true,
};

export const providerLabels: Record<StudioMusicTrack["provider"], string> = {
  kg: "酷狗",
  kw: "酷我",
  manual: "本地/R2",
  mg: "咪咕",
  tx: "QQ",
  wy: "网易云",
};

export const pluginProviderLabels: Record<StudioMusicPluginProvider, string> = {
  bilibili: "Bilibili",
  kg: "酷狗",
  kw: "酷我",
  mg: "咪咕",
  tx: "QQ",
  wy: "网易云",
};

export const pluginProviderBadgeClass: Record<StudioMusicPluginProvider, string> = {
  bilibili:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-300/30 dark:bg-rose-400/12 dark:text-rose-100",
  kg: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-300/30 dark:bg-amber-400/12 dark:text-amber-100",
  kw: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-300/30 dark:bg-sky-400/12 dark:text-sky-100",
  mg: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/30 dark:bg-emerald-400/12 dark:text-emerald-100",
  tx: "border-lime-200 bg-lime-50 text-lime-700 dark:border-lime-300/30 dark:bg-lime-400/12 dark:text-lime-100",
  wy: "border-red-200 bg-red-50 text-red-700 dark:border-red-300/30 dark:bg-red-400/12 dark:text-red-100",
};

export type MusicPlaybackSourceTone = "amber" | "emerald" | "sky" | "slate";

export type MusicPlaybackSourceStatus = {
  detail: string;
  label: string;
  tone: MusicPlaybackSourceTone;
};

export function getPlaybackSourceToneClass(tone: MusicPlaybackSourceTone) {
  if (tone === "emerald") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/30 dark:bg-emerald-400/12 dark:text-emerald-100";
  }

  if (tone === "sky") {
    return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-300/30 dark:bg-sky-400/12 dark:text-sky-100";
  }

  if (tone === "amber") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-300/30 dark:bg-amber-400/12 dark:text-amber-100";
  }

  return "border-slate-200 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-200";
}

export function trackToForm(track: StudioMusicTrack): MusicForm {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    coverUrl: track.coverUrl,
    audioUrl: track.audioUrl,
    lyric: track.lyric,
    provider: track.provider,
    sourceSongId: track.sourceSongId,
    quality: track.quality,
    sortOrder: track.sortOrder,
    enabled: track.enabled,
  };
}

export function formatTime(value: number) {
  if (!Number.isFinite(value)) return "00:00";

  const minutes = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

export function getPlayerCover(track: StudioMusicTrack | null) {
  return (
    track?.coverUrl ||
    "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=900&q=80"
  );
}

export function getLyricLines(track: StudioMusicTrack | null) {
  const raw = track?.lyric ?? "";

  return raw
    .split("\n")
    .map((line) => line.replace(/^\[[^\]]+]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 12);
}
