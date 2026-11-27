"use client";

import {
  MessageCircle,
  MessageSquareReply,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

import type { StudioComment } from "@/components/studio/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

type CommentsBoardProps = {
  comments: StudioComment[];
  isLoading: boolean;
  isDeleting: boolean;
  isReplying: boolean;
  isUpdating: boolean;
  onDelete: (commentId: string) => void;
  onReply: (commentId: string, body: string) => Promise<void> | void;
  onStatusChange: (
    commentId: string,
    status: "approved" | "pending" | "spam",
  ) => void;
};

type CommentStatusFilter = "all" | "approved" | "pending" | "spam";

const statusFilters = [
  ["all", "全部"],
  ["pending", "待审"],
  ["approved", "通过"],
  ["spam", "屏蔽"],
] as const satisfies ReadonlyArray<readonly [CommentStatusFilter, string]>;

const moderationStatuses = ["approved", "pending", "spam"] as const;

function isModerationStatus(
  status: string,
): status is (typeof moderationStatuses)[number] {
  return moderationStatuses.includes(
    status as (typeof moderationStatuses)[number],
  );
}

function statusBadgeClass(status: string) {
  if (status === "pending") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-500/15 dark:text-amber-200";
  }

  if (status === "spam") {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/15 dark:text-rose-200";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/15 dark:text-emerald-200";
}

export function CommentsBoard({
  comments,
  isDeleting,
  isLoading,
  isReplying,
  isUpdating,
  onDelete,
  onReply,
  onStatusChange,
}: CommentsBoardProps) {
  const [statusFilter, setStatusFilter] = useState<CommentStatusFilter>("all");
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [pendingDeleteComment, setPendingDeleteComment] =
    useState<StudioComment | null>(null);

  const commentsById = useMemo(
    () => new Map(comments.map((comment) => [comment.id, comment])),
    [comments],
  );
  const statusCounts = useMemo(() => {
    const counts: Record<CommentStatusFilter, number> = {
      all: comments.length,
      approved: 0,
      pending: 0,
      spam: 0,
    };

    comments.forEach((comment) => {
      if (isModerationStatus(comment.status)) {
        counts[comment.status] += 1;
      }
    });

    return counts;
  }, [comments]);

  const replyCount = useMemo(
    () => comments.filter((comment) => Boolean(comment.parentId)).length,
    [comments],
  );
  const visibleComments = useMemo(() => {
    if (statusFilter === "all") return comments;
    return comments.filter((comment) => comment.status === statusFilter);
  }, [comments, statusFilter]);

  function confirmDeleteComment() {
    if (!pendingDeleteComment) return;
    onDelete(pendingDeleteComment.id);
    setPendingDeleteComment(null);
  }

  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = replyBody.trim();
    if (!replyTargetId || !body) return;

    await onReply(replyTargetId, body);
    setReplyTargetId(null);
    setReplyBody("");
  }

  return (
    <section className="studio-panel overflow-hidden">
      <div className="flex flex-col gap-3.5 border-b border-slate-200/70 p-4 dark:border-white/8 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
            Moderation
          </p>
          <h2 className="mt-0.5 font-serif text-xl font-bold sm:text-2xl">
            评论审核与回复
          </h2>
          <div className="mt-1 flex flex-wrap gap-2 font-mono text-xs text-slate-400">
            <span>{comments.length} 条评论</span>
            <span>·</span>
            <span>{replyCount} 条回复</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex flex-wrap rounded-full border border-slate-200/80 bg-surface-muted/70 p-0.5 dark:border-white/10 dark:bg-white/[0.05]">
            {statusFilters.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  statusFilter === value
                    ? "bg-accent-500 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
                )}
              >
                {label} {statusCounts[value]}
              </button>
            ))}
          </div>
          <Badge className="gap-1.5">
            <ShieldCheck className="size-3.5" />
            反垃圾已开启
          </Badge>
        </div>
      </div>

      <div className="grid gap-3.5 p-4 sm:p-5 lg:grid-cols-2">
        {isLoading ? (
          <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400 dark:border-white/10 lg:col-span-2">
            正在读取评论...
          </p>
        ) : null}

        {!isLoading && comments.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400 dark:border-white/10 lg:col-span-2">
            暂时还没有评论。
          </p>
        ) : null}

        {!isLoading && comments.length > 0 && visibleComments.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400 dark:border-white/10 lg:col-span-2">
            当前筛选下没有评论。
          </p>
        ) : null}

        {visibleComments.map((comment) => {
          const parentComment = comment.parentId
            ? commentsById.get(comment.parentId)
            : null;
          const isReply = Boolean(comment.parentId);
          const canReply = comment.status === "approved";
          const Icon = isReply ? MessageSquareReply : MessageCircle;

          return (
            <article
              key={comment.id}
              className="rounded-2xl border border-slate-200/75 bg-surface p-4 dark:border-white/8 dark:bg-white/[0.03]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-100 text-accent-600 dark:bg-accent-500/20 dark:text-accent-200">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                      {comment.authorName}
                    </h3>
                    <p className="truncate font-mono text-[11px] text-slate-400">
                      /{comment.postSlug} · {isReply ? "回复" : "评论"}
                    </p>
                  </div>
                </div>
                <Badge className={statusBadgeClass(comment.status)}>
                  {comment.status === "approved"
                    ? "已通过"
                    : comment.status === "pending"
                      ? "待审核"
                      : "已屏蔽"}
                </Badge>
              </div>

              {isReply ? (
                <div className="mt-3 rounded-r-xl border-l-2 border-accent-400 bg-surface-muted/70 px-3 py-2 text-xs text-slate-500 dark:bg-white/[0.04] dark:text-slate-300">
                  <div className="font-semibold text-slate-700 dark:text-slate-200">
                    回复 {parentComment?.authorName ?? "父评论"}
                  </div>
                  <p className="mt-0.5 line-clamp-2 leading-5">
                    {parentComment?.body ?? "父评论不在当前列表中。"}
                  </p>
                </div>
              ) : null}

              <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
                {comment.body}
              </p>

              {replyTargetId === comment.id ? (
                <form
                  className="mt-3.5 space-y-2 rounded-xl bg-surface-muted/75 p-3 dark:bg-white/[0.04]"
                  onSubmit={(event) => {
                    void submitReply(event);
                  }}
                >
                  <textarea
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                    placeholder={`以作者身份回复 ${comment.authorName}...`}
                    className="studio-input min-h-20 resize-y rounded-xl px-3 py-2 text-sm leading-6"
                    disabled={isReplying}
                  />
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isReplying}
                      onClick={() => {
                        setReplyTargetId(null);
                        setReplyBody("");
                      }}
                    >
                      <X className="size-3.5" />
                      取消
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isReplying || !replyBody.trim()}
                    >
                      <Send className="size-3.5" />
                      {isReplying ? "发表中" : "发表回复"}
                    </Button>
                  </div>
                </form>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3 dark:border-white/8">
                <Button
                  type="button"
                  variant="soft"
                  size="sm"
                  disabled={!canReply || isReplying}
                  onClick={() => {
                    setReplyTargetId(comment.id);
                    setReplyBody("");
                  }}
                >
                  <MessageSquareReply className="size-3.5" />
                  回复
                </Button>
                {moderationStatuses.map((status) => (
                  <Button
                    key={status}
                    type="button"
                    variant={comment.status === status ? "default" : "glass"}
                    size="sm"
                    disabled={isUpdating || comment.status === status}
                    onClick={() => onStatusChange(comment.id, status)}
                  >
                    {status === "approved"
                      ? "通过"
                      : status === "pending"
                        ? "待审"
                        : "屏蔽"}
                  </Button>
                ))}
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setPendingDeleteComment(comment)}
                  className="ml-auto inline-flex h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-500/15"
                >
                  <Trash2 className="size-3.5" />
                  删除
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <ConfirmDialog
        confirmLabel="删除评论"
        description={`这会永久删除 ${pendingDeleteComment?.authorName ?? "这位读者"} 的评论，操作完成后不可从后台恢复。`}
        isPending={isDeleting}
        open={Boolean(pendingDeleteComment)}
        title="删除这条评论？"
        onConfirm={confirmDeleteComment}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setPendingDeleteComment(null);
          }
        }}
      />
    </section>
  );
}
