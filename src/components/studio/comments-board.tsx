"use client";

import { useMemo, useState } from "react";
import { MessageCircle, MessageSquareReply, ShieldCheck, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { StudioComment } from "@/components/studio/types";

type CommentsBoardProps = {
  comments: StudioComment[];
  isLoading: boolean;
  isDeleting: boolean;
  isUpdating: boolean;
  onDelete: (commentId: string) => void;
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
    return "bg-amber-100 text-amber-950 dark:bg-amber-400/15 dark:text-amber-100";
  }

  if (status === "spam") {
    return "bg-coral-100 text-coral-950 dark:bg-coral-400/15 dark:text-coral-100";
  }

  return "bg-white/35 text-slate-700 dark:bg-white/10 dark:text-slate-200";
}

export function CommentsBoard({
  comments,
  isDeleting,
  isLoading,
  isUpdating,
  onDelete,
  onStatusChange,
}: CommentsBoardProps) {
  const [statusFilter, setStatusFilter] = useState<CommentStatusFilter>("all");
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
    if (statusFilter === "all") {
      return comments;
    }

    return comments.filter((comment) => comment.status === statusFilter);
  }, [comments, statusFilter]);

  function confirmDeleteComment() {
    if (!pendingDeleteComment) {
      return;
    }

    onDelete(pendingDeleteComment.id);
    setPendingDeleteComment(null);
  }

  return (
    <section className="studio-panel overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-white/35 p-4 dark:border-white/10 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-slate-400">Comments</p>
          <h2 className="mt-1 text-2xl font-black tracking-[0] sm:text-3xl">
            评论审核
          </h2>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-500 dark:text-slate-300">
            <span>{comments.length} 条评论</span>
            <span>·</span>
            <span>{replyCount} 条回复</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {statusFilters.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`h-10 rounded-full px-3 text-xs font-black transition ${
                statusFilter === value
                  ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                  : "bg-white/35 text-slate-600 hover:bg-white/60 dark:bg-white/10 dark:text-slate-300"
              }`}
            >
              {label} {statusCounts[value]}
            </button>
          ))}
          <Badge className="gap-2">
            <ShieldCheck className="size-3.5" />
            审核中
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-2">
        {isLoading ? (
          <p className="rounded-2xl border border-dashed border-white/45 p-8 text-center text-sm font-bold text-slate-400 dark:border-white/10 lg:col-span-2">
            正在读取评论...
          </p>
        ) : null}

        {!isLoading && comments.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/45 p-8 text-center text-sm font-bold text-slate-400 dark:border-white/10 lg:col-span-2">
            暂时还没有评论。
          </p>
        ) : null}

        {!isLoading && comments.length > 0 && visibleComments.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/45 p-8 text-center text-sm font-bold text-slate-400 dark:border-white/10 lg:col-span-2">
            当前筛选下没有评论。
          </p>
        ) : null}

        {visibleComments.map((comment) => {
          const parentComment = comment.parentId
            ? commentsById.get(comment.parentId)
            : null;
          const isReply = Boolean(comment.parentId);
          const Icon = isReply ? MessageSquareReply : MessageCircle;

          return (
            <article
              key={comment.id}
              className="rounded-2xl border border-white/45 bg-white/30 p-4 dark:border-white/10 dark:bg-white/10"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-2xl bg-coral-100 text-coral-700 dark:bg-coral-400/15 dark:text-coral-200">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate font-black tracking-[0]">
                      {comment.authorName}
                    </h3>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-300">
                      /{comment.postSlug} · {isReply ? "回复" : "评论"}
                    </p>
                  </div>
                </div>
                <Badge className={statusBadgeClass(comment.status)}>
                  {comment.status}
                </Badge>
              </div>

              {isReply ? (
                <div className="mt-3 border-l-2 border-coral-300/70 pl-3 text-xs font-semibold text-slate-500 dark:border-coral-300/40 dark:text-slate-300">
                  <div className="font-black text-slate-600 dark:text-slate-200">
                    回复 {parentComment?.authorName ?? "父评论"}
                  </div>
                  <p className="mt-1 line-clamp-2 leading-5">
                    {parentComment?.body ?? "父评论不在当前列表中。"}
                  </p>
                </div>
              ) : null}

              <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
                {comment.body}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {moderationStatuses.map((status) => (
                  <Button
                    key={status}
                    type="button"
                    variant={comment.status === status ? "default" : "glass"}
                    size="sm"
                    className="flex-1 sm:flex-none"
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
                <Button
                  type="button"
                  variant="glass"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  disabled={isDeleting}
                  onClick={() => setPendingDeleteComment(comment)}
                >
                  <Trash2 className="size-4" />
                  删除
                </Button>
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
