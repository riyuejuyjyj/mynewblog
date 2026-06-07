import type { BlogComment, BlogPostPreview } from "@/content/seed";

export type PublicPostOverride = Partial<
  Pick<
    BlogPostPreview,
    "category" | "content" | "excerpt" | "mood" | "tags" | "title"
  >
>;

export type PublicCommentOverride = Partial<Pick<BlogComment, "body">>;

type PostLike = {
  category: string;
  content: string;
  excerpt: string;
  mood: string;
  slug: string;
  tags: string[];
  title: string;
};

type CommentLike = {
  body: string;
  id: string;
};

export const zhPostOverrides: Record<string, PublicPostOverride> = {
  "first-light": {
    title: "把博客做成一间会发光的书房",
    excerpt:
      "这里会收下研究笔记、代码札记、阅读灵感和生活碎片，让内容先拥有可以停留的气味。",
    content:
      "第一篇文章不急着证明什么，只先把桌面、灯光、纸张和入口摆好，等真正的内容慢慢落座。",
    category: "书房札记",
    mood: "书房光",
    tags: ["研究", "代码", "生活"],
  },
  "neon-notes": {
    title: "给慢一点的笔记留出位置",
    excerpt:
      "有些想法不适合被压缩成状态更新，它们需要一段路、一盏灯，和能反复回来修改的空间。",
    content:
      "博客最珍贵的部分，是它允许未完成。研究问题、工程判断和阅读札记都可以先留下轮廓，再慢慢长出细节。",
    category: "写作",
    mood: "专注",
    tags: ["笔记", "阅读", "草稿"],
  },
  "auth-room": {
    title: "给创作室留一扇安静的门",
    excerpt:
      "公开页面负责表达，创作室负责整理草稿。门关上时，读者只需要看见已经准备好的部分。",
    content:
      "一个好的写作空间应该把工具收在幕后，把注意力留给文字、图片和那些真正需要被记录的时刻。",
    category: "创作室",
    mood: "安静",
    tags: ["草稿", "写作", "安静"],
  },
};

export const zhCommentOverrides: Record<string, PublicCommentOverride> = {
  "comment-01": {
    body: "这个博客像是能同时记住实验、天气和一点点心情的地方。",
  },
  "comment-02": {
    body: "喜欢这种不急着喊口号的首页，读起来像是可以慢慢回来。",
  },
};

export function withZhPostOverride<T extends PostLike>(post: T): T {
  const override = zhPostOverrides[post.slug];

  return override ? { ...post, ...override } : post;
}

export function withZhCommentOverride<T extends CommentLike>(comment: T): T {
  const override = zhCommentOverrides[comment.id];

  return override ? { ...comment, ...override } : comment;
}
