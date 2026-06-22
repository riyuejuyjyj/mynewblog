export type StudioView =
  | "dashboard"
  | "posts"
  | "editor"
  | "media"
  | "music"
  | "comments";
export type UploadFolder = "covers" | "gallery" | "attachments" | "music";

export type StudioStats = {
  total: number;
  published: number;
  drafts: number;
  views: number;
};

export type StudioPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  tags: string[];
  featured: boolean;
  published: boolean;
  readingMinutes: number;
  viewCount: number;
  likeCount: number;
  publishedAt: string;
  updatedAt: string;
};

export type StudioPostForm = {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  mood: string;
  tagsText: string;
  readingMinutes: number;
  featured: boolean;
  published: boolean;
};

export type StudioMediaAsset = {
  id: string;
  objectKey: string;
  folder: string;
  publicUrl: string | null;
  previewUrl?: string | null;
  exists?: boolean | null;
  contentType: string;
  sizeBytes: number;
  altText: string | null;
  createdAt: string;
};

export type StudioComment = {
  id: string;
  parentId?: string | null;
  authorName: string;
  authorEmail?: string;
  authorUrl?: string | null;
  body: string;
  createdAt: string;
  postSlug: string;
  status: string;
  updatedAt?: string;
};

export type StudioMusicTrack = {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  audioUrl: string;
  lyric: string;
  provider: "manual" | "wy" | "tx" | "kg" | "kw" | "mg";
  sourceSongId: string;
  quality: "128k" | "320k" | "flac";
  sortOrder: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StudioMusicItemProvider =
  | StudioMusicTrack["provider"]
  | "bilibili";

export type StudioMusicLibraryItem = {
  album: string;
  artist: string;
  audioUrl: string;
  coverUrl: string;
  itemKey: string;
  itemKind: "track" | "candidate";
  lyric: string;
  provider: StudioMusicItemProvider;
  quality: StudioMusicTrack["quality"];
  sourceSongId: string;
  title: string;
  trackId?: string;
};

export type StudioMusicFavorite = StudioMusicLibraryItem & {
  createdAt: string;
  id: string;
  updatedAt: string;
};

export type StudioMusicPlayHistory = StudioMusicLibraryItem & {
  id: string;
  playedAt: string;
};

export type StudioMusicPlaylistItem = StudioMusicLibraryItem & {
  createdAt: string;
  id: string;
  playlistId: string;
  sortOrder: number;
};

export type StudioMusicPlaylist = {
  coverUrl: string;
  createdAt: string;
  description: string;
  id: string;
  items: StudioMusicPlaylistItem[];
  name: string;
  sortOrder: number;
  updatedAt: string;
};

export type StudioMusicDownload = StudioMusicLibraryItem & {
  audioExists: boolean | null;
  audioObjectKey: string;
  coverExists: boolean | null;
  coverObjectKey: string;
  downloadedAt: string;
  id: string;
  storageStatus: "ready" | "missing" | "record-only" | "unknown";
};

export type StudioMusicSource = {
  id: string;
  name: string;
  kind: string;
  providerKeys: string[];
  sourcePath: string;
  version: string;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type StudioMusicSourceVersionStatus = {
  checkedAt: string;
  description: string;
  error: string;
  localVersion: string;
  remoteVersion: string;
  sourceId: string;
  updateAvailable: boolean;
  updateUrl: string;
};

export type StudioMusicSearchSource = {
  id: string;
  name: string;
  provider: StudioMusicPluginProvider;
  url: string;
  version: string;
  enabled: boolean;
  sortOrder: number;
  lastTestedAt: string | null;
  lastTestKeyword: string;
  lastTestOk: boolean | null;
  lastTestSearchable: boolean | null;
  lastTestPlayable: boolean | null;
  lastTestLyric: boolean | null;
  lastTestResultCount: number;
  lastTestElapsedMs: number;
  lastTestError: string;
  createdAt: string;
  updatedAt: string;
};

export type StudioMusicSearchSourceTestResult = {
  elapsedMs: number;
  enabled: boolean;
  error: string;
  keyword: string;
  ok: boolean;
  provider: StudioMusicPluginProvider;
  resolve: {
    audioOk: boolean;
    elapsedMs: number;
    error: string;
    lyricOk: boolean;
    lyricSource: StudioMusicPluginProvider | null;
    title: string;
    warnings: string[];
  } | null;
  sample: StudioMusicSearchCandidate[];
  sourceId: string;
  total: number;
};

export type StudioQingMusicLevel =
  | "standard"
  | "exhigh"
  | "lossless"
  | "hires"
  | "atmos"
  | "atmos_plus"
  | "master"
  | "clear";

export type StudioQingMusicLine = {
  detailApi: string;
  enabled: boolean;
  id: StudioSourceProvider;
  levels: StudioQingMusicLevel[];
  name: string;
  searchApi: string;
};

export type StudioQingMusicManifestStatus = {
  checkedAt: string;
  error: string;
  lines: StudioQingMusicLine[];
  playableLevelCount: number;
  recommendedProviderIds: StudioSourceProvider[];
  url: string;
};

export type StudioSourceProvider = "kg" | "tx" | "wy" | "kw" | "mg";
export type StudioSourceQuality = "128k" | "320k" | "flac";

export type StudioSourceLabInput = {
  provider: StudioSourceProvider;
  quality: StudioSourceQuality;
  songId: string;
  sourcePath: string;
};

export type StudioRedactedValue =
  | {
      kind: "url";
      origin: "<redacted>";
      protocol: string;
      queryKeys: string[];
      urlLength: number;
    }
  | { kind: "text"; length: number }
  | { kind: "array"; length: number }
  | { kind: "object"; keys: string[] }
  | { kind: "error"; message: string }
  | {
      kind:
        | "null"
        | "undefined"
        | "boolean"
        | "number"
        | "bigint"
        | "symbol"
        | "function";
    };

export type StudioSourceLabResult = {
  dryRun: true;
  sourceFileName: string;
  handlers: number;
  outboundRequests: Array<{
    method: string;
    timeout?: number;
    url: StudioRedactedValue;
  }>;
  probe: {
    provider: string;
    quality: string;
    result: StudioRedactedValue;
  } | null;
  sources: Record<
    string,
    {
      actions: string[];
      name?: string;
      qualitys: string[];
      type?: string;
    }
  >;
  warnings: string[];
};

export type StudioResolvedMusicUrl = {
  audioUrl: string;
  lyric?: string;
  lyricSource?: StudioMusicPluginProvider;
  provider: StudioMusicTrack["provider"];
  quality: StudioMusicTrack["quality"];
  sourceFileName: string;
  warnings: string[];
};

export type StudioResolveMusicInput = {
  album?: string;
  audioUrl: string;
  artist?: string;
  coverUrl?: string;
  provider: StudioMusicTrack["provider"];
  quality: StudioMusicTrack["quality"];
  songId: string;
  sourcePath?: string;
  title?: string;
};

export type StudioMusicPluginProvider =
  | "wy"
  | "kw"
  | "kg"
  | "tx"
  | "mg"
  | "bilibili";

export type StudioMusicSearchCandidate = {
  album: string;
  artist: string;
  artwork: string;
  duration: number;
  id: string;
  raw: Record<string, unknown>;
  source: StudioMusicPluginProvider;
  title: string;
};

export type StudioResolvePluginMusicInput = {
  candidate?: StudioMusicSearchCandidate;
  provider: StudioMusicPluginProvider;
  quality: StudioMusicTrack["quality"];
  songId: string;
};

export type StudioPrepareMusicDownloadInput = StudioMusicLibraryItem & {
  candidate?: StudioMusicSearchCandidate;
};

export type StudioPrepareMusicDownloadResult = {
  download: StudioMusicDownload;
  warnings: string[];
};

export type StudioMusicDownloadProgress = {
  fileName: string;
  itemKey: string;
  phase: "preparing" | "downloading" | "complete" | "error";
  progress: number;
  receivedBytes: number;
  totalBytes: number;
  title: string;
};

export type StudioMusicPlaybackMode = "repeat-all" | "shuffle" | "repeat-one";

export type StudioMusicQueueItem = {
  artist: string;
  candidate?: StudioMusicSearchCandidate;
  coverUrl: string;
  key: string;
  kind: "track" | "candidate" | "library";
  libraryItemKey?: string;
  sourceLabel: string;
  title: string;
};
