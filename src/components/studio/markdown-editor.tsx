"use client";

/* eslint-disable @next/next/no-img-element */

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Eye,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  ImageUp,
  Italic,
  Link2,
  List,
  ListIndentIncrease,
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
  type ClipboardEvent,
  type FormEvent,
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
import {
  isSupportedMediaReference,
  resolveStorageObjectUrl,
} from "@/lib/storage-object-url";
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

type EditorMode = "write" | "split" | "source" | "preview";
type RichBlockStyle = "paragraph" | "h1" | "h2" | "h3" | "quote";
type ParagraphAlign = "left" | "center" | "right" | "justify";
type ParagraphFormat = {
  align: ParagraphAlign;
  firstLineIndent: boolean;
};
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

type AutoSaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

const ROOT_NODE_ID = "workspace-root";
const CURRENT_DOC_ID = "current-post";
const AUTO_SAVE_DELAY_MS = 2200;

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

const blockStyles: Array<{ label: string; value: RichBlockStyle }> = [
  { label: "正文", value: "paragraph" },
  { label: "标题 1", value: "h1" },
  { label: "标题 2", value: "h2" },
  { label: "标题 3", value: "h3" },
  { label: "引用", value: "quote" },
];

const inlineTools = [
  {
    command: "bold",
    icon: Bold,
    label: "加粗",
    markdownAfter: "**",
    markdownBefore: "**",
  },
  {
    command: "italic",
    icon: Italic,
    label: "斜体",
    markdownAfter: "*",
    markdownBefore: "*",
  },
] as const;

const paragraphAlignTools = [
  { align: "left", icon: AlignLeft, label: "左对齐" },
  { align: "center", icon: AlignCenter, label: "居中" },
  { align: "right", icon: AlignRight, label: "右对齐" },
  { align: "justify", icon: AlignJustify, label: "两端对齐" },
] as const;

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

function normalizeReadingMinutes(value: number) {
  return Math.max(1, Math.min(120, Number(value) || 1));
}

function normalizeTagsText(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .join(",");
}

function createAutoSaveSnapshot(value: StudioPostForm) {
  const title = value.title.trim();
  const slug = slugify(value.slug || title);

  return JSON.stringify({
    category: value.category.trim(),
    content: value.content.trim(),
    coverImage: value.coverImage.trim(),
    excerpt: value.excerpt.trim(),
    featured: value.featured,
    id: value.id ?? "",
    mood: value.mood.trim(),
    published: value.published,
    readingMinutes: normalizeReadingMinutes(value.readingMinutes),
    slug,
    tagsText: normalizeTagsText(value.tagsText),
    title,
  });
}

