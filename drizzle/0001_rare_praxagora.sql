CREATE TABLE "music_tracks" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"artist" text DEFAULT 'Unknown Artist' NOT NULL,
	"album" text DEFAULT '' NOT NULL,
	"cover_url" text DEFAULT '' NOT NULL,
	"audio_url" text NOT NULL,
	"lyric" text DEFAULT '' NOT NULL,
	"provider" text DEFAULT 'manual' NOT NULL,
	"source_song_id" text DEFAULT '' NOT NULL,
	"quality" text DEFAULT '320k' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "music_tracks" ADD CONSTRAINT "music_tracks_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "music_tracks_enabled_idx" ON "music_tracks" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "music_tracks_sort_order_idx" ON "music_tracks" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "music_tracks_created_at_idx" ON "music_tracks" USING btree ("created_at");