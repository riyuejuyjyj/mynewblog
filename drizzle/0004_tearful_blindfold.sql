CREATE TABLE "music_favorites" (
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
	"audio_url" text DEFAULT '' NOT NULL,
	"lyric" text DEFAULT '' NOT NULL,
	"quality" text DEFAULT '320k' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "music_play_history" (
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
	"audio_url" text DEFAULT '' NOT NULL,
	"lyric" text DEFAULT '' NOT NULL,
	"quality" text DEFAULT '320k' NOT NULL,
	"created_by" text NOT NULL,
	"played_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "music_favorites" ADD CONSTRAINT "music_favorites_track_id_music_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."music_tracks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_favorites" ADD CONSTRAINT "music_favorites_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_play_history" ADD CONSTRAINT "music_play_history_track_id_music_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."music_tracks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_play_history" ADD CONSTRAINT "music_play_history_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "music_favorites_user_item_key_idx" ON "music_favorites" USING btree ("created_by","item_key");--> statement-breakpoint
CREATE INDEX "music_favorites_created_by_idx" ON "music_favorites" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "music_favorites_created_at_idx" ON "music_favorites" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "music_play_history_created_by_idx" ON "music_play_history" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "music_play_history_played_at_idx" ON "music_play_history" USING btree ("played_at");--> statement-breakpoint
CREATE INDEX "music_play_history_user_played_at_idx" ON "music_play_history" USING btree ("created_by","played_at");