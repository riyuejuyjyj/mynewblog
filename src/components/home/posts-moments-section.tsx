"use client";

import { Heart, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { HomeCopy } from "@/components/home/copy";
import {
  HoverArticle,
  HoverLift,
  Reveal,
} from "@/components/home/motion-primitives";
import type { DisplayMoment, DisplayPost } from "@/components/home/types";
import { Badge } from "@/components/ui/badge";

type PostsMomentsSectionProps = {
  formatDate: (value: string) => string;
  moments: DisplayMoment[];
  posts: DisplayPost[];
  t: HomeCopy;
};

export function PostsMomentsSection({
  formatDate,
  moments,
  posts,
  t,
}: PostsMomentsSectionProps) {
  return (
    <section
      id="posts"
      className="relative z-10 mx-auto mt-6 grid w-full max-w-7xl grid-cols-1 gap-6 lg:grid-cols-12"
    >
      <Reveal className="glass-panel p-6 lg:col-span-8">
        <div>
          <div>
            <p className="text-sm font-bold text-coral-700 dark:text-coral-200">
              {t.latestPosts}
            </p>
            <h2 className="mt-1 text-3xl font-black tracking-[0]">
              {t.recentNotes}
            </h2>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {posts.slice(0, 4).map((post, index) => (
            <Reveal key={post.id} delay={0.12 + index * 0.11}>
              <HoverArticle className="group overflow-hidden rounded-3xl border border-white/45 bg-white/35 shadow-lg shadow-slate-900/10 backdrop-blur-md transition-colors duration-500 hover:bg-white/55 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15">
                <Link href={`/posts/${post.slug}`} className="block">
                  <div className="relative h-40 overflow-hidden">
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                    <div className="absolute left-4 top-4">
                      <Badge className="bg-white/70">{post.category}</Badge>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-300">
                      <span>{formatDate(post.publishedAt)}</span>
                      <span>
                        {post.readingMinutes} {t.minutes}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Heart className="size-3" />
                        {post.likeCount}
                      </span>
                    </div>
                    <h3 className="mt-3 text-xl font-black leading-snug tracking-[0]">
                      {post.title}
                    </h3>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {post.excerpt}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-slate-950/5 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              </HoverArticle>
            </Reveal>
          ))}
        </div>
      </Reveal>

      <Reveal id="moments" className="glass-panel p-6 lg:col-span-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-200">
              {t.moments}
            </p>
            <h2 className="mt-1 text-3xl font-black tracking-[0]">
              {t.smallRecords}
            </h2>
          </div>
          <MessageCircle className="size-7 text-emerald-500" />
        </div>

        <div className="mt-6 space-y-4">
          {moments.map((moment, index) => (
            <Reveal key={moment.id} delay={0.1 + index * 0.1}>
              <HoverLift className="rounded-3xl border border-white/45 bg-white/35 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/10">
                <p className="text-sm leading-7 text-slate-700 dark:text-slate-200">
                  {moment.body}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>{moment.location}</span>
                  <span>{formatDate(moment.createdAt)}</span>
                </div>
              </HoverLift>
            </Reveal>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