function hasAutoSavePayload(value: StudioPostForm) {
  return Boolean(
    value.id ||
      value.title.trim() ||
      value.content.trim() ||
      value.excerpt.trim() ||
      value.coverImage.trim() ||
      value.tagsText.trim(),
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function normalizeEditorUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return "";
  if (/^(https?:|mailto:|\/|#)/i.test(trimmed)) return trimmed;

  return `https://${trimmed}`;
}

function createDefaultParagraphFormat(): ParagraphFormat {
  return {
    align: "left",
    firstLineIndent: false,
  };
}

function isParagraphAlign(value: string): value is ParagraphAlign {
  return ["left", "center", "right", "justify"].includes(value);
}

function readParagraphFormatLine(value: string): ParagraphFormat | null {
  if (!/^<!--\s*studio:paragraph\b/.test(value)) {
    return null;
  }

  const align = value.match(/\balign=(left|center|right|justify)\b/)?.[1];
  const indent = value.match(/\bindent=(first|none)\b/)?.[1];

  return {
    align: align && isParagraphAlign(align) ? align : "left",
    firstLineIndent: indent === "first",
  };
}

function serializeParagraphFormat(format: ParagraphFormat, force = false) {
  const parts = ["studio:paragraph"];

  if (force || format.align !== "left") {
    parts.push(`align=${format.align}`);
  }

  if (force || format.firstLineIndent) {
    parts.push(`indent=${format.firstLineIndent ? "first" : "none"}`);
  }

  return parts.length > 1 ? `<!-- ${parts.join(" ")} -->` : "";
}

function getEditableBlockAttributes(format: ParagraphFormat) {
  const attrs: string[] = [];

  if (format.align !== "left") {
    attrs.push(`data-align="${format.align}"`);
  }

  if (format.firstLineIndent) {
    attrs.push('data-first-line-indent="true"');
  }

  return attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
}

function getElementParagraphFormat(element: HTMLElement): ParagraphFormat {
  const rawAlign =
    element.dataset.align ||
    element.style.textAlign ||
    element.getAttribute("align") ||
    "left";
  const textIndent = element.style.textIndent.trim();

  return {
    align: isParagraphAlign(rawAlign) ? rawAlign : "left",
    firstLineIndent:
      element.dataset.firstLineIndent === "true" ||
      (Boolean(textIndent) && textIndent !== "0px" && textIndent !== "0"),
  };
}

function withParagraphFormat(markdown: string, element: HTMLElement) {
  const meta = serializeParagraphFormat(getElementParagraphFormat(element));

  return meta ? `${meta}\n${markdown}` : markdown;
}

function renderInlineMarkdownToHtml(text: string) {
  const chunks: string[] = [];
  const pattern =
    /(!\[[^\]]*]\([^)]+\)|\[[^\]]+]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const token = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      chunks.push(escapeHtml(text.slice(lastIndex, index)));
    }

    if (token.startsWith("![")) {
      const parts = token.match(/^!\[([^\]]*)]\(([^)]+)\)$/);

      if (parts) {
        const source = parts[2];
        chunks.push(
          `<img src="${escapeAttribute(resolveStorageObjectUrl(source))}" alt="${escapeAttribute(parts[1])}" data-markdown-src="${escapeAttribute(source)}" />`,
        );
      }
    } else if (token.startsWith("[")) {
      const parts = token.match(/^\[([^\]]+)]\(([^)]+)\)$/);

      if (parts) {
        const href = normalizeEditorUrl(parts[2]);
        chunks.push(
          `<a href="${escapeAttribute(href)}" data-markdown-href="${escapeAttribute(parts[2])}">${escapeHtml(parts[1])}</a>`,
        );
      }
    } else if (token.startsWith("`")) {
      chunks.push(`<code>${escapeHtml(token.slice(1, -1))}</code>`);
    } else if (token.startsWith("**")) {
      chunks.push(`<strong>${escapeHtml(token.slice(2, -2))}</strong>`);
    } else if (token.startsWith("*")) {
      chunks.push(`<em>${escapeHtml(token.slice(1, -1))}</em>`);
    }

    lastIndex = index + token.length;
  }

  if (lastIndex < text.length) {
    chunks.push(escapeHtml(text.slice(lastIndex)));
  }

  return chunks.join("");
}

function readMarkdownList(lines: string[], start: number, ordered: boolean) {
  const items: string[] = [];
  let index = start;
  const pattern = ordered ? /^\d+\.\s+(.+)$/ : /^[-*]\s+(.+)$/;

  while (index < lines.length) {
    const match = lines[index].trim().match(pattern);

    if (!match) break;

    items.push(match[1]);
    index += 1;
  }

  return { items, nextIndex: index };
}

function markdownToEditableHtml(value: string) {
  const lines = value.split("\n");
  const blocks: string[] = [];
  let index = 0;
  let pendingParagraphFormat = createDefaultParagraphFormat();

  function takeParagraphAttributes() {
    const attrs = getEditableBlockAttributes(pendingParagraphFormat);
    pendingParagraphFormat = createDefaultParagraphFormat();

    return attrs;
  }

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();
    const paragraphFormat = readParagraphFormatLine(trimmed);

    if (paragraphFormat) {
      pendingParagraphFormat = paragraphFormat;
      index += 1;
      continue;
    }

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }

      blocks.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      pendingParagraphFormat = createDefaultParagraphFormat();
      index += 1;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      blocks.push(
        `<h3${takeParagraphAttributes()}>${renderInlineMarkdownToHtml(trimmed.slice(4))}</h3>`,
      );
      index += 1;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      blocks.push(
        `<h2${takeParagraphAttributes()}>${renderInlineMarkdownToHtml(trimmed.slice(3))}</h2>`,
      );
      index += 1;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      blocks.push(
        `<h1${takeParagraphAttributes()}>${renderInlineMarkdownToHtml(trimmed.slice(2))}</h1>`,
      );
      index += 1;
      continue;
    }

    if (trimmed.startsWith("> ")) {
      const quoteLines: string[] = [];

      while (index < lines.length && lines[index].trim().startsWith("> ")) {
        quoteLines.push(lines[index].trim().slice(2));
        index += 1;
      }

      blocks.push(
        `<blockquote${takeParagraphAttributes()}><p>${renderInlineMarkdownToHtml(quoteLines.join(" "))}</p></blockquote>`,
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const list = readMarkdownList(lines, index, false);
      blocks.push(
        `<ul${takeParagraphAttributes()}>${list.items
          .map((item) => `<li>${renderInlineMarkdownToHtml(item)}</li>`)
          .join("")}</ul>`,
      );
      index = list.nextIndex;
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const list = readMarkdownList(lines, index, true);
      blocks.push(
        `<ol${takeParagraphAttributes()}>${list.items
          .map((item) => `<li>${renderInlineMarkdownToHtml(item)}</li>`)
          .join("")}</ol>`,
      );
      index = list.nextIndex;
      continue;
    }

    const paragraphLines = [trimmed];
    index += 1;

    while (index < lines.length) {
      const next = lines[index].trim();

      if (
        !next ||
        next.startsWith("#") ||
        next.startsWith("> ") ||
        next.startsWith("```") ||
        readParagraphFormatLine(next) ||
        /^[-*]\s+/.test(next) ||
        /^\d+\.\s+/.test(next)
      ) {
        break;
      }

      paragraphLines.push(next);
      index += 1;
    }

    blocks.push(
      `<p${takeParagraphAttributes()}>${renderInlineMarkdownToHtml(paragraphLines.join(" "))}</p>`,
    );
  }

  return blocks.length > 0 ? blocks.join("") : "";
}

