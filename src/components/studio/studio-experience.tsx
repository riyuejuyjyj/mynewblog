"use client";

import { ArrowLeft, LogOut, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { AccentPicker } from "@/components/accent-picker";
import { CommentsBoard } from "@/components/studio/comments-board";
import { useStudioAuth } from "@/components/studio/hooks/use-studio-auth";
import { useStudioMusicActions } from "@/components/studio/hooks/use-studio-music-actions";
import {
  resolveStoredCoverImage,
  useStudioUpload,
} from "@/components/studio/hooks/use-studio-upload";
import { MarkdownEditor } from "@/components/studio/markdown-editor";
import { MediaBoard } from "@/components/studio/media-board";
import { MusicBoard } from "@/components/studio/music-board";
import { PostsBoard } from "@/components/studio/posts-board";
import { StudioDashboard } from "@/components/studio/studio-dashboard";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { emptyForm, postToForm, slugify } from "@/components/studio/studio-utils";
import type {
  StudioMediaAsset,
  StudioPost,
  StudioPostForm,
  StudioView,
} from "@/components/studio/types";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { blogConfig } from "@/config/site";
import {
  resolveStorageObjectUrl,
  rewriteStorageObjectUrlsInText,
} from "@/lib/storage-object-url";
import { trpc } from "@/trpc/client";

function buildExcerpt(form: StudioPostForm) {
  const content = form.content.replace(/[#>*_`[\]()!-]/g, " ").trim();

  return form.excerpt.trim() || content.slice(0, 160) || "一篇新的博客草稿。";
}

export function StudioExperience() {
  const utils = trpc.useUtils();
  const auth = useStudioAuth();
  const [activeView, setActiveView] = useState<StudioView>("dashboard");
  const [form, setForm] = useState<StudioPostForm>(emptyForm);
  const [statusMessage, setStatusMessage] = useState("");
  const [operations, setOperations] = useState<string[]>([
    "创作室已就绪",
    "评论审核与 R2 媒体已接入",
  ]);

  const pushOperation = useCallback((entry: string) => {
    setOperations((current) => [entry, ...current].slice(0, 6));
  }, []);

  const { uploadFile, uploadStatus } = useStudioUpload(pushOperation);
  const music = useStudioMusicActions({
    activeView,
    enabled: auth.isAuthenticated,
    onOperation: pushOperation,
  });

  const overview = trpc.studio.overview.useQuery(undefined, {
    enabled: auth.isAuthenticated,
  });
  const storage = trpc.storage.status.useQuery();
  const mediaAssets = trpc.storage.assets.useQuery(
    { limit: 36 },
    { enabled: auth.isAuthenticated },
  );
  const comments = trpc.comments.studioList.useQuery(
    { limit: 40, status: "all" },
    { enabled: auth.isAuthenticated },
  );

  const deleteAsset = trpc.storage.deleteAsset.useMutation({
    onSuccess: async () => {
      await utils.storage.assets.invalidate();
    },
  });
  const updateCommentStatus = trpc.comments.updateStatus.useMutation({
    onSuccess: async () => {
      await utils.comments.studioList.invalidate();
      await utils.comments.recent.invalidate();
      await utils.comments.byPost.invalidate();
    },
  });
  const deleteComment = trpc.comments.delete.useMutation({
    onSuccess: async () => {
      await utils.comments.studioList.invalidate();
      await utils.comments.recent.invalidate();
      await utils.comments.byPost.invalidate();
    },
  });
  const replyFromStudio = trpc.comments.replyFromStudio.useMutation({
    onSuccess: async () => {
      await utils.comments.studioList.invalidate();
      await utils.comments.recent.invalidate();
      await utils.comments.byPost.invalidate();
    },
  });
  const upsertPost = trpc.studio.upsertPost.useMutation({
    onSuccess: async () => {
      await utils.studio.overview.invalidate();
      await utils.blog.feed.invalidate();
    },
  });
  const deletePost = trpc.studio.deletePost.useMutation({
    onSuccess: async () => {
      setStatusMessage("文章已删除。");
      setForm(emptyForm);
      setActiveView("posts");
      await utils.studio.overview.invalidate();
      await utils.blog.feed.invalidate();
      await utils.blog.dashboard.invalidate();
      await utils.comments.studioList.invalidate();
      await utils.comments.recent.invalidate();
    },
  });

  const stats = overview.data?.stats ?? {
    total: 0,
    published: 0,
    drafts: 0,
    views: 0,
  };
  const posts = useMemo(
    () => (overview.data?.posts ?? []) as StudioPost[],
    [overview.data?.posts],
  );
  const storageStatus =
    storage.data ?? {
      provider: "Cloudflare R2",
      configured: false,
      bucket: null,
      publicBaseUrl: null,
    };
  const recentComments = comments.data ?? [];
  const assets = mediaAssets.data ?? [];

  function updateForm(patch: Partial<StudioPostForm>) {
    setStatusMessage("");
    setForm((current) => ({ ...current, ...patch }));
  }

  function startNewPost() {
    setStatusMessage("");
    setForm(emptyForm);
    setActiveView("editor");
  }

  function editPost(post: StudioPost) {
    setStatusMessage("");
    setForm(postToForm(post));
    setActiveView("editor");
  }

  function insertImageIntoContent(url: string, altText = "image") {
    setActiveView("editor");
    updateForm({
      content: `${form.content.trimEnd()}\n\n![${altText}](${resolveStorageObjectUrl(url)})\n`,
    });
  }

  async function savePost(patch: Partial<StudioPostForm> = {}) {
    setStatusMessage("");

    const nextForm = { ...form, ...patch };
    const title = nextForm.title.trim() || "Untitled";
    const slug = slugify(nextForm.slug || title) || `post-${Date.now().toString(36)}`;
    const excerpt = buildExcerpt(nextForm);
    const content =
      rewriteStorageObjectUrlsInText(nextForm.content.trim()) || excerpt;
    const readingMinutes = Math.max(
      1,
      Math.min(120, Number(nextForm.readingMinutes) || 1),
    );
    const coverImage = resolveStoredCoverImage(nextForm.coverImage, assets);
    const payload = {
      ...nextForm,
      title,
      slug,
      excerpt,
      content,
      coverImage,
      readingMinutes,
    };

    setForm(payload);

    try {
      const result = await upsertPost.mutateAsync({
        id: payload.id,
        slug: payload.slug,
        title: payload.title,
        excerpt: payload.excerpt,
        content: payload.content,
        coverImage: payload.coverImage,
        category: payload.category,
        mood: payload.mood,
        tags: payload.tagsText
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        readingMinutes: payload.readingMinutes,
        featured: payload.featured,
        published: payload.published,
      });

      setForm((current) => ({
        ...current,
        ...payload,
        id: result.id,
        slug: result.slug,
      }));
      setStatusMessage(
        payload.published ? "文章已发布到 Neon。" : "草稿已保存到 Neon。",
      );
      pushOperation(`${payload.published ? "发布" : "保存"}文章：${payload.title}`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? `保存失败：${error.message}`
          : "保存失败，请稍后再试。",
      );
      throw error;
    }
  }

  async function replyToComment(commentId: string, body: string) {
    await replyFromStudio.mutateAsync({ parentId: commentId, body });
    pushOperation(`回复评论：${body.slice(0, 24)}`);
  }

  async function deleteMediaAsset(asset: StudioMediaAsset) {
    await deleteAsset.mutateAsync({ id: asset.id });

    if (
      form.coverImage === asset.publicUrl ||
      form.coverImage === asset.previewUrl ||
      form.coverImage === asset.objectKey
    ) {
      updateForm({ coverImage: emptyForm.coverImage });
    }
  }

  function renderWorkspace() {
    switch (activeView) {
      case "dashboard":
        return (
          <StudioDashboard
            commentsCount={recentComments.length}
            operations={operations}
            posts={posts}
            stats={stats}
            storage={storageStatus}
            onViewChange={setActiveView}
          />
        );
      case "posts":
        return (
          <PostsBoard
            isLoading={overview.isLoading}
            posts={posts}
            onDelete={(post) => deletePost.mutate({ id: post.id })}
            onEdit={editPost}
            onNew={startNewPost}
          />
        );
      case "media":
        return (
          <MediaBoard
            assets={assets}
            assetsLoading={mediaAssets.isLoading}
            deletingAssetId={
              deleteAsset.variables &&
              "id" in deleteAsset.variables &&
              deleteAsset.isPending
                ? deleteAsset.variables.id
                : null
            }
            form={form}
            storage={storageStatus}
            uploadStatus={uploadStatus}
            onCoverChange={(coverImage) => updateForm({ coverImage })}
            onDeleteAsset={deleteMediaAsset}
            onInsertImage={insertImageIntoContent}
            onUploadFile={uploadFile}
          />
        );
      case "music":
        return null;
      case "comments":
        return (
          <CommentsBoard
            comments={recentComments}
            isDeleting={deleteComment.isPending}
            isLoading={comments.isLoading}
            isReplying={replyFromStudio.isPending}
            isUpdating={updateCommentStatus.isPending}
            onDelete={(commentId) => deleteComment.mutate({ id: commentId })}
            onReply={replyToComment}
            onStatusChange={(commentId, status) =>
              updateCommentStatus.mutate({ id: commentId, status })
            }
          />
        );
      case "editor":
      default:
        return (
          <MarkdownEditor
            form={form}
            isDeleting={deletePost.isPending}
            isSaving={upsertPost.isPending}
            posts={posts}
            statusMessage={statusMessage}
            uploadStatus={uploadStatus}
            onChange={updateForm}
            onDelete={() => {
              if (form.id) {
                deletePost.mutate({ id: form.id });
              }
            }}
            onOpenPost={editPost}
            onSave={savePost}
            onUploadImage={uploadFile}
          />
        );
    }
  }

  return (
    <main className="anime-page-bg min-h-screen bg-background px-3 pb-14 pt-3 text-foreground sm:px-6 sm:pt-5 lg:px-8">
      <nav className="studio-panel relative z-20 mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-surface px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-accent-300 hover:text-accent-600 dark:border-white/12 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:border-accent-400/40 dark:hover:text-accent-200"
          >
            <ArrowLeft className="size-3.5" />
            <span>返回博客</span>
          </Link>
          <div className="hidden items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white sm:flex">
            <Sparkles className="size-4 text-accent-500" />
            <span>
              {blogConfig.brandPrefix}
              <span className="mx-1 font-serif font-normal text-accent-500">
                {blogConfig.brandConnector}
              </span>
              创作室
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="hidden md:inline-flex">Studio</Badge>
          <AccentPicker />
          <ThemeToggle />
          {auth.session.data?.user ? (
            <Button type="button" variant="glass" size="sm" onClick={auth.signOut}>
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">退出登录</span>
            </Button>
          ) : null}
        </div>
      </nav>

      {!auth.isAuthenticated ? (
        <StudioGate
          authEmail={auth.authEmail}
          authError={auth.authError}
          authMode={auth.authMode}
          authName={auth.authName}
          authPassword={auth.authPassword}
          inviteChecking={auth.inviteChecking}
          inviteCode={auth.inviteCode}
          inviteError={auth.inviteError}
          inviteVerified={auth.inviteVerified}
          onAuthEmailChange={auth.setAuthEmail}
          onAuthModeChange={auth.setAuthMode}
          onAuthNameChange={auth.setAuthName}
          onAuthPasswordChange={auth.setAuthPassword}
          onAuthSubmit={auth.handleAuth}
          onInviteChange={auth.setInviteCode}
          onInviteSubmit={auth.handleInvite}
        />
      ) : (
        <StudioShell
          activeView={activeView}
          operations={operations}
          stats={stats}
          userName={auth.session.data?.user.name ?? "Author"}
          onNewPost={startNewPost}
          onSignOut={auth.signOut}
          onViewChange={setActiveView}
        >
          <>
            <div className={activeView === "music" ? "hidden" : "contents"}>
              {renderWorkspace()}
            </div>
            <MusicBoard
              {...music}
              mode={activeView === "music" ? "full" : "background"}
              uploadStatus={uploadStatus}
              onUploadAudio={uploadFile}
            />
          </>
        </StudioShell>
      )}
    </main>
  );
}
