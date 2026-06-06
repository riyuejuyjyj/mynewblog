"use client";

import { MessageCircle, Send } from "lucide-react";
import type { FormEvent } from "react";

import type { HomeCopy } from "@/components/home/copy";
import { HoverLift, Reveal } from "@/components/home/motion-primitives";
import type { DisplayComment, DisplayPost } from "@/components/home/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type CommentsSectionProps = {
  commentBody: string;
  commentEmail: string;
  commentName: string;
  comments: DisplayComment[];
  featured: DisplayPost;
  formatDate: (value: string) => string;
  isPending: boolean;
  onBodyChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  t: HomeCopy;
};

export function CommentsSection({
  commentBody,
  commentEmail,
  commentName,
  comments,
  featured,
  formatDate,
  isPending,
  onBodyChange,
  onEmailChange,
  onNameChange,
  onSubmit,
  t,
}: CommentsSectionProps) {
  return (
    <section
      id="comments"
      className="relative z-10 mx-auto mt-6 grid w-full max-w-7xl grid-cols-1 gap-6 lg:grid-cols-12"
    >
      <Reveal className="glass-panel p-6 lg:col-span-5">
        <div className="flex items-center gap-3">
          <MessageCircle className="size-7 text-emerald-500" />
          <div>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-200">
              {t.commentSystem}
            </p>
            <h2 className="text-3xl font-black tracking-[0]">{t.sayHello}</h2>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input
            value={commentName}
            onChange={(event) => onNameChange(event.target.value)}
            required
            placeholder={t.name}
            className="w-full rounded-2xl border border-white/45 bg-white/50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-coral-400 dark:border-white/10 dark:bg-white/10"
          />
          <input
            value={commentEmail}
            onChange={(event) => onEmailChange(event.target.value)}
            required
            type="email"
            placeholder={t.email}
            className="w-full rounded-2xl border border-white/45 bg-white/50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-coral-400 dark:border-white/10 dark:bg-white/10"
          />
          <textarea
            value={commentBody}
            onChange={(event) => onBodyChange(event.target.value)}
            required
            placeholder={`${t.commentOn} "${featured.title}"`}
            rows={5}
            className="w-full resize-none rounded-2xl border border-white/45 bg-white/50 px-4 py-3 text-sm font-semibold leading-6 outline-none transition focus:border-coral-400 dark:border-white/10 dark:bg-white/10"
          />
          <Button type="submit" disabled={isPending} className="w-full">
            <Send className="size-4" />
            {isPending ? t.sending : t.postComment}
          </Button>
        </form>
      </Reveal>

      <Reveal className="glass-panel p-6 lg:col-span-7">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-coral-700 dark:text-coral-200">
              {t.recentVoices}
            </p>
            <h2 className="mt-1 text-3xl font-black tracking-[0]">
              {t.readerNotes}
            </h2>
          </div>
          <Badge>
            {comments.length} {t.live}
          </Badge>
        </div>

        <div className="mt-6 grid gap-4">
          {comments.map((comment, index) => (
            <Reveal key={comment.id} delay={0.08 + index * 0.1}>
              <HoverLift className="rounded-3xl border border-white/45 bg-white/35 p-5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/10">
                <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>{comment.authorName}</span>
                  <span>{formatDate(comment.createdAt)}</span>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-200">
                  {comment.body}
                </p>
              </HoverLift>
            </Reveal>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
