CREATE TABLE "music_downloads" (
	"id" text PRIMARY KEY NOT NULL,
	"item_key" text NOT NULL,
	"item_kind" text DEFAULT 'track' NOT NULL,
	"track_id" text,
	"provider" text DEFAULT 'manual' NOT NULL,
	"source_song_id" text DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"artist" text DEFAULT 'Unknown Artist' NOT NULL,
	"album" text DEFAULT '' NOT NULL,
	"cover_url" text DEFAULT '' NOT NULL,
	"cover_object_key" text DEFAULT '' NOT NULL,
	"audio_url" text DEFAULT '' NOT NULL,
	"lyric" text DEFAULT '' NOT NULL,
	"quality" text DEFAULT '320k' NOT NULL,
	"created_by" text NOT NULL,
	"downloaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "music_downloads" ADD CONSTRAINT "music_downloads_track_id_music_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."music_tracks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_downloads" ADD CONSTRAINT "music_downloads_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "music_downloads_created_by_idx" ON "music_downloads" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "music_downloads_downloaded_at_idx" ON "music_downloads" USING btree ("downloaded_at");--> statement-breakpoint
CREATE INDEX "music_downloads_user_downloaded_at_idx" ON "music_downloads" USING btree ("created_by","downloaded_at");