function getInlineMarkdown(node: ChildNode): string {
  if (node.nodeType === 3) {
    return node.textContent?.replace(/\u00a0/g, " ") ?? "";
  }

  if (node.nodeType !== 1) {
    return "";
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();
  const children = Array.from(element.childNodes).map(getInlineMarkdown).join("");

  if (tagName === "br") return "\n";
  if (tagName === "strong" || tagName === "b") return `**${children}**`;
  if (tagName === "em" || tagName === "i") return `*${children}*`;
  if (tagName === "code") return `\`${element.textContent ?? ""}\``;
  if (tagName === "a") {
    const href =
      element.getAttribute("data-markdown-href") ?? element.getAttribute("href") ?? "";

    return href ? `[${children || href}](${href})` : children;
  }
  if (tagName === "img") {
    const source =
      element.getAttribute("data-markdown-src") ?? element.getAttribute("src") ?? "";
    const alt = element.getAttribute("alt") ?? "image";

    return source ? `![${alt}](${source})` : "";
  }

  return children;
}

function blockNodeToMarkdown(node: ChildNode, listIndex?: number): string {
  if (node.nodeType === 3) {
    return getInlineMarkdown(node).trim();
  }

  if (node.nodeType !== 1) {
    return "";
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();
  const inline = () =>
    Array.from(element.childNodes).map(getInlineMarkdown).join("").trim();

  if (tagName === "h1") return withParagraphFormat(`# ${inline()}`, element);
  if (tagName === "h2") return withParagraphFormat(`## ${inline()}`, element);
  if (tagName === "h3") return withParagraphFormat(`### ${inline()}`, element);
  if (tagName === "blockquote") {
    const content = Array.from(element.childNodes)
      .map((child) => blockNodeToMarkdown(child))
      .filter(Boolean)
      .join("\n")
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");

    return withParagraphFormat(content || `> ${inline()}`, element);
  }
  if (tagName === "ul" || tagName === "ol") {
    const listMarkdown = Array.from(element.children)
      .filter((child) => child.tagName.toLowerCase() === "li")
      .map((child, index) =>
        blockNodeToMarkdown(child, tagName === "ol" ? index + 1 : undefined),
      )
      .filter(Boolean)
      .join("\n");

    return withParagraphFormat(listMarkdown, element);
  }
  if (tagName === "li") {
    const marker = listIndex ? `${listIndex}.` : "-";
    return `${marker} ${inline()}`;
  }
  if (tagName === "pre") {
    return `\`\`\`\n${element.textContent?.trimEnd() ?? ""}\n\`\`\``;
  }
  if (tagName === "div" || tagName === "p") {
    return withParagraphFormat(inline(), element);
  }

  return inline();
}

function editableHtmlToMarkdown(element: HTMLElement) {
  return Array.from(element.childNodes)
    .map((node) => blockNodeToMarkdown(node))
    .filter(Boolean)
    .join("\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatAutoSaveTime(value: Date | null) {
  if (!value) {
    return "";
  }

  return value.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
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
  const richEditorRef = useRef<HTMLDivElement>(null);
  const lastRichMarkdownRef = useRef(form.content);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const coverPreviewUrlRef = useRef<string | null>(null);
  const onSaveRef = useRef(onSave);
  const latestFormRef = useRef(form);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveInFlightRef = useRef(false);
  const lastAutoSavedSnapshotRef = useRef(createAutoSaveSnapshot(form));
  const [mode, setMode] = useState<EditorMode>("write");
  const [nodes, setNodes] = useState<LocalDocNode[]>(initialNodes);
  const [activeLocalDocId, setActiveLocalDocId] = useState(CURRENT_DOC_ID);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [createDialog, setCreateDialog] = useState<CreateDialogState>(null);
  const [pendingTreeDeleteId, setPendingTreeDeleteId] = useState<string | null>(
    null,
  );
  const [deletePostOpen, setDeletePostOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
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
  const [autoSaveStatus, setAutoSaveStatus] =
    useState<AutoSaveStatus>("idle");
  const [autoSaveError, setAutoSaveError] = useState("");
  const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);
  const [autoSaveRevision, setAutoSaveRevision] = useState(0);
  const wordCount = useMemo(() => getWordCount(form.content), [form.content]);
  const autoSaveSnapshot = useMemo(() => createAutoSaveSnapshot(form), [form]);
  const autoSaveLabel = useMemo(() => {
    if (activeLocalDocId !== CURRENT_DOC_ID) {
      return "";
    }

    if (autoSaveStatus === "pending") {
      return "等待自动保存";
    }

    if (autoSaveStatus === "saving") {
      return "自动保存中";
    }

    if (autoSaveStatus === "saved") {
      const timeLabel = formatAutoSaveTime(autoSavedAt);

      return timeLabel ? `已自动保存 ${timeLabel}` : "已自动保存";
    }

    if (autoSaveStatus === "error") {
      return autoSaveError ? `自动保存失败：${autoSaveError}` : "自动保存失败";
    }

    return hasAutoSavePayload(form) ? "自动保存已开启" : "";
  }, [activeLocalDocId, autoSaveError, autoSaveStatus, autoSavedAt, form]);
  const coverReference = publishDraft.coverImage.trim();
  const coverReferenceSupported = isSupportedMediaReference(coverReference);
  const coverPreviewSrc =
    coverPreviewUrl ??
    (coverReferenceSupported ? resolveStorageObjectUrl(coverReference) : "");
  const coverReferenceLabel = coverReference
    ? coverReferenceSupported
      ? coverReference.startsWith("/api/storage/object") ||
        /^(attachments|covers|gallery|music)\//.test(coverReference)
        ? "后台代理/R2 对象引用"
        : "公网或临时图片地址"
      : "封面引用不可用"
    : "还没有封面";
  const publishValidation = useMemo(() => {
    const normalizedSlug = slugify(publishDraft.slug || form.title);
    const readingMinutes = Number(publishDraft.readingMinutes);
    const coverImage = publishDraft.coverImage.trim();
    const issues = [
      form.title.trim() ? "" : "需要文章标题",
      normalizedSlug ? "" : "需要可发布的 slug",
      form.content.trim() ? "" : "正文还没有内容",
      publishDraft.excerpt.trim() ? "" : "需要摘要",
      publishDraft.category.trim() ? "" : "需要分类",
      coverImage ? "" : "需要封面图片",
      coverImage && !isSupportedMediaReference(coverImage)
        ? "封面图片地址不可用"
        : "",
      Number.isFinite(readingMinutes) && readingMinutes >= 1 && readingMinutes <= 120
        ? ""
        : "阅读时间需在 1-120 分钟之间",
    ].filter(Boolean);

    return {
      canPublish: issues.length === 0 && !uploadingCover,
      issues,
      normalizedSlug,
    };
  }, [form.content, form.title, publishDraft, uploadingCover]);
  const childrenMap = useMemo(() => buildChildrenMap(nodes), [nodes]);
  const pendingTreeDeleteNode = useMemo(
    () => nodes.find((node) => node.id === pendingTreeDeleteId) ?? null,
    [nodes, pendingTreeDeleteId],
  );
  const selectedPostId = form.id ?? "";

  useEffect(() => {
    latestFormRef.current = form;
  }, [form]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    lastAutoSavedSnapshotRef.current = createAutoSaveSnapshot(
      latestFormRef.current,
    );
    const resetTimer = setTimeout(() => {
      setAutoSaveStatus("idle");
      setAutoSaveError("");
      setAutoSavedAt(null);
    }, 0);

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    return () => {
      clearTimeout(resetTimer);
    };
  }, [activeLocalDocId, selectedPostId]);

  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    const canAutoSave =
      activeLocalDocId === CURRENT_DOC_ID &&
      !publishOpen &&
      !uploadingImage &&
      !uploadingCover &&
      !isDeleting;

    if (!canAutoSave || !hasAutoSavePayload(form)) {
      return;
    }

    if (autoSaveSnapshot === lastAutoSavedSnapshotRef.current) {
      return;
    }

    setAutoSaveStatus("pending");
    setAutoSaveError("");

    if (isSaving || autoSaveInFlightRef.current) {
      return;
    }

    autoSaveTimerRef.current = setTimeout(() => {
      const snapshotAtStart = createAutoSaveSnapshot(form);

      if (
        snapshotAtStart === lastAutoSavedSnapshotRef.current ||
        !hasAutoSavePayload(form)
      ) {
        return;
      }

      autoSaveInFlightRef.current = true;
      setAutoSaveStatus("saving");
      let saveSucceeded = false;

      void onSaveRef
        .current()
        .then(() => {
          saveSucceeded = true;
          lastAutoSavedSnapshotRef.current = snapshotAtStart;
          setAutoSavedAt(new Date());
          setAutoSaveStatus("saved");
          setAutoSaveError("");
        })
        .catch((error: unknown) => {
          setAutoSaveStatus("error");
          setAutoSaveError(
            error instanceof Error ? error.message : "请稍后手动保存",
          );
        })
        .finally(() => {
          autoSaveInFlightRef.current = false;

          const latestSnapshot = createAutoSaveSnapshot(latestFormRef.current);

          if (
            saveSucceeded &&
            latestSnapshot !== lastAutoSavedSnapshotRef.current &&
            hasAutoSavePayload(latestFormRef.current)
          ) {
            setAutoSaveRevision((current) => current + 1);
          }
        });
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [
    activeLocalDocId,
    autoSaveRevision,
    autoSaveSnapshot,
    form,
    isDeleting,
    isSaving,
    publishOpen,
    uploadingCover,
    uploadingImage,
  ]);

  useEffect(() => {
    const shouldWarnBeforeUnload =
      activeLocalDocId === CURRENT_DOC_ID &&
      hasAutoSavePayload(form) &&
      autoSaveSnapshot !== lastAutoSavedSnapshotRef.current;

    if (!shouldWarnBeforeUnload) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [activeLocalDocId, autoSaveSnapshot, form]);

  useEffect(
    () => () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    },
    [],
  );

  useEffect(
    () => () => {
      if (coverPreviewUrlRef.current) {
        URL.revokeObjectURL(coverPreviewUrlRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const editor = richEditorRef.current;

    if (!editor || mode === "source") {
      return;
    }

    if (
      form.content === lastRichMarkdownRef.current &&
      editor.innerHTML.trim()
    ) {
      return;
    }

    editor.innerHTML = markdownToEditableHtml(form.content);
    lastRichMarkdownRef.current = form.content;
  }, [form.content, mode]);

  function updateContentFromRichEditor() {
    const editor = richEditorRef.current;

    if (!editor) {
      return;
    }

    const nextContent = editableHtmlToMarkdown(editor);
    lastRichMarkdownRef.current = nextContent;
    onChange({ content: nextContent });
  }

  function handleRichInput(event: FormEvent<HTMLDivElement>) {
    const nextContent = editableHtmlToMarkdown(event.currentTarget);
    lastRichMarkdownRef.current = nextContent;
    onChange({ content: nextContent });
  }

  function handleRichPaste(event: ClipboardEvent<HTMLDivElement>) {
    const text = event.clipboardData.getData("text/plain");

    if (!text) {
      return;
    }

    event.preventDefault();
    document.execCommand("insertText", false, text);
    updateContentFromRichEditor();
  }

  function runRichCommand(command: string, value?: string) {
    const editor = richEditorRef.current;

    if (!editor || mode === "source") {
      return false;
    }

    editor.focus();
    document.execCommand(command, false, value);
    updateContentFromRichEditor();

    return true;
  }

  function getSelectedParagraphBlock() {
    const editor = richEditorRef.current;
    const selection = window.getSelection();
    const anchorNode = selection?.anchorNode;

    if (!editor || !anchorNode || !editor.contains(anchorNode)) {
      return null;
    }

    const element =
      anchorNode.nodeType === Node.ELEMENT_NODE
        ? (anchorNode as HTMLElement)
        : anchorNode.parentElement;

    if (!element) {
      return null;
    }

    const blockquote = element.closest("blockquote");
    if (blockquote && editor.contains(blockquote)) {
      return blockquote as HTMLElement;
    }

    const listItem = element.closest("li");
    if (listItem?.parentElement && editor.contains(listItem.parentElement)) {
      return listItem.parentElement as HTMLElement;
    }

    const block = element.closest("p,h1,h2,h3,ul,ol,pre,div");

    return block && block !== editor && editor.contains(block)
      ? (block as HTMLElement)
      : null;
  }

  function updateSelectedParagraphBlock(
    updater: (element: HTMLElement) => void,
  ) {
    if (mode === "preview") {
      return false;
    }

    const editor = richEditorRef.current;

    if (!editor || mode === "source") {
      return false;
    }

    editor.focus();

    let block = getSelectedParagraphBlock();

    if (!block) {
      document.execCommand("formatBlock", false, "p");
      block = getSelectedParagraphBlock();
    }

    if (!block) {
      return false;
    }

    updater(block);
    updateContentFromRichEditor();

    return true;
  }

  function applyParagraphAlign(align: ParagraphAlign) {
    if (
      updateSelectedParagraphBlock((block) => {
        if (align === "left") {
          delete block.dataset.align;
        } else {
          block.dataset.align = align;
        }

        block.style.textAlign = "";
      })
    ) {
      return;
    }

    insertMarkdown(`${serializeParagraphFormat({ align, firstLineIndent: false }, true)}\n`, "");
  }

  function toggleFirstLineIndent() {
    if (
      updateSelectedParagraphBlock((block) => {
        if (block.dataset.firstLineIndent === "true") {
          delete block.dataset.firstLineIndent;
          block.style.textIndent = "";
        } else {
          block.dataset.firstLineIndent = "true";
          block.style.textIndent = "";
        }
      })
    ) {
      return;
    }

    insertMarkdown(
      `${serializeParagraphFormat(
        { align: "left", firstLineIndent: true },
        true,
      )}\n`,
      "",
    );
  }

  function applyInlineFormat(
    command: "bold" | "italic",
    markdownBefore: string,
    markdownAfter: string,
  ) {
    if (mode === "preview") {
      return;
    }

    if (runRichCommand(command)) {
      return;
    }

    insertMarkdown(markdownBefore, markdownAfter);
  }

  function applyBlockStyle(style: RichBlockStyle) {
    if (mode === "preview") {
      return;
    }

    const blockMap: Record<RichBlockStyle, string> = {
      h1: "h1",
      h2: "h2",
      h3: "h3",
      paragraph: "p",
      quote: "blockquote",
    };

    if (runRichCommand("formatBlock", blockMap[style])) {
      return;
    }

    const prefixMap: Record<RichBlockStyle, string> = {
      h1: "# ",
      h2: "## ",
      h3: "### ",
      paragraph: "",
      quote: "> ",
    };

    insertMarkdown(prefixMap[style], "");
  }

  function applyList(ordered: boolean) {
    if (mode === "preview") {
      return;
    }

    if (runRichCommand(ordered ? "insertOrderedList" : "insertUnorderedList")) {
      return;
    }

    insertMarkdown(ordered ? "1. " : "- ", "");
  }

  function insertCodeBlock() {
    if (mode === "preview") {
      return;
    }

    if (
      runRichCommand(
        "insertHTML",
        "<pre><code>在这里写代码</code></pre><p><br></p>",
      )
    ) {
      return;
    }

    insertMarkdown("```\n", "\n```");
  }

  function insertImageReference(url: string, alt: string) {
    if (mode === "preview") {
      return;
    }

    const markdown = `![${alt}](${url})`;

    if (
      runRichCommand(
        "insertHTML",
        `<img src="${escapeAttribute(resolveStorageObjectUrl(url))}" alt="${escapeAttribute(alt)}" data-markdown-src="${escapeAttribute(url)}" /><p><br></p>`,
      )
    ) {
      return;
    }

    insertMarkdown(markdown, "");
  }

  function submitLinkDialog(value: string) {
    if (mode === "preview") {
      setLinkDialogOpen(false);
      return;
    }

    const href = normalizeEditorUrl(value);

    if (!href) {
      return;
    }

    if (!runRichCommand("createLink", href)) {
      insertMarkdown("[", `](${href})`);
    }

    setLinkDialogOpen(false);
  }

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
    if (mode === "preview") {
      return;
    }

    const textarea = textareaRef.current;

    if (!textarea) {
      const next = `${form.content}${before}${after}`;
      lastRichMarkdownRef.current = next;
      onChange({ content: next });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = form.content.slice(start, end);
    const next = `${form.content.slice(0, start)}${before}${selected}${after}${form.content.slice(end)}`;

    lastRichMarkdownRef.current = next;
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
        insertImageReference(url, file.name);
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
      } else {
        replaceCoverPreviewUrl(null);
      }
    } catch {
      replaceCoverPreviewUrl(null);
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
    lastAutoSavedSnapshotRef.current = createAutoSaveSnapshot({
      ...form,
      published: false,
    });
    setAutoSavedAt(new Date());
    setAutoSaveStatus("saved");
    setAutoSaveError("");
  }

  async function publishPost() {
    if (!publishValidation.canPublish) {
      return;
    }

    const publishPatch = {
      ...publishDraft,
      published: true,
      slug: publishValidation.normalizedSlug,
    };

    syncActiveLocalDoc();
    await onSave(publishPatch);
    lastAutoSavedSnapshotRef.current = createAutoSaveSnapshot({
      ...form,
      ...publishPatch,
    });
    setAutoSavedAt(new Date());
    setAutoSaveStatus("saved");
    setAutoSaveError("");
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
      <section className="grid min-h-[640px] gap-4 xl:min-h-[760px] xl:grid-cols-[280px_minmax(0,1fr)]">
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
                  className="w-full cursor-text bg-transparent text-2xl font-black tracking-[0] text-slate-950 outline-none placeholder:text-slate-300 dark:text-white dark:placeholder:text-slate-700 sm:text-4xl"
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
                    ["write", PanelLeftClose, "文稿"],
                    ["split", SplitSquareHorizontal, "对照"],
                    ["source", Code2, "源码"],
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
            <select
              aria-label="段落样式"
              className="h-9 min-w-28 rounded-xl border border-white/45 bg-white/65 px-3 text-xs font-black text-slate-700 outline-none transition focus:border-coral-300 dark:border-white/10 dark:bg-white/10 dark:text-slate-100"
              defaultValue="paragraph"
              onChange={(event) => {
                applyBlockStyle(event.target.value as RichBlockStyle);
                event.currentTarget.value = "paragraph";
              }}
            >
              {blockStyles.map((style) => (
                <option key={style.value} value={style.value}>
                  {style.label}
                </option>
              ))}
            </select>
            <span className="mx-1 h-7 w-px bg-slate-200 dark:bg-white/10" />
            {inlineTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.label}
                  type="button"
                  title={tool.label}
                  onClick={() =>
                    applyInlineFormat(
                      tool.command,
                      tool.markdownBefore,
                      tool.markdownAfter,
                    )
                  }
                  className="grid size-9 place-items-center rounded-xl text-slate-500 transition hover:bg-white/70 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <Icon className="size-4" />
                </button>
              );
            })}
            <span className="mx-1 h-7 w-px bg-slate-200 dark:bg-white/10" />
            {paragraphAlignTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.align}
                  type="button"
                  title={tool.label}
                  onClick={() => applyParagraphAlign(tool.align)}
                  className="grid size-9 place-items-center rounded-xl text-slate-500 transition hover:bg-white/70 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <Icon className="size-4" />
                </button>
              );
            })}
            <button
              type="button"
              title="首行缩进"
              onClick={toggleFirstLineIndent}
              className="grid size-9 place-items-center rounded-xl text-slate-500 transition hover:bg-white/70 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <ListIndentIncrease className="size-4" />
            </button>
            <span className="mx-1 h-7 w-px bg-slate-200 dark:bg-white/10" />
            <button
              type="button"
              title="引用"
              onClick={() => applyBlockStyle("quote")}
              className="grid size-9 place-items-center rounded-xl text-slate-500 transition hover:bg-white/70 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <Quote className="size-4" />
            </button>
            <button
              type="button"
              title="项目符号"
              onClick={() => applyList(false)}
              className="grid size-9 place-items-center rounded-xl text-slate-500 transition hover:bg-white/70 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <List className="size-4" />
            </button>
            <button
              type="button"
              title="编号列表"
              onClick={() => applyList(true)}
              className="grid size-9 place-items-center rounded-xl text-slate-500 transition hover:bg-white/70 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <ListOrdered className="size-4" />
            </button>
            <button
              type="button"
              title="代码块"
              onClick={insertCodeBlock}
              className="grid size-9 place-items-center rounded-xl text-slate-500 transition hover:bg-white/70 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <Code2 className="size-4" />
            </button>
            <button
              type="button"
              title="链接"
              onClick={() => setLinkDialogOpen(true)}
              className="grid size-9 place-items-center rounded-xl text-slate-500 transition hover:bg-white/70 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <Link2 className="size-4" />
            </button>
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
            {autoSaveLabel ? (
              <span
                aria-live="polite"
                className={cn(
                  "inline-flex min-h-9 items-center gap-2 rounded-full px-3 py-2 text-[11px] font-bold",
                  !uploadStatus && "lg:ml-auto",
                  autoSaveStatus === "error"
                    ? "bg-coral-100 text-coral-950 dark:bg-coral-400/15 dark:text-coral-100"
                    : autoSaveStatus === "pending" || autoSaveStatus === "saving"
                      ? "bg-sky-100 text-sky-950 dark:bg-sky-400/15 dark:text-sky-100"
                      : "bg-white/45 text-slate-500 dark:bg-white/10 dark:text-slate-300",
                )}
              >
                <Save className="size-3.5" />
                {autoSaveLabel}
              </span>
            ) : null}
            <div className="flex w-full items-center justify-end gap-2 sm:ml-auto sm:w-auto">
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
              mode === "split" && "xl:grid-cols-2",
            )}
          >
            {mode !== "preview" && mode !== "source" ? (
              <div
                className={cn(
                  "min-h-[560px] overflow-y-auto bg-slate-100/60 p-3 dark:bg-slate-950/25 sm:min-h-[660px] sm:p-6",
                  mode === "split" &&
                    "border-r border-white/35 dark:border-white/10",
                )}
              >
                <div className="mx-auto min-h-[680px] w-full max-w-[820px] rounded-sm bg-white px-5 py-8 text-slate-950 shadow-2xl shadow-slate-950/10 ring-1 ring-slate-200/70 sm:px-12 sm:py-12">
                  <div
                    ref={richEditorRef}
                    aria-label="文稿编辑器"
                    className="rich-document-editor min-h-[600px] outline-none"
                    contentEditable
                    data-placeholder="直接开始写正文，选中文本后用上方工具栏排版。"
                    role="textbox"
                    suppressContentEditableWarning
                    onInput={handleRichInput}
                    onPaste={handleRichPaste}
                  />
                </div>
              </div>
            ) : null}

            {mode === "source" ? (
              <textarea
                ref={textareaRef}
                value={form.content}
                onChange={(event) => {
                  lastRichMarkdownRef.current = event.target.value;
                  onChange({ content: event.target.value });
                }}
                placeholder="Markdown 源码..."
                className="min-h-[560px] resize-none bg-slate-950 px-5 py-7 font-mono text-[14px] leading-7 text-slate-100 outline-none selection:bg-coral-400/30 sm:min-h-[660px] sm:px-8"
              />
            ) : null}

            {mode !== "write" && mode !== "source" ? (
              <article className="min-h-[560px] overflow-y-auto bg-slate-100/45 p-3 text-slate-800 dark:bg-slate-950/15 dark:text-slate-100 sm:min-h-[660px] sm:p-6">
                <div className="mx-auto min-h-[680px] w-full max-w-[820px] rounded-sm bg-white px-5 py-8 text-slate-950 shadow-2xl shadow-slate-950/10 ring-1 ring-slate-200/70 sm:px-12 sm:py-12">
                  <MarkdownPreview value={form.content} />
                </div>
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
        confirmLabel="插入"
        defaultValue="https://"
        inputLabel="链接地址"
        open={linkDialogOpen}
        placeholder="https://example.com"
        title="插入链接"
        onSubmit={submitLinkDialog}
        onOpenChange={setLinkDialogOpen}
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
              <div
                className={cn(
                  "mb-4 rounded-2xl px-4 py-3 text-sm font-bold",
                  publishValidation.canPublish
                    ? "bg-emerald-100 text-emerald-950 dark:bg-emerald-400/15 dark:text-emerald-100"
                    : "bg-coral-100 text-coral-950 dark:bg-coral-400/15 dark:text-coral-100",
                )}
              >
                {publishValidation.canPublish
                  ? "发布信息已完整。"
                  : publishValidation.issues[0]}
              </div>
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
                    {publishValidation.normalizedSlug ? (
                      <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-300">
                        /{publishValidation.normalizedSlug}
                      </p>
                    ) : null}
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
                      {coverPreviewSrc ? (
                        <img
                          src={coverPreviewSrc}
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
                      type="text"
                      className="studio-input mt-3"
                      placeholder={uploadingCover ? "封面上传中，完成后会自动写入 URL" : undefined}
                    />
                    <p
                      className={cn(
                        "mt-2 rounded-2xl px-4 py-3 text-xs font-bold",
                        coverReference && !coverReferenceSupported
                          ? "bg-coral-100 text-coral-950 dark:bg-coral-400/15 dark:text-coral-100"
                          : "bg-white/45 text-slate-500 dark:bg-white/10 dark:text-slate-300",
                      )}
                    >
                      {coverReferenceLabel}
                    </p>
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
                disabled={isSaving || uploadingCover || !publishValidation.canPublish}
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
