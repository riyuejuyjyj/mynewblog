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
  const [submitted, setSubmitted] = useState(false);

  const createComment = trpc.comments.create.useMutation({
    onSuccess: async () => {
      setUrl("");
      setBody("");
      setReplyTargetId(null);
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
    setBody("");
    setSubmitted(false);
  }

  function cancelReply() {
    setReplyTargetId(null);
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
    return (
      <form
        onSubmit={submitComment}
        className={cn(
          "space-y-3",
          compact
            ? "rounded-[1.25rem] border border-coral-200/70 bg-coral-50/72 p-4 shadow-inner dark:border-coral-200/15 dark:bg-coral-400/10"
            : "mt-6",
        )}
      >
        {replyTarget ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/58 px-4 py-3 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-200">
            <span className="inline-flex min-w-0 items-center gap-2">
              <CornerDownRight className="size-4 shrink-0 text-coral-500" />
              <span className="min-w-0 truncate">
                回复 {replyTarget.authorName}
              </span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={cancelReply}
            >
              <X className="size-4" />
              取消
            </Button>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
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
        </div>
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="个人链接，可选"
          className="studio-input"
        />
        <textarea
          required
          rows={compact ? 4 : 5}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={
            replyTarget
              ? `写下回复 ${replyTarget.authorName} 的一句话`
              : "写下你的评论"
          }
          className="studio-input resize-none leading-7"
        />
        <Button
          className="w-full"
          disabled={createComment.isPending}
          type="submit"
        >
          <Send className="size-4" />
          {createComment.isPending
            ? "发送中..."
            : replyTarget
              ? "提交回复"
              : "发表评论"}
        </Button>
      </form>
    );
  }

  function renderComment(comment: CommentNode, depth = 0) {
    const isReplying = replyTargetId === comment.id;

    return (
      <article
        key={comment.id}
        className={cn(
          "rounded-[1.35rem] border border-white/45 bg-white/42 p-5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/10",
          depth > 0 ? "border-l-coral-300/80 dark:border-l-coral-200/40" : "",
        )}
        style={{
          marginLeft: depth > 0 ? Math.min(depth, 3) * 18 : 0,
        }}
      >
        <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>{comment.authorName}</span>
          <span>{formatDate(comment.createdAt)}</span>
        </div>
        <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-200">
          {comment.body}
        </p>
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant={isReplying ? "soft" : "ghost"}
            size="sm"
            onClick={() => startReply(comment)}
          >
            <MessageCircle className="size-4" />
            回复
          </Button>
        </div>

        {isReplying ? <div className="mt-4">{renderComposer(true)}</div> : null}

        {comment.replies.length > 0 ? (
          <div className="mt-4 space-y-4">
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <section
      id="comments"
      className="relative z-10 mx-auto mt-6 w-full max-w-6xl rounded-[1.6rem] border border-white/45 bg-white/58 p-5 shadow-xl shadow-slate-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/58 sm:p-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-coral-100 text-coral-700 dark:bg-coral-400/15 dark:text-coral-200">
            <MessageCircle className="size-6" />
          </span>
          <div>
            <p className="text-xs font-black text-slate-500 dark:text-slate-300">
              文章评论
            </p>
            <h2 className="text-2xl font-black tracking-[0]">评论</h2>
          </div>
        </div>

        <span className="self-start rounded-full bg-white/45 px-3 py-1 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-300 lg:self-auto">
          {comments.length} 条评论
        </span>
      </div>

      {submitted ? (
        <p
          className="mt-5 flex items-center gap-2 rounded-2xl bg-emerald-100 px-4 py-3 text-sm font-black text-emerald-950 dark:bg-emerald-400/15 dark:text-emerald-100"
          aria-live="polite"
        >
          <CheckCircle2 className="size-4" />
          内容已提交，审核通过后会显示在这里。
        </p>
      ) : null}

      {!replyTarget ? renderComposer() : null}

      <div className="mt-8 border-t border-white/45 pt-6 dark:border-white/10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black text-coral-700 dark:text-coral-200">
              评论
            </p>
            <h3 className="mt-1 text-xl font-black tracking-[0]">全部评论</h3>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {comments.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-white/45 p-8 text-center text-sm font-bold text-slate-400 dark:border-white/10">
              还没有评论，来写第一条。
            </p>
          ) : null}

          {commentTree.map((comment) => renderComment(comment))}
        </div>
      </div>
    </section>
  );
}
