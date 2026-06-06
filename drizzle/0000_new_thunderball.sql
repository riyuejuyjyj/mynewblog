CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp with time zone,
	"refreshTokenExpiresAt" timestamp with time zone,
	"scope" text,
	"password" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" text PRIMARY KEY NOT NULL,
	"post_slug" text NOT NULL,
	"body" text NOT NULL,
	"author_name" text NOT NULL,
	"author_email" text NOT NULL,
	"author_url" text,
	"author_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"bucket" text NOT NULL,
	"object_key" text NOT NULL,
	"folder" text DEFAULT 'uploads' NOT NULL,
	"public_url" text,
	"content_type" text NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"alt_text" text,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moments" (
	"id" text PRIMARY KEY NOT NULL,
	"body" text NOT NULL,
	"location" text,
	"accent" text DEFAULT 'mint' NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"content" text NOT NULL,
	"coverImage" text NOT NULL,
	"category" text DEFAULT 'essay' NOT NULL,
	"mood" text DEFAULT 'quiet' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"readingMinutes" integer DEFAULT 4 NOT NULL,
	"viewCount" integer DEFAULT 0 NOT NULL,
	"likeCount" integer DEFAULT 0 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"authorId" text,
	"publishedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_authorId_user_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "comments_post_slug_idx" ON "comments" USING btree ("post_slug");--> statement-breakpoint
CREATE INDEX "comments_status_idx" ON "comments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "comments_created_at_idx" ON "comments" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_bucket_key_idx" ON "media_assets" USING btree ("bucket","object_key");--> statement-breakpoint
CREATE INDEX "media_assets_uploaded_by_idx" ON "media_assets" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "media_assets_created_at_idx" ON "media_assets" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "posts_published_at_idx" ON "posts" USING btree ("publishedAt");--> statement-breakpoint
CREATE INDEX "posts_author_id_idx" ON "posts" USING btree ("authorId");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");
