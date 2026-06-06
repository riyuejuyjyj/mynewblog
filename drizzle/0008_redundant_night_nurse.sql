CREATE TABLE "music_playlist_items" (
	"id" text PRIMARY KEY NOT NULL,
	"playlist_id" text NOT NULL,
	"item_key" text NOT NULL,
	"item_kind" text DEFAULT 'track' NOT NULL,
	"track_id" text,
	"provider" text DEFAULT 'manual' NOT NULL,
	"source_song_id" text DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"artist" text DEFAULT 'Unknown Artist' NOT NULL,
	"album" text DEFAULT '' NOT NULL,
	"cover_url" text DEFAULT '' NOT NULL,
	"audio_url" text DEFAULT '' NOT NULL,
	"lyric" text DEFAULT '' NOT NULL,
	"quality" text DEFAULT '320k' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "music_playlists" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"cover_url" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "music_playlist_items" ADD CONSTRAINT "music_playlist_items_playlist_id_music_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."music_playlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_playlist_items" ADD CONSTRAINT "music_playlist_items_track_id_music_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."music_tracks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_playlists" ADD CONSTRAINT "music_playlists_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "music_playlist_items_playlist_item_key_idx" ON "music_playlist_items" USING btree ("playlist_id","item_key");--> statement-breakpoint
CREATE INDEX "music_playlist_items_playlist_id_idx" ON "music_playlist_items" USING btree ("playlist_id");--> statement-breakpoint
CREATE INDEX "music_playlist_items_sort_order_idx" ON "music_playlist_items" USING btree ("playlist_id","sort_order");--> statement-breakpoint
CREATE INDEX "music_playlists_created_by_idx" ON "music_playlists" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "music_playlists_sort_order_idx" ON "music_playlists" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "music_playlists_updated_at_idx" ON "music_playlists" USING btree ("updated_at");