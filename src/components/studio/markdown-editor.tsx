"use client";

/* eslint-disable @next/next/no-img-element */

import {
  Bold,
  Code2,
  Eye,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Heading1,
  Heading2,
  ImageIcon,
  ImageUp,
  Italic,
  Link2,
  List,
  ListOrdered,
  MoreHorizontal,
  PanelLeftClose,
  Quote,
  Save,
  Send,
  SplitSquareHorizontal,
  Trash2,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from "react";

import { MarkdownPreview } from "@/components/studio/markdown-preview";
import type {
  StudioPost,
  StudioPostForm,
  UploadFolder,
} from "@/components/studio/types";
import { getWordCount, slugify } from "@/components/studio/studio-utils";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TextInputDialog } from "@/components/ui/text-input-dialog";
import { cn } from "@/lib/utils";

type MarkdownEditorProps = {
  form: StudioPostForm;
  isDeleting: boolean;
  isSaving: boolean;
  posts: StudioPost[];
  statusMessage: string;
  uploadStatus: string;
  onChange: (patch: Partial<StudioPostForm>) => void;
  onDelete: () => void;
  onOpenPost: (post: StudioPost) => void;
  onSave: (patch?: Partial<StudioPostForm>) => Promise<void>;
  onUploadImage: (file: File, folder: UploadFolder) => Promise<string | null>;
};

type EditorMode = "write" | "split" | "preview";
type LocalNodeType = "folder" | "doc";

type LocalDocNode = {
  id: string;
  parentId: string | null;
  name: string;
  type: LocalNodeType;
  expanded?: boolean;
  content?: string;
};

type ContextMenuState = {
  nodeId: string;
  x: number;
  y: number;
};

type CreateDialogState = {
  parentId: string;
  type: "folder" | "doc";
} | null;

type PublishDraft = Pick<
  StudioPostForm,
  | "category"
  | "coverImage"
  | "excerpt"
  | "featured"
  | "mood"
  | "readingMinutes"
  | "slug"
  | "tagsText"
>;

const ROOT_NODE_ID = "workspace-root";
const CURRENT_DOC_ID = "current-post";

const initialNodes: LocalDocNode[] = [
  {
    id: ROOT_NODE_ID,
    parentId: null,
    name: "MyNewBlog",
    type: "folder",
    expanded: true,
  },
  {
    id: "drafts-folder",
    parentId: ROOT_NODE_ID,
    name: "草稿箱",
    type: "folder",
    expanded: true,
  },
  {
    id: CURRENT_DOC_ID,
    parentId: "drafts-folder",
    name: "当前文章.md",
    type: "doc",
    content: "",
  },
  {
    id: "ideas-folder",
    parentId: ROOT_NODE_ID,
    name: "灵感库",
    type: "folder",
    expanded: true,
  },
  {
    id: "idea-doc",
    parentId: "ideas-folder",
    name: "片段速记.md",
    type: "doc",
    content: "## 片段速记\n\n把还没成型的句子先放在这里。",
  },
];

const tools = [
  { label: "一级标题", icon: Heading1, before: "# ", after: "" },
  { label: "二级标题", icon: Heading2, before: "## ", after: "" },
  { label: "加粗", icon: Bold, before: "**", after: "**" },
  { label: "斜体", icon: Italic, before: "*", after: "*" },
  { label: "引用", icon: Quote, before: "> ", after: "" },
  { label: "无序列表", icon: List, before: "- ", after: "" },
  { label: "有序列表", icon: ListOrdered, before: "1. ", after: "" },
  { label: "代码块", icon: Code2, before: "```\n", after: "\n```" },
  { label: "链接", icon: Link2, before: "[", after: "](https://)" },
  { label: "图片", icon: ImageIcon, before: "![alt](", after: ")" },
];

function createNodeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeDocName(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "untitled.md";
  }

  return trimmed.endsWith(".md") ? trimmed : `${trimmed}.md`;
}

function getTitleFromDocName(name: string) {
  return name.replace(/\.md$/i, "");
}

function collectDescendantIds(nodes: LocalDocNode[], nodeId: string) {
  const ids = new Set<string>([nodeId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) {
        ids.add(node.id);
        changed = true;
      }
    }
  }

  return ids;
}

