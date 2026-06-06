CREATE TABLE "music_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'lx' NOT NULL,
	"provider_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_code" text DEFAULT '' NOT NULL,
	"source_path" text DEFAULT '' NOT NULL,
	"version" text DEFAULT '' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "music_sources" ADD CONSTRAINT "music_sources_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "music_sources_enabled_idx" ON "music_sources" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "music_sources_sort_order_idx" ON "music_sources" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "music_sources_name_idx" ON "music_sources" USING btree ("name");