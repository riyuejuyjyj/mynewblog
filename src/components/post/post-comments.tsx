"use client";

import {
  CheckCircle2,
  CornerDownRight,
  MessageCircle,
  Send,
  X,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import type { PublicComment } from "@/lib/blog-data";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";

type PostCommentsProps = {
  initialComments: PublicComment[];
  postSlug: string;
};

type CommentNode = PublicComment & {
  replies: CommentNode[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function getAvatarLabel(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed ? Array.from(trimmed)[0].toUpperCase() : fallback;
}

function buildCommentTree(comments: PublicComment[]) {
  const nodes = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const comment of comments) {
    nodes.set(comment.id, {
      ...comment,
      replies: [],
    });
  }

  for (const comment of comments) {
    const node = nodes.get(comment.id);

    if (!node) {
      continue;
    }

    const parent = comment.parentId ? nodes.get(comment.parentId) : null;

    if (parent) {
      parent.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export function PostComments({ initialComments, postSlug }: PostCommentsProps) {
  const utils = trpc.useUtils();
  const commentsQuery = trpc.comments.byPost.useQuery(
    { postSlug, limit: 50 },
    { initialData: initialComments },
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [body, setBody] = useState("");
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [commentComposerOpen, setCommentComposerOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const createComment = trpc.comments.create.useMutation({
    onSuccess: async () => {
      setUrl("");
      setBody("");
      setReplyTargetId(null);
      setCommentComposerOpen(false);
      setSubmitted(true);
      await utils.comments.byPost.invalidate({ postSlug, limit: 50 });
      await utils.comments.recent.invalidate();
    },
  });

  const comments = commentsQuery.data ?? initialComments;
  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);
  const replyTarget =
    comments.find((comment) => comment.id === replyTargetId) ?? null;

  function startReply(comment: PublicComment) {
    setReplyTargetId(comment.id);
    setCommentComposerOpen(false);
    setBody("");
    setSubmitted(false);
  }

  function cancelComposer() {
    setReplyTargetId(null);
    setCommentComposerOpen(false);
    setBody("");
  }

  function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(false);

    createComment.mutate({
      authorEmail: email,
      authorName: name,
      authorUrl: url,
      body,
      parentId: replyTargetId,
      postSlug,
    });
  }

  function renderComposer(compact = false) {
    const expanded = compact || commentComposerOpen || body.trim().length > 0;
    const isReply = Boolean(replyTarget);

    return (
      <form
        onSubmit={submitComment}
        className={cn(
          "flex gap-3",
          compact
            ? "rounded-2xl bg-white/34 px-3 py-3 dark:bg-white/8"
            : "mt-5",
        )}
      >
        <span className="mt-1 grid size-9 shrink-0 place-items-center rounded-full bg-slate-950 text-sm font-black text-white shadow-sm dark:bg-white dark:text-slate-950">
          {getAvatarLabel(name, isReply ? "回" : "评")}
        </span>

        <div className="min-w-0 flex-1">
          {replyTarget ? (
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs font-black text-slate-500 dark:text-slate-300">
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <CornerDownRight className="size-3.5 shrink-0 text-coral-500" />
                <span className="min-w-0 truncate">
                  回复 {replyTarget.authorName}
                </span>
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-slate-500 transition hover:bg-white/55 hover:text-slate-950 dark:hover:bg-white/10 dark:hover:text-white"
                onClick={cancelComposer}
              >
                <X className="size-3.5" />
                取消
              </button>
            </div>
          ) : null}

          <textarea
            required
            rows={expanded ? (compact ? 2 : 3) : 1}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onFocus={() => setCommentComposerOpen(true)}
            placeholder={
              isReply ? `回复 ${replyTarget?.authorName ?? "这条评论"}` : "添加评论..."
            }
            className={cn(
              "w-full resize-none bg-transparent px-0 py-2 text-sm font-semibold leading-6 outline-none transition placeholder:text-slate-500 dark:placeholder:text-slate-400",
              "border-b border-slate-300/80 focus:border-slate-950 dark:border-white/20 dark:focus:border-white",
              expanded ? "min-h-20" : "h-10 overflow-hidden",
            )}
          />

          {expanded ? (
            <>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="昵称"
                  className="studio-input h-10 rounded-xl px-3 py-2 text-sm"
                />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="邮箱，不会公开"
                  className="studio-input h-10 rounded-xl px-3 py-2 text-sm"
                />
                <input
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="个人链接，可选"
                  className="studio-input h-10 rounded-xl px-3 py-2 text-sm sm:col-span-2"
                />
              </div>

              <div className="mt-3 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={cancelComposer}
                >
                  取消
                </Button>
                <Button
                  disabled={createComment.isPending || body.trim().length === 0}
                  size="sm"
                  type="submit"
                >
                  <Send className="size-4" />
                  {createComment.isPending
                    ? "发送中..."
                    : isReply
                      ? "回复"
                      : "评论"}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </form>
    );
  }

  function renderComment(comment: CommentNode, depth = 0) {
    const isReplying = replyTargetId === comment.id;

    return (
      <article
        key={comment.id}
        className={cn(
          "group",
          depth > 0
            ? "border-l border-slate-200/80 pl-4 dark:border-white/12"
            : "",
        )}
      >
        <div className="flex gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/58 text-sm font-black text-slate-700 shadow-sm ring-1 ring-white/55 dark:bg-white/12 dark:text-slate-100 dark:ring-white/10">
            {getAvatarLabel(comment.authorName, "访")}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                {comment.authorName}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {formatDate(comment.createdAt)}
              </span>
            </div>

            <p className="mt-1.5 text-sm leading-7 text-slate-700 dark:text-slate-200">
              {comment.body}
            </p>

            <div className="mt-1.5 flex items-center gap-2">
              <Button
                type="button"
                variant={isReplying ? "soft" : "ghost"}
                size="sm"
                onClick={() => startReply(comment)}
              >
                回复
              </Button>
            </div>

            {isReplying ? (
              <div className="mt-2">{renderComposer(true)}</div>
            ) : null}

            {comment.replies.length > 0 ? (
              <div className="mt-4 space-y-4">
                {comment.replies.map((reply) => renderComment(reply, depth + 1))}
              </div>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  return (
    <section
      id="comments"
      className="relative z-10 mx-auto mt-6 w-full max-w-6xl rounded-[1.25rem] border border-white/40 bg-white/46 p-4 shadow-xl shadow-slate-950/8 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/44 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-coral-100 text-coral-700 dark:bg-coral-400/15 dark:text-coral-200">
            <MessageCircle className="size-5" />
          </span>
          <h2 className="text-xl font-black tracking-[0]">评论</h2>
        </div>

        <span className="rounded-full bg-white/55 px-3 py-1 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-300">
          {comments.length} 条
        </span>
      </div>

      {submitted ? (
        <p
          className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-100 px-3 py-2 text-sm font-black text-emerald-950 dark:bg-emerald-400/15 dark:text-emerald-100"
          aria-live="polite"
        >
          <CheckCircle2 className="size-4" />
          内容已提交，审核通过后会显示在这里。
        </p>
      ) : null}

      {!replyTarget ? renderComposer() : null}

      <div className="mt-6 space-y-5 border-t border-white/40 pt-5 dark:border-white/10">
        {comments.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/45 p-6 text-center text-sm font-bold text-slate-400 dark:border-white/10">
            还没有评论，来写第一条。
          </p>
        ) : null}

        {commentTree.map((comment) => renderComment(comment))}
      </div>
    </section>
  );
}
