"use client";

import {
  CheckCircle2,
  CornerDownRight,
  MessageCircle,
  Send,
  X,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
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

type FlatReply = {
  comment: CommentNode;
  replyToName: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
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

    if (!node) continue;

    const parent = comment.parentId ? nodes.get(comment.parentId) : null;

    if (parent) {
      parent.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function flattenReplies(comment: CommentNode): FlatReply[] {
  const replies: FlatReply[] = [];

  for (const reply of comment.replies) {
    replies.push({
      comment: reply,
      replyToName: comment.authorName,
    });
    replies.push(...flattenReplies(reply));
  }

  return replies;
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
  const [showMobileUrlField, setShowMobileUrlField] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const createComment = trpc.comments.create.useMutation({
    onSuccess: async () => {
      setUrl("");
      setBody("");
      setReplyTargetId(null);
      setCommentComposerOpen(false);
      setShowMobileUrlField(false);
      setErrorMessage("");
      setSubmitted(true);
      await utils.comments.byPost.invalidate({ postSlug, limit: 50 });
      await utils.comments.recent.invalidate();
    },
    onError: (error) => {
      setSubmitted(false);
      setErrorMessage(error.message || "提交失败，请检查昵称、邮箱和内容后重试。");
    },
  });

  const comments = commentsQuery.data ?? initialComments;
  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);
  const replyTarget =
    comments.find((comment) => comment.id === replyTargetId) ?? null;

  function startReply(comment: PublicComment) {
    setReplyTargetId(comment.id);
    setCommentComposerOpen(false);
    setShowMobileUrlField(false);
    setUrl("");
    setBody("");
    setSubmitted(false);
    setErrorMessage("");
  }

  function cancelComposer() {
    setReplyTargetId(null);
    setCommentComposerOpen(false);
    setShowMobileUrlField(false);
    setUrl("");
    setBody("");
    setErrorMessage("");
  }

  function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(false);
    setErrorMessage("");

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
            ? "rounded-2xl bg-surface-muted/80 p-3 dark:bg-white/[0.04]"
            : "mt-4",
        )}
      >
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-accent-500 text-xs font-bold text-white shadow-sm">
          {getAvatarLabel(name, isReply ? "回" : "评")}
        </span>

        <div className="min-w-0 flex-1">
          {replyTarget ? (
            <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-slate-500 dark:text-slate-300">
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <CornerDownRight className="size-3.5 shrink-0 text-accent-500" />
                <span className="truncate">回复 {replyTarget.authorName}</span>
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-slate-400 transition hover:bg-white/70 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-white"
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
              isReply ? `回复 ${replyTarget?.authorName ?? "这条评论"}...` : "写下一条温柔的评论..."
            }
            className={cn(
              "studio-input resize-none rounded-xl text-sm leading-6",
              expanded ? "min-h-20" : "h-10 overflow-hidden py-2",
            )}
          />

          {expanded ? (
            <>
              <div className="mt-2.5 grid gap-2 md:grid-cols-2">
                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="昵称"
                  className="studio-input h-9 rounded-xl px-3 text-sm"
                />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="邮箱（不会公开）"
                  className="studio-input h-9 rounded-xl px-3 text-sm"
                />
                <input
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="个人主页链接（可选）"
                  className="studio-input hidden h-9 rounded-xl px-3 text-sm md:col-span-2 md:block"
                />
                {showMobileUrlField ? (
                  <input
                    type="url"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="个人主页链接（可选）"
                    className="studio-input h-9 rounded-xl px-3 text-sm md:hidden"
                  />
                ) : (
                  <button
                    type="button"
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-dashed border-slate-300 px-3 text-xs font-medium text-slate-500 transition hover:border-accent-300 hover:text-accent-600 dark:border-white/15 dark:text-slate-400 md:hidden"
                    onClick={() => setShowMobileUrlField(true)}
                  >
                    添加个人链接（可选）
                  </button>
                )}
              </div>

              <div className="mt-3 flex flex-wrap justify-end gap-2">
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
                  <Send className="size-3.5" />
                  {createComment.isPending
                    ? "发送中..."
                    : isReply
                      ? "发表回复"
                      : "发表评论"}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </form>
    );
  }

  function renderComment(comment: CommentNode, replyToName?: string) {
    const isReplying = replyTargetId === comment.id;

    return (
      <article key={comment.id} className="group">
        <div className="flex gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-100 text-xs font-bold text-accent-700 dark:bg-accent-500/20 dark:text-accent-200 sm:size-9">
            {getAvatarLabel(comment.authorName, "访")}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {comment.authorName}
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {formatDate(comment.createdAt)}
              </span>
              {replyToName ? (
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-white/8 dark:text-slate-300">
                  回复 {replyToName}
                </span>
              ) : null}
            </div>

            <p className="mt-1.5 break-words text-sm leading-7 text-slate-700 dark:text-slate-200">
              {comment.body}
            </p>

            <div className="mt-1.5">
              <button
                type="button"
                onClick={() => startReply(comment)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition",
                  isReplying
                    ? "bg-accent-100 text-accent-700 dark:bg-accent-500/20 dark:text-accent-200"
                    : "text-slate-400 hover:bg-surface-muted hover:text-accent-600 dark:hover:bg-white/8 dark:hover:text-accent-300",
                )}
              >
                回复
              </button>
            </div>

            {isReplying ? (
              <div className="mt-2.5">{renderComposer(true)}</div>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  return (
    <section
      id="comments"
      className="anime-card scroll-mt-24 p-5 sm:p-7"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-100 text-accent-600 dark:bg-accent-500/20 dark:text-accent-200">
            <MessageCircle className="size-4" />
          </span>
          <div>
            <h2 className="font-serif text-lg font-bold">读者评论</h2>
          </div>
        </div>
        <Badge>{comments.length} 条</Badge>
      </div>

      {submitted ? (
        <p
          className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
          aria-live="polite"
        >
          <CheckCircle2 className="size-4 shrink-0" />
          评论已提交，审核通过后会显示在这里。
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700 dark:bg-rose-500/15 dark:text-rose-200">
          {errorMessage}
        </p>
      ) : null}

      {!replyTarget ? renderComposer() : null}

      <div className="mt-6 space-y-5 border-t border-slate-100 pt-5 dark:border-white/8">
        {comments.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-white/10">
            还没有评论，来写下第一条吧。
          </p>
        ) : null}

        {commentTree.map((comment) => {
          const replies = flattenReplies(comment);

          return (
            <div className="space-y-4" key={comment.id}>
              {renderComment(comment)}
              {replies.length > 0 ? (
                <div className="ml-4 space-y-4 border-l-2 border-accent-200/70 pl-4 dark:border-accent-500/25 sm:ml-6">
                  {replies.map((reply) =>
                    renderComment(reply.comment, reply.replyToName),
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
