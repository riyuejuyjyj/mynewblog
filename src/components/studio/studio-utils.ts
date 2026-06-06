import type { StudioPost, StudioPostForm } from "@/components/studio/types";

export const emptyForm: StudioPostForm = {
  slug: "",
  title: "",
  excerpt: "",
  content: [
    "## 今天想写什么？",
    "",
    "从这里开始记录代码、研究、灵感，或者任何值得保存的小小光亮。",
  ].join("\n"),
  coverImage:
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
  category: "essay",
  mood: "quiet",
  tagsText: "Next.js, Blog",
  readingMinutes: 4,
  featured: false,
  published: false,
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function postToForm(post: StudioPost): StudioPostForm {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    coverImage: post.coverImage,
    category: post.category,
    mood: "quiet",
    tagsText: post.tags.join(", "),
    readingMinutes: post.readingMinutes,
    featured: post.featured,
    published: post.published,
  };
}

export function getWordCount(value: string) {
  const cjk = value.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  const words =
    value
      .replace(/[\u4e00-\u9fff]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length || 0;

  return cjk + words;
}

export function formatStudioDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
