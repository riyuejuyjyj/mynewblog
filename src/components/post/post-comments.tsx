"use client";

import { CheckCircle2, MessageCircle, Send } from "lucide-react";
import { useState, type FormEvent } from "react";

import type { PublicComment } from "@/lib/blog-data";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";

type PostCommentsProps = {
  initialComments: PublicComment[];
  postSlug: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function PostComments({ initialComments, postSlug }: PostCommentsProps) {
  const utils = trpc.useUtils();
  const commentsQuery = trpc.comments.byPost.useQuery(
    { postSlug, limit: 50 },
    { initialData: initialComments },
  );
  const createComment = trpc.comments.create.useMutation({
    onSuccess: async () => {
      setName("");
      setEmail("");
      setUrl("");
      setBody("");
      setSubmitted(true);
      await utils.comments.byPost.invalidate({ postSlug, limit: 50 });
      await utils.comments.recent.invalidate();
    },
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [body, setBody] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(false);

    createComment.mutate({
      authorEmail: email,
      authorName: name,
      authorUrl: url,
      body,
      postSlug,
    });
  }

  const comments = commentsQuery.data ?? initialComments;

  return (
    <section className="relative z-10 mx-auto mt-6 grid w-full max-w-6xl gap-6 lg:grid-cols-[0.88fr_1.12fr]">
      <div className="rounded-[1.6rem] border border-white/45 bg-white/58 p-5 shadow-xl shadow-slate-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/58 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-coral-100 text-coral-700 dark:bg-coral-400/15 dark:text-coral-200">
            <MessageCircle className="size-6" />
          </span>
          <div>
            <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-300">
              Comment
            </p>
            <h2 className="text-2xl font-black tracking-[0]">留下回声</h2>
          </div>
        </div>

        {submitted ? (
          <p className="mt-5 flex items-center gap-2 rounded-2xl bg-emerald-100 px-4 py-3 text-sm font-black text-emerald-950 dark:bg-emerald-400/15 dark:text-emerald-100">
            <CheckCircle2 className="size-4" />
            评论已提交，审核通过后会显示在这里。
          </p>
        ) : null}

        <form onSubmit={submitComment} className="mt-6 space-y-3">
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="昵称"
            className="studio-input"
          />
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="邮箱，不会公开"
            className="studio-input"
          />
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="个人链接，可选"
            className="studio-input"
          />
          <textarea
            required
            rows={5}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="写点什么..."
            className="studio-input resize-none leading-7"
          />
          <Button
            className="w-full"
            disabled={createComment.isPending}
            type="submit"
          >
            <Send className="size-4" />
            {createComment.isPending ? "发送中..." : "提交评论"}
          </Button>
        </form>
      </div>

      <div className="rounded-[1.6rem] border border-white/45 bg-white/58 p-5 shadow-xl shadow-slate-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/58 sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-coral-700 dark:text-coral-200">
              Reader Notes
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-[0]">评论</h2>
          </div>
          <span className="rounded-full bg-white/45 px-3 py-1 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-300">
            {comments.length}
          </span>
        </div>

        <div className="mt-6 space-y-4">
          {comments.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-white/45 p-8 text-center text-sm font-bold text-slate-400 dark:border-white/10">
              还没有通过审核的评论，等第一声回响。
            </p>
          ) : null}

          {comments.map((comment) => (
            <article
              key={comment.id}
              className="rounded-[1.35rem] border border-white/45 bg-white/42 p-5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/10"
            >
              <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>{comment.authorName}</span>
                <span>{formatDate(comment.createdAt)}</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-200">
                {comment.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