function buildChildrenMap(nodes: LocalDocNode[]) {
  return nodes.reduce<Record<string, LocalDocNode[]>>((map, node) => {
    if (!node.parentId) {
      return map;
    }

    map[node.parentId] = [...(map[node.parentId] ?? []), node];
    return map;
  }, {});
}

export function MarkdownEditor({
  form,
  isDeleting,
  isSaving,
  posts,
  statusMessage,
  uploadStatus,
  onChange,
  onDelete,
  onOpenPost,
  onSave,
  onUploadImage,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const coverPreviewUrlRef = useRef<string | null>(null);
  const [mode, setMode] = useState<EditorMode>("split");
  const [nodes, setNodes] = useState<LocalDocNode[]>(initialNodes);
  const [activeLocalDocId, setActiveLocalDocId] = useState(CURRENT_DOC_ID);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [createDialog, setCreateDialog] = useState<CreateDialogState>(null);
  const [pendingTreeDeleteId, setPendingTreeDeleteId] = useState<string | null>(
    null,
  );
  const [deletePostOpen, setDeletePostOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishDraft, setPublishDraft] = useState<PublishDraft>(() => ({
    category: form.category,
    coverImage: form.coverImage,
    excerpt: form.excerpt,
    featured: form.featured,
    mood: form.mood,
    readingMinutes: form.readingMinutes,
    slug: form.slug,
    tagsText: form.tagsText,
  }));
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const wordCount = useMemo(() => getWordCount(form.content), [form.content]);
  const childrenMap = useMemo(() => buildChildrenMap(nodes), [nodes]);
  const pendingTreeDeleteNode = useMemo(
    () => nodes.find((node) => node.id === pendingTreeDeleteId) ?? null,
    [nodes, pendingTreeDeleteId],
  );
  const selectedPostId = form.id ?? "";

  useEffect(
    () => () => {
      if (coverPreviewUrlRef.current) {
        URL.revokeObjectURL(coverPreviewUrlRef.current);
      }
    },
    [],
  );

  function replaceCoverPreviewUrl(value: string | null) {
    if (coverPreviewUrlRef.current) {
      URL.revokeObjectURL(coverPreviewUrlRef.current);
    }

    coverPreviewUrlRef.current = value;
    setCoverPreviewUrl(value);
  }

  function getFolderName(folderId: string | null | undefined) {
    const folder = nodes.find(
      (node) => node.id === folderId && node.type === "folder",
    );

    return folder && folder.id !== ROOT_NODE_ID ? folder.name : null;
  }

  function getActiveParentFolderName() {
    const activeNode = nodes.find((node) => node.id === activeLocalDocId);

    return getFolderName(activeNode?.parentId);
  }

  function closePublishDialog() {
    replaceCoverPreviewUrl(null);
    setPublishOpen(false);
  }

  function syncActiveLocalDoc() {
    if (activeLocalDocId === CURRENT_DOC_ID) {
      return;
    }

    setNodes((current) =>
      current.map((node) =>
        node.id === activeLocalDocId && node.type === "doc"
          ? {
              ...node,
              content: form.content,
              name: normalizeDocName(form.title || node.name),
            }
          : node,
      ),
    );
  }

  function insertMarkdown(before: string, after: string) {
    const textarea = textareaRef.current;

    if (!textarea) {
      onChange({ content: `${form.content}${before}${after}` });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = form.content.slice(start, end);
    const next = `${form.content.slice(0, start)}${before}${selected}${after}${form.content.slice(end)}`;

    onChange({ content: next });

    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
    });
  }

  function openContextMenu(event: MouseEvent, nodeId = ROOT_NODE_ID) {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ nodeId, x: event.clientX, y: event.clientY });
  }

  function toggleFolder(nodeId: string) {
    setNodes((current) =>
      current.map((node) =>
        node.id === nodeId ? { ...node, expanded: !node.expanded } : node,
      ),
    );
  }

  function openLocalDoc(node: LocalDocNode) {
    if (node.type !== "doc") {
      return;
    }

    syncActiveLocalDoc();
    setActiveLocalDocId(node.id);

    if (node.id === CURRENT_DOC_ID) {
      return;
    }

    onChange({
      id: undefined,
      title: getTitleFromDocName(node.name),
      slug: slugify(getTitleFromDocName(node.name)),
      content: node.content ?? "",
      published: false,
    });
  }

  function requestCreate(type: "folder" | "doc", parentId: string) {
    setCreateDialog({ parentId, type });
    setContextMenu(null);
  }

  function createFolder(parentId: string, name: string) {
    const target = nodes.find((node) => node.id === parentId);
    const folderParentId = target?.type === "folder" ? parentId : target?.parentId;

    if (!folderParentId) {
      return;
    }

    setNodes((current) => [
      ...current.map((node) =>
        node.id === folderParentId ? { ...node, expanded: true } : node,
      ),
      {
        id: createNodeId("folder"),
        parentId: folderParentId,
        name: name.trim(),
        type: "folder",
        expanded: true,
      },
    ]);
    setCreateDialog(null);
  }

  function createDocument(parentId: string, name: string) {
    const target = nodes.find((node) => node.id === parentId);
    const docParentId = target?.type === "folder" ? parentId : target?.parentId;

    if (!docParentId) {
      return;
    }

    const docName = normalizeDocName(name);
    const title = getTitleFromDocName(docName);
    const docId = createNodeId("doc");

    syncActiveLocalDoc();
    setNodes((current) => [
      ...current.map((node) =>
        node.id === docParentId ? { ...node, expanded: true } : node,
      ),
      {
        id: docId,
        parentId: docParentId,
        name: docName,
        type: "doc",
        content: `# ${title}\n\n`,
      },
    ]);
    setActiveLocalDocId(docId);
    onChange({
      id: undefined,
      title,
      slug: slugify(title),
      content: `# ${title}\n\n`,
      published: false,
    });
    setCreateDialog(null);
  }

  function submitCreateDialog(value: string) {
    if (!createDialog) {
      return;
    }

    if (createDialog.type === "folder") {
      createFolder(createDialog.parentId, value);
      return;
    }

    createDocument(createDialog.parentId, value);
  }

  function requestDeleteNode(nodeId: string) {
    if (nodeId === ROOT_NODE_ID || nodeId === CURRENT_DOC_ID) {
      setContextMenu(null);
      return;
    }

    const node = nodes.find((item) => item.id === nodeId);

    if (!node) {
      return;
    }

    setPendingTreeDeleteId(nodeId);
    setContextMenu(null);
  }

  function confirmDeleteNode() {
    if (!pendingTreeDeleteId) {
      return;
    }

    const ids = collectDescendantIds(nodes, pendingTreeDeleteId);
    setNodes((current) => current.filter((item) => !ids.has(item.id)));

    if (ids.has(activeLocalDocId)) {
      setActiveLocalDocId(CURRENT_DOC_ID);
    }

    setPendingTreeDeleteId(null);
  }

  function confirmDeleteCurrentPost() {
    onDelete();
    setDeletePostOpen(false);
  }

  async function handleEditorImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    setUploadingImage(true);

    try {
      const url = await onUploadImage(file, "attachments");

      if (url) {
        insertMarkdown(`![${file.name}](${url})`, "");
      }
    } catch {
      // The parent owns the visible upload status; keep the editor responsive.
    } finally {
      setUploadingImage(false);
      input.value = "";
    }
  }

  async function handleCoverUpload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    setUploadingCover(true);
    replaceCoverPreviewUrl(URL.createObjectURL(file));

    try {
      const url = await onUploadImage(file, "covers");

      if (url) {
        replaceCoverPreviewUrl(null);
        setPublishDraft((current) => ({ ...current, coverImage: url }));
        onChange({ coverImage: url });
      }
    } catch {
      // The parent owns the visible upload status; keep the editor responsive.
    } finally {
      setUploadingCover(false);
      input.value = "";
    }
  }

  function openPublishDialog() {
    const parentCategory = getActiveParentFolderName();

    setPublishDraft({
      category: form.id ? form.category : parentCategory ?? form.category,
      coverImage: form.coverImage,
      excerpt: form.excerpt,
      featured: form.featured,
      mood: form.mood,
      readingMinutes: form.readingMinutes,
      slug: form.slug || slugify(form.title),
      tagsText: form.tagsText,
    });
    setPublishOpen(true);
  }

  async function saveDraft() {
    syncActiveLocalDoc();
    await onSave({ published: false });
  }

  async function publishPost() {
    syncActiveLocalDoc();
    await onSave({
      ...publishDraft,
      published: true,
      slug: slugify(publishDraft.slug || form.title),
    });
    closePublishDialog();
  }

  function renderLocalNode(node: LocalDocNode, depth = 0) {
    const isFolder = node.type === "folder";
    const isActive = node.id === activeLocalDocId;
    const Icon = isFolder ? (node.expanded ? FolderOpen : Folder) : FileText;

    return (
      <div key={node.id}>
        <button
          type="button"
          onClick={() => (isFolder ? toggleFolder(node.id) : openLocalDoc(node))}
          onContextMenu={(event) => openContextMenu(event, node.id)}
          className={cn(
            "group flex h-9 w-full items-center gap-2 rounded-xl px-2 text-left text-xs font-bold transition",
            isActive
              ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
              : "text-slate-600 hover:bg-white/55 dark:text-slate-300 dark:hover:bg-white/10",
          )}
          style={{ paddingLeft: 8 + depth * 14 }}
        >
          <Icon className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            {node.id === CURRENT_DOC_ID
              ? normalizeDocName(form.title || "当前文章")
              : node.name}
          </span>
          <MoreHorizontal className="size-3.5 opacity-0 transition group-hover:opacity-60" />
        </button>

        {isFolder && node.expanded
          ? (childrenMap[node.id] ?? []).map((child) =>
              renderLocalNode(child, depth + 1),
            )
          : null}
      </div>
    );
  }

  return (
    <div className="relative" onClick={() => setContextMenu(null)}>
      <section className="grid min-h-[760px] gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside
          className="studio-panel flex min-h-[360px] flex-col overflow-hidden xl:min-h-[760px]"
          onContextMenu={(event) => openContextMenu(event)}
        >
          <div className="border-b border-white/35 px-4 py-4 dark:border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-coral-700 dark:text-coral-200">
                  Workspace
                </p>
                <h2 className="mt-1 text-lg font-black tracking-[0]">
                  文档树
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="新建目录"
                  onClick={() => requestCreate("folder", ROOT_NODE_ID)}
                  className="grid size-9 place-items-center rounded-xl text-slate-500 transition hover:bg-white/60 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <FolderPlus className="size-4" />
                </button>
                <button
                  type="button"
                  title="新建文档"
                  onClick={() => requestCreate("doc", ROOT_NODE_ID)}
                  className="grid size-9 place-items-center rounded-xl text-slate-500 transition hover:bg-white/60 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <FilePlus2 className="size-4" />
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-400">
              右键目录或文档，可以新建、删除。
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <div className="space-y-1">{renderLocalNode(nodes[0])}</div>

            <div className="mt-5 border-t border-white/35 pt-4 dark:border-white/10">
              <p className="px-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                数据库文章
              </p>
              <div className="mt-2 space-y-1">
                {posts.length > 0 ? (
                  posts.map((post) => (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => {
                        syncActiveLocalDoc();
                        setActiveLocalDocId(CURRENT_DOC_ID);
                        onOpenPost(post);
                      }}
                      className={cn(
                        "flex h-9 w-full items-center gap-2 rounded-xl px-2 text-left text-xs font-bold transition",
                        selectedPostId === post.id
                          ? "bg-coral-100 text-coral-950 dark:bg-coral-400/20 dark:text-coral-100"
                          : "text-slate-600 hover:bg-white/55 dark:text-slate-300 dark:hover:bg-white/10",
                      )}
                    >
                      <FileText className="size-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">
                        {post.title || "Untitled"}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/45 px-3 py-4 text-xs font-semibold text-slate-400 dark:border-white/10">
                    Neon 里还没有文章，先从当前草稿发布第一篇。
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        <section className="studio-panel flex min-w-0 flex-col overflow-hidden">
          <div className="border-b border-white/35 px-4 py-4 dark:border-white/10 sm:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <input
                  value={form.title}
                  onChange={(event) =>
                    onChange({
                      title: event.target.value,
                      slug: form.slug || slugify(event.target.value),
                    })
                  }
                  required
                  placeholder="文章标题..."
                  className="w-full cursor-text bg-transparent text-3xl font-black tracking-[0] text-slate-950 outline-none placeholder:text-slate-300 dark:text-white dark:placeholder:text-slate-700 sm:text-4xl"
                />
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-300">
                  <span>{wordCount} 字</span>
                  <span className="size-1 rounded-full bg-slate-300" />
                  <span>{form.readingMinutes} min read</span>
                  <span className="size-1 rounded-full bg-slate-300" />
                  <span>{form.published ? "已发布" : "草稿模式"}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["write", PanelLeftClose, "写作"],
                    ["split", SplitSquareHorizontal, "双栏"],
                    ["preview", Eye, "预览"],
                  ] as const
                ).map(([itemMode, Icon, label]) => (
                  <button
                    key={itemMode}
                    type="button"
                    onClick={() => setMode(itemMode)}
                    className={cn(
                      "inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-black transition",
                      mode === itemMode
                        ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                        : "bg-white/40 text-slate-600 hover:bg-white/70 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15",
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 border-b border-white/35 bg-white/18 px-3 py-2.5 backdrop-blur-xl dark:border-white/10 dark:bg-black/10 sm:px-4">
            <input
              ref={imageInputRef}
              accept="image/*"
              className="hidden"
              type="file"
              onChange={handleEditorImageUpload}
            />
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.label}
                  type="button"
                  title={tool.label}
                  onClick={() => insertMarkdown(tool.before, tool.after)}
                  className="grid size-9 place-items-center rounded-xl text-slate-500 transition hover:bg-white/70 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <Icon className="size-4" />
                </button>
              );
            })}
            <button
              type="button"
              title="上传并插入图片"
              onClick={() => imageInputRef.current?.click()}
              className="ml-1 inline-flex h-9 items-center gap-2 rounded-xl bg-coral-100 px-3 text-xs font-black text-coral-700 transition hover:bg-coral-200 disabled:opacity-50 dark:bg-coral-400/15 dark:text-coral-200 dark:hover:bg-coral-400/25"
              disabled={uploadingImage}
            >
              <ImageUp className="size-4" />
              {uploadingImage ? "上传中" : "插图"}
            </button>
            {uploadStatus ? (
              <span className="rounded-full bg-white/45 px-3 py-2 text-[11px] font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300 lg:ml-auto">
                {uploadStatus}
              </span>
            ) : null}
            <div className="ml-auto flex items-center gap-2">
              <Button
                type="button"
                variant="glass"
                size="sm"
                disabled={isSaving}
                onClick={() => void saveDraft()}
              >
                <Save className="size-4" />
                {isSaving ? "保存中" : "保存草稿"}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isSaving}
                onClick={openPublishDialog}
              >
                <Send className="size-4" />
                发布
              </Button>
            </div>
          </div>

          {statusMessage ? (
            <p className="mx-4 mt-3 rounded-2xl bg-emerald-100 px-4 py-3 text-sm font-bold text-emerald-950">
              {statusMessage}
            </p>
          ) : null}

          <div
            className={cn(
              "grid min-h-0 flex-1",
              mode === "split" && "lg:grid-cols-2",
            )}
          >
            {mode !== "preview" ? (
              <textarea
                ref={textareaRef}
                value={form.content}
                onChange={(event) => onChange({ content: event.target.value })}
                placeholder="用 Markdown 开始写作..."
                className={cn(
                  "min-h-[620px] resize-none bg-white/25 px-5 py-7 font-mono text-[15px] leading-8 text-slate-800 outline-none backdrop-blur-xl dark:bg-slate-950/20 dark:text-slate-100 sm:px-8",
                  mode === "split" && "border-r border-white/35 dark:border-white/10",
                )}
              />
            ) : null}

            {mode !== "write" ? (
              <article className="min-h-[620px] overflow-y-auto bg-white/20 px-5 py-7 text-slate-800 dark:bg-slate-950/10 dark:text-slate-100 sm:px-8">
                <MarkdownPreview value={form.content} />
              </article>
            ) : null}
          </div>

          {form.id ? (
            <div className="border-t border-white/35 px-4 py-3 text-right dark:border-white/10">
              <button
                type="button"
                onClick={() => setDeletePostOpen(true)}
                disabled={isDeleting}
                className="rounded-full px-4 py-2 text-sm font-black text-coral-700 transition hover:bg-coral-100 disabled:opacity-50 dark:text-coral-200 dark:hover:bg-coral-400/10"
              >
                {isDeleting ? "删除中..." : "删除这篇文章"}
              </button>
            </div>
          ) : null}
        </section>
      </section>

      {contextMenu ? (
        <div
          className="fixed z-50 w-44 overflow-hidden rounded-2xl border border-white/55 bg-white/90 p-1 shadow-2xl shadow-slate-950/15 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/90"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => requestCreate("folder", contextMenu.nodeId)}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 transition hover:bg-slate-950/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <FolderPlus className="size-4" />
            新建目录
          </button>
          <button
            type="button"
            onClick={() => requestCreate("doc", contextMenu.nodeId)}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 transition hover:bg-slate-950/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <FilePlus2 className="size-4" />
            新建文档
          </button>
          <button
            type="button"
            onClick={() => requestDeleteNode(contextMenu.nodeId)}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-coral-700 transition hover:bg-coral-100 dark:text-coral-200 dark:hover:bg-coral-400/10"
          >
            <Trash2 className="size-4" />
            删除
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        confirmLabel="删除"
        description={
          pendingTreeDeleteNode?.type === "folder"
            ? `这会删除目录“${pendingTreeDeleteNode.name}”及其所有本地文档，当前后台文章数据不会被删除。`
            : `这会删除文档“${pendingTreeDeleteNode?.name ?? "当前文档"}”，当前后台文章数据不会被删除。`
        }
        open={Boolean(pendingTreeDeleteNode)}
        title={
          pendingTreeDeleteNode?.type === "folder"
            ? "删除这个目录？"
            : "删除这个文档？"
        }
        onConfirm={confirmDeleteNode}
        onOpenChange={(open) => {
          if (!open) {
            setPendingTreeDeleteId(null);
          }
        }}
      />

      <TextInputDialog
        defaultValue={
          createDialog?.type === "folder" ? "新的目录" : "新的文章.md"
        }
        description={
          createDialog?.type === "folder"
            ? "目录会创建在当前选中的目录下；如果你在文档上打开菜单，会创建在它所在的目录中。"
            : "文档会创建在当前选中的目录下，并自动切换到新的 Markdown 草稿。"
        }
        inputLabel={createDialog?.type === "folder" ? "目录名称" : "文档名称"}
        open={Boolean(createDialog)}
        placeholder={createDialog?.type === "folder" ? "例如：随笔" : "例如：第一篇文章.md"}
        title={createDialog?.type === "folder" ? "新建目录" : "新建文档"}
        onSubmit={submitCreateDialog}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialog(null);
          }
        }}
      />

      <ConfirmDialog
        confirmLabel="删除文章"
        description={`这会删除《${form.title || "这篇文章"}》以及评论关联数据，操作完成后不可从后台直接撤回。`}
        isPending={isDeleting}
        open={deletePostOpen}
        title="删除这篇文章？"
        onConfirm={confirmDeleteCurrentPost}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeletePostOpen(false);
          }
        }}
      />

      {publishOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/45 px-4 py-8 backdrop-blur-xl">
          <div className="studio-panel max-h-[92vh] w-full max-w-3xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/35 px-5 py-4 dark:border-white/10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-coral-700 dark:text-coral-200">
                  Publish
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-[0]">
                  发布信息
                </h2>
              </div>
              <button
                type="button"
                title="关闭"
                onClick={closePublishDialog}
                className="grid size-10 place-items-center rounded-full bg-white/35 text-slate-600 transition hover:bg-white/60 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="max-h-[calc(92vh-148px)] overflow-y-auto p-5">
              <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
                <div className="space-y-4">
                  <label className="studio-label block">
                    Slug
                    <input
                      value={publishDraft.slug}
                      onChange={(event) =>
                        setPublishDraft((current) => ({
                          ...current,
                          slug: slugify(event.target.value),
                        }))
                      }
                      required
                      className="studio-input mt-2"
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="studio-label block">
                      Category
                      <input
                        value={publishDraft.category}
                        onChange={(event) =>
                          setPublishDraft((current) => ({
                            ...current,
                            category: event.target.value,
                          }))
                        }
                        required
                        className="studio-input mt-2"
                      />
                    </label>
                    <label className="studio-label block">
                      Mood
                      <input
                        value={publishDraft.mood}
                        onChange={(event) =>
                          setPublishDraft((current) => ({
                            ...current,
                            mood: event.target.value,
                          }))
                        }
                        required
                        className="studio-input mt-2"
                      />
                    </label>
                  </div>

                  <label className="studio-label block">
                    Tags
                    <input
                      value={publishDraft.tagsText}
                      onChange={(event) =>
                        setPublishDraft((current) => ({
                          ...current,
                          tagsText: event.target.value,
                        }))
                      }
                      className="studio-input mt-2"
                      placeholder="Next.js, Blog, Notes"
                    />
                  </label>

                  <label className="studio-label block">
                    Excerpt
                    <textarea
                      value={publishDraft.excerpt}
                      onChange={(event) =>
                        setPublishDraft((current) => ({
                          ...current,
                          excerpt: event.target.value,
                        }))
                      }
                      required
                      rows={5}
                      className="studio-input mt-2 resize-none leading-6"
                    />
                  </label>

                  <label className="studio-label block">
                    Reading minutes
                    <input
                      value={publishDraft.readingMinutes}
                      onChange={(event) =>
                        setPublishDraft((current) => ({
                          ...current,
                          readingMinutes: Number(event.target.value),
                        }))
                      }
                      min={1}
                      max={120}
                      type="number"
                      className="studio-input mt-2"
                    />
                  </label>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="studio-label">Cover image</label>
                    <input
                      ref={coverInputRef}
                      accept="image/*"
                      className="hidden"
                      type="file"
                      onChange={handleCoverUpload}
                    />
                    <div className="mt-3 aspect-video overflow-hidden rounded-3xl border border-white/45 bg-slate-950/5 dark:border-white/10 dark:bg-white/10">
                      {coverPreviewUrl || publishDraft.coverImage ? (
                        <img
                          src={coverPreviewUrl ?? publishDraft.coverImage}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="grid size-full place-items-center text-sm font-bold text-slate-400">
                          No cover
                        </div>
                      )}
                    </div>
                    <input
                      value={publishDraft.coverImage}
                      onChange={(event) =>
                        setPublishDraft((current) => ({
                          ...current,
                          coverImage: event.target.value,
                        }))
                      }
                      required
                      type="url"
                      className="studio-input mt-3"
                      placeholder={uploadingCover ? "封面上传中，完成后会自动写入 URL" : undefined}
                    />
                    {uploadingCover ? (
                      <p className="mt-2 rounded-2xl bg-white/45 px-4 py-3 text-xs font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">
                        已先显示本地预览，正在上传到 R2...
                      </p>
                    ) : null}
                    <Button
                      type="button"
                      variant="glass"
                      className="mt-3 w-full"
                      disabled={uploadingCover}
                      onClick={() => coverInputRef.current?.click()}
                    >
                      <ImageUp className="size-4" />
                      {uploadingCover ? "封面上传中..." : "上传封面到 R2"}
                    </Button>
                  </div>

                  <label className="flex items-center justify-between rounded-2xl border border-white/45 bg-white/35 px-4 py-3 text-sm font-black dark:border-white/10 dark:bg-white/10">
                    设为精选
                    <input
                      type="checkbox"
                      checked={publishDraft.featured}
                      onChange={(event) =>
                        setPublishDraft((current) => ({
                          ...current,
                          featured: event.target.checked,
                        }))
                      }
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/35 px-5 py-4 dark:border-white/10">
              <Button
                type="button"
                variant="glass"
                onClick={closePublishDialog}
              >
                取消
              </Button>
              <Button
                type="button"
                disabled={isSaving || uploadingCover}
                onClick={() => void publishPost()}
              >
                <Send className="size-4" />
                {isSaving ? "发布中..." : "确认发布"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
