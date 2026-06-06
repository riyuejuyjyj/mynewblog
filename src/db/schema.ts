import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const now = () => new Date();
const id = () => crypto.randomUUID();

export const user = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(id),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(now),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey().$defaultFn(id),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(now),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey().$defaultFn(id),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(now),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey().$defaultFn(id),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(now),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const posts = pgTable(
  "posts",
  {
    id: text("id").primaryKey().$defaultFn(id),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull(),
    content: text("content").notNull(),
    coverImage: text("coverImage").notNull(),
    category: text("category").notNull().default("essay"),
    mood: text("mood").notNull().default("quiet"),
    tags: jsonb("tags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    readingMinutes: integer("readingMinutes").notNull().default(4),
    viewCount: integer("viewCount").notNull().default(0),
    likeCount: integer("likeCount").notNull().default(0),
    featured: boolean("featured").notNull().default(false),
    published: boolean("published").notNull().default(false),
    authorId: text("authorId").references(() => user.id, { onDelete: "set null" }),
    publishedAt: timestamp("publishedAt", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(now),
  },
  (table) => [
    uniqueIndex("posts_slug_idx").on(table.slug),
    index("posts_published_at_idx").on(table.publishedAt),
    index("posts_author_id_idx").on(table.authorId),
  ],
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: text("id").primaryKey().$defaultFn(id),
    bucket: text("bucket").notNull(),
    objectKey: text("object_key").notNull(),
    folder: text("folder").notNull().default("uploads"),
    publicUrl: text("public_url"),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull().default(0),
    altText: text("alt_text"),
    uploadedBy: text("uploaded_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("media_assets_bucket_key_idx").on(table.bucket, table.objectKey),
    index("media_assets_uploaded_by_idx").on(table.uploadedBy),
    index("media_assets_created_at_idx").on(table.createdAt),
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: text("id").primaryKey().$defaultFn(id),
    postSlug: text("post_slug").notNull(),
    body: text("body").notNull(),
    authorName: text("author_name").notNull(),
    authorEmail: text("author_email").notNull(),
    authorUrl: text("author_url"),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(now),
  },
  (table) => [
    index("comments_post_slug_idx").on(table.postSlug),
    index("comments_status_idx").on(table.status),
    index("comments_created_at_idx").on(table.createdAt),
  ],
);

export const musicTracks = pgTable(
  "music_tracks",
  {
    id: text("id").primaryKey().$defaultFn(id),
    title: text("title").notNull(),
    artist: text("artist").notNull().default("Unknown Artist"),
    album: text("album").notNull().default(""),
    coverUrl: text("cover_url").notNull().default(""),
    audioUrl: text("audio_url").notNull(),
    lyric: text("lyric").notNull().default(""),
    provider: text("provider").notNull().default("manual"),
    sourceSongId: text("source_song_id").notNull().default(""),
    quality: text("quality").notNull().default("320k"),
    sortOrder: integer("sort_order").notNull().default(0),
    enabled: boolean("enabled").notNull().default(true),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(now),
  },
  (table) => [
    index("music_tracks_enabled_idx").on(table.enabled),
    index("music_tracks_sort_order_idx").on(table.sortOrder),
    index("music_tracks_created_at_idx").on(table.createdAt),
  ],
);

export const musicSources = pgTable(
  "music_sources",
  {
    id: text("id").primaryKey().$defaultFn(id),
    name: text("name").notNull(),
    kind: text("kind").notNull().default("lx"),
    providerKeys: jsonb("provider_keys")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    sourceCode: text("source_code").notNull().default(""),
    sourcePath: text("source_path").notNull().default(""),
    version: text("version").notNull().default(""),
    enabled: boolean("enabled").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(now),
  },
  (table) => [
    index("music_sources_enabled_idx").on(table.enabled),
    index("music_sources_sort_order_idx").on(table.sortOrder),
    uniqueIndex("music_sources_name_idx").on(table.name),
  ],
);

export const musicSearchSources = pgTable(
  "music_search_sources",
  {
    id: text("id").primaryKey().$defaultFn(id),
    name: text("name").notNull(),
    provider: text("provider").notNull(),
    url: text("url").notNull(),
    version: text("version").notNull().default(""),
    enabled: boolean("enabled").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
    lastTestKeyword: text("last_test_keyword").notNull().default(""),
    lastTestOk: boolean("last_test_ok"),
    lastTestSearchable: boolean("last_test_searchable"),
    lastTestPlayable: boolean("last_test_playable"),
    lastTestLyric: boolean("last_test_lyric"),
    lastTestResultCount: integer("last_test_result_count").notNull().default(0),
    lastTestElapsedMs: integer("last_test_elapsed_ms").notNull().default(0),
    lastTestError: text("last_test_error").notNull().default(""),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(now),
  },
  (table) => [
    index("music_search_sources_enabled_idx").on(table.enabled),
    index("music_search_sources_sort_order_idx").on(table.sortOrder),
    uniqueIndex("music_search_sources_provider_idx").on(table.provider),
  ],
);

export const musicFavorites = pgTable(
  "music_favorites",
  {
    id: text("id").primaryKey().$defaultFn(id),
    itemKey: text("item_key").notNull(),
    itemKind: text("item_kind").notNull().default("track"),
    trackId: text("track_id").references(() => musicTracks.id, {
      onDelete: "set null",
    }),
    provider: text("provider").notNull().default("manual"),
    sourceSongId: text("source_song_id").notNull().default(""),
    title: text("title").notNull(),
    artist: text("artist").notNull().default("Unknown Artist"),
    album: text("album").notNull().default(""),
    coverUrl: text("cover_url").notNull().default(""),
    audioUrl: text("audio_url").notNull().default(""),
    lyric: text("lyric").notNull().default(""),
    quality: text("quality").notNull().default("320k"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(now),
  },
  (table) => [
    uniqueIndex("music_favorites_user_item_key_idx").on(
      table.createdBy,
      table.itemKey,
    ),
    index("music_favorites_created_by_idx").on(table.createdBy),
    index("music_favorites_created_at_idx").on(table.createdAt),
  ],
);

export const musicPlayHistory = pgTable(
  "music_play_history",
  {
    id: text("id").primaryKey().$defaultFn(id),
    itemKey: text("item_key").notNull(),
    itemKind: text("item_kind").notNull().default("track"),
    trackId: text("track_id").references(() => musicTracks.id, {
      onDelete: "set null",
    }),
    provider: text("provider").notNull().default("manual"),
    sourceSongId: text("source_song_id").notNull().default(""),
    title: text("title").notNull(),
    artist: text("artist").notNull().default("Unknown Artist"),
    album: text("album").notNull().default(""),
    coverUrl: text("cover_url").notNull().default(""),
    audioUrl: text("audio_url").notNull().default(""),
    lyric: text("lyric").notNull().default(""),
    quality: text("quality").notNull().default("320k"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    playedAt: timestamp("played_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("music_play_history_user_item_key_idx").on(
      table.createdBy,
      table.itemKey,
    ),
    index("music_play_history_created_by_idx").on(table.createdBy),
    index("music_play_history_played_at_idx").on(table.playedAt),
    index("music_play_history_user_played_at_idx").on(
      table.createdBy,
      table.playedAt,
    ),
  ],
);

export const musicDownloads = pgTable(
  "music_downloads",
  {
    id: text("id").primaryKey().$defaultFn(id),
    itemKey: text("item_key").notNull(),
    itemKind: text("item_kind").notNull().default("track"),
    trackId: text("track_id").references(() => musicTracks.id, {
      onDelete: "set null",
    }),
    provider: text("provider").notNull().default("manual"),
    sourceSongId: text("source_song_id").notNull().default(""),
    title: text("title").notNull(),
    artist: text("artist").notNull().default("Unknown Artist"),
    album: text("album").notNull().default(""),
    coverUrl: text("cover_url").notNull().default(""),
    coverObjectKey: text("cover_object_key").notNull().default(""),
    audioUrl: text("audio_url").notNull().default(""),
    audioObjectKey: text("audio_object_key").notNull().default(""),
    lyric: text("lyric").notNull().default(""),
    quality: text("quality").notNull().default("320k"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    downloadedAt: timestamp("downloaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("music_downloads_user_item_key_idx").on(
      table.createdBy,
      table.itemKey,
    ),
    index("music_downloads_created_by_idx").on(table.createdBy),
    index("music_downloads_downloaded_at_idx").on(table.downloadedAt),
    index("music_downloads_user_downloaded_at_idx").on(
      table.createdBy,
      table.downloadedAt,
    ),
  ],
);

export const musicPlaylists = pgTable(
  "music_playlists",
  {
    id: text("id").primaryKey().$defaultFn(id),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    coverUrl: text("cover_url").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(now),
  },
  (table) => [
    index("music_playlists_created_by_idx").on(table.createdBy),
    index("music_playlists_sort_order_idx").on(table.sortOrder),
    index("music_playlists_updated_at_idx").on(table.updatedAt),
  ],
);

export const musicPlaylistItems = pgTable(
  "music_playlist_items",
  {
    id: text("id").primaryKey().$defaultFn(id),
    playlistId: text("playlist_id")
      .notNull()
      .references(() => musicPlaylists.id, { onDelete: "cascade" }),
    itemKey: text("item_key").notNull(),
    itemKind: text("item_kind").notNull().default("track"),
    trackId: text("track_id").references(() => musicTracks.id, {
      onDelete: "set null",
    }),
    provider: text("provider").notNull().default("manual"),
    sourceSongId: text("source_song_id").notNull().default(""),
    title: text("title").notNull(),
    artist: text("artist").notNull().default("Unknown Artist"),
    album: text("album").notNull().default(""),
    coverUrl: text("cover_url").notNull().default(""),
    audioUrl: text("audio_url").notNull().default(""),
    lyric: text("lyric").notNull().default(""),
    quality: text("quality").notNull().default("320k"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("music_playlist_items_playlist_item_key_idx").on(
      table.playlistId,
      table.itemKey,
    ),
    index("music_playlist_items_playlist_id_idx").on(table.playlistId),
    index("music_playlist_items_sort_order_idx").on(
      table.playlistId,
      table.sortOrder,
    ),
  ],
);

export const moments = pgTable("moments", {
  id: text("id").primaryKey().$defaultFn(id),
  body: text("body").notNull(),
  location: text("location"),
  accent: text("accent").notNull().default("mint"),
  published: boolean("published").notNull().default(true),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

export type Post = typeof posts.$inferSelect;
export type Moment = typeof moments.$inferSelect;
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type MusicTrack = typeof musicTracks.$inferSelect;
export type MusicSource = typeof musicSources.$inferSelect;
export type MusicSearchSource = typeof musicSearchSources.$inferSelect;
export type MusicFavorite = typeof musicFavorites.$inferSelect;
export type MusicPlayHistory = typeof musicPlayHistory.$inferSelect;
export type MusicDownload = typeof musicDownloads.$inferSelect;
export type MusicPlaylist = typeof musicPlaylists.$inferSelect;
export type MusicPlaylistItem = typeof musicPlaylistItems.$inferSelect;
