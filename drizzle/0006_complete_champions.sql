ALTER TABLE "music_downloads" ADD COLUMN "audio_object_key" text DEFAULT '' NOT NULL;--> statement-breakpoint
DELETE FROM "music_play_history"
WHERE "id" IN (
  SELECT "id"
  FROM (
    SELECT
      "id",
      row_number() OVER (
        PARTITION BY "created_by", "item_key"
        ORDER BY "played_at" DESC, "id" DESC
      ) AS duplicate_rank
    FROM "music_play_history"
  ) ranked_history
  WHERE duplicate_rank > 1
);--> statement-breakpoint
CREATE UNIQUE INDEX "music_play_history_user_item_key_idx" ON "music_play_history" USING btree ("created_by","item_key");
