CREATE TABLE "music_search_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"provider" text NOT NULL,
	"url" text NOT NULL,
	"version" text DEFAULT '' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "music_search_sources" ADD CONSTRAINT "music_search_sources_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "music_search_sources_enabled_idx" ON "music_search_sources" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "music_search_sources_sort_order_idx" ON "music_search_sources" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "music_search_sources_provider_idx" ON "music_search_sources" USING btree ("provider");