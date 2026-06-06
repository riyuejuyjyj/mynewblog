ALTER TABLE "music_search_sources" ADD COLUMN "last_tested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "music_search_sources" ADD COLUMN "last_test_keyword" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "music_search_sources" ADD COLUMN "last_test_ok" boolean;--> statement-breakpoint
ALTER TABLE "music_search_sources" ADD COLUMN "last_test_searchable" boolean;--> statement-breakpoint
ALTER TABLE "music_search_sources" ADD COLUMN "last_test_playable" boolean;--> statement-breakpoint
ALTER TABLE "music_search_sources" ADD COLUMN "last_test_lyric" boolean;--> statement-breakpoint
ALTER TABLE "music_search_sources" ADD COLUMN "last_test_result_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "music_search_sources" ADD COLUMN "last_test_elapsed_ms" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "music_search_sources" ADD COLUMN "last_test_error" text DEFAULT '' NOT NULL;