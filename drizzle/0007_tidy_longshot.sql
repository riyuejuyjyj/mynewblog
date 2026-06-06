DELETE FROM "music_downloads"
WHERE "id" IN (
  SELECT "id"
  FROM (
    SELECT
      "id",
      row_number() OVER (
        PARTITION BY "created_by", "item_key"
        ORDER BY "downloaded_at" DESC, "id" DESC
      ) AS duplicate_rank
    FROM "music_downloads"
  ) ranked_downloads
  WHERE duplicate_rank > 1
);--> statement-breakpoint
CREATE UNIQUE INDEX "music_downloads_user_item_key_idx" ON "music_downloads" USING btree ("created_by","item_key");
