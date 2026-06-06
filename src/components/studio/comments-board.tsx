"use client";

import { MessageCircle, ShieldCheck, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { StudioComment } from "@/components/studio/types";
import { useState } from "react";

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

export function CommentsBoard({
  comments,
  isDeleting,
  isLoading,
  isUpdating,
  onDelete,
  onStatusChange,
}: CommentsBoardProps) {
  const [pendingDeleteComment, setPendingDeleteComment] =
    useState<StudioComment | null>(null);

  function confirmDeleteComment() {
    if (!pendingDeleteComment) {
      return;
    }

    onDelete(pendingDeleteComment.id);
    setPendingDeleteComment(null);
  }

  return (
    <section className="studio-panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-white/35 p-6 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-slate-400">Reader voices</p>
          <h2 className="mt-1 text-3xl font-black tracking-[0]">评论回声</h2>
        </div>
        <Badge className="gap-2">
          <ShieldCheck className="size-3.5" />
          当前展示已通过评论
        </Badge>
      </div>

      <div className="grid gap-4 p-6 lg:grid-cols-2">
        {isLoading ? (
          <p className="rounded-3xl border border-dashed border-white/45 p-10 text-center text-sm font-bold text-slate-400 dark:border-white/10 lg:col-span-2">
            正在读取评论...
          </p>
        ) : null}

        {!isLoading && comments.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-white/45 p-10 text-center text-sm font-bold text-slate-400 dark:border-white/10 lg:col-span-2">
            暂时还没有评论。
          </p>
        ) : null}

        {comments.map((comment) => (
          <article
            key={comment.id}
            className="rounded-3xl border border-white/45 bg-white/30 p-5 dark:border-white/10 dark:bg-white/10"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-coral-100 text-coral-700 dark:bg-coral-400/15 dark:text-coral-200">
                  <MessageCircle className="size-5" />
                </span>
                <div>
                  <h3 className="font-black tracking-[0]">{comment.authorName}</h3>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-300">
                    /{comment.postSlug}
                  </p>
                </div>
              </div>
              <Badge>{comment.status}</Badge>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-700 dark:text-slate-200">
              {comment.body}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {(
                [
                  ["approved", "通过"],
                  ["pending", "待审"],
                  ["spam", "屏蔽"],
                ] as const
              ).map(([status, label]) => (
                <Button
                  key={status}
                  type="button"
                  variant={comment.status === status ? "default" : "glass"}
                  size="sm"
                  disabled={isUpdating || comment.status === status}
                  onClick={() => onStatusChange(comment.id, status)}
                >
                  {label}
                </Button>
              ))}
              <Button
                type="button"
                variant="glass"
                size="sm"
                disabled={isDeleting}
                onClick={() => setPendingDeleteComment(comment)}
              >
                <Trash2 className="size-4" />
                删除
              </Button>
            </div>
          </article>
        ))}
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
