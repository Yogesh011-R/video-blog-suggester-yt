ALTER TABLE "chunks" ALTER COLUMN "embedding" SET DATA TYPE vector(1024);--> statement-breakpoint
ALTER TABLE "content" ALTER COLUMN "thumbnail_url" SET NOT NULL;