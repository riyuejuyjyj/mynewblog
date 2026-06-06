import { blogRouter } from "@/server/routers/blog";
import { commentsRouter } from "@/server/routers/comments";
import { musicRouter } from "@/server/routers/music";
import { storageRouter } from "@/server/routers/storage";
import { studioRouter } from "@/server/routers/studio";
import { createTRPCRouter } from "@/server/trpc";

export const appRouter = createTRPCRouter({
  blog: blogRouter,
  comments: commentsRouter,
  music: musicRouter,
  storage: storageRouter,
  studio: studioRouter,
});

export type AppRouter = typeof appRouter;
