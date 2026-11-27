import type { StudioPostForm } from "@/components/studio/types";
import { slugify } from "@/components/studio/studio-utils";

export type LocalNodeType = "folder" | "doc";

export type LocalDocNode = {
  id: string;
  parentId: string | null;
  name: string;
  type: LocalNodeType;
  expanded?: boolean;
  content?: string;
};

export const ROOT_NODE_ID = "workspace-root";
export const CURRENT_DOC_ID = "current-post";
export const AUTO_SAVE_DELAY_MS = 2200;

export const initialNodes: LocalDocNode[] = [
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

export function createNodeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeDocName(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "untitled.md";
  }

  return trimmed.endsWith(".md") ? trimmed : `${trimmed}.md`;
}

export function getTitleFromDocName(name: string) {
  return name.replace(/\.md$/i, "");
}

export function normalizeReadingMinutes(value: number) {
  return Math.max(1, Math.min(120, Number(value) || 1));
}

export function normalizeTagsText(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .join(",");
}

export function createAutoSaveSnapshot(value: StudioPostForm) {
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

export function hasAutoSavePayload(value: StudioPostForm) {
  return Boolean(
    value.id ||
      value.title.trim() ||
      value.content.trim() ||
      value.excerpt.trim() ||
      value.coverImage.trim() ||
      value.tagsText.trim(),
  );
}

export function formatAutoSaveTime(value: Date | null) {
  if (!value) {
    return "";
  }

  return value.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function collectDescendantIds(nodes: LocalDocNode[], nodeId: string) {
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

export function buildChildrenMap(nodes: LocalDocNode[]) {
  return nodes.reduce<Record<string, LocalDocNode[]>>((map, node) => {
    if (!node.parentId) {
      return map;
    }

    map[node.parentId] = [...(map[node.parentId] ?? []), node];
    return map;
  }, {});
}
