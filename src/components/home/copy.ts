import type { Locale } from "@/components/home/types";

export const copy = {
  zh: {
    nav: ["文章", "随笔", "相册", "评论", "后台"],
    search: "搜索",
    language: "切换到英文",
    ambient: "切换背景明暗",
    heroKicker: "正在搭建一座可写作、可登录、可扩展的个人博客",
    heroTitle: "代码、研究与日常灵感的发光笔记本。",
    heroBio:
      "保留 Next.js、tRPC、TanStack、Drizzle、Neon、Better Auth 和 R2 的现代栈，同时借一点 XinghuisamaBlogs 的轻盈、透明和个人气息。",
    readLatest: "阅读最新文章",
    studioPreview: "作者后台预览",
    metrics: ["文章", "浏览", "喜欢", "评论"],
    author: "作者",
    authorBio: "写代码，做研究，也收集一点日常的光。",
    featured: "精选",
    studioStack: "创作栈",
    studioTitle: "全栈能力已预留",
    latestPosts: "最新文章",
    recentNotes: "最近写下的东西",
    minutes: "分钟",
    moments: "随笔",
    smallRecords: "碎片记录",
    photoWall: "相册墙",
    galleryPreview: "相册预览",
    newsletter: "订阅",
    newsletterTitle: "留下邮箱，等第一篇正式文章上线。",
    subscribe: "订阅更新",
    commentSystem: "评论系统",
    sayHello: "来打个招呼",
    name: "昵称",
    email: "邮箱",
    commentOn: "评论",
    postComment: "发布评论",
    sending: "发送中...",
    recentVoices: "最近的声音",
    readerNotes: "读者留言",
    live: "条",
    cards: {
      auth:
        "邮箱密码、会话和 Next route handler 已接好，后续可进入作者后台。",
      r2Ready: "上传签名已可用于 R2 桶",
      r2Pending: "R2 上传签名已搭好，等待对象存储凭证。",
      studio: "面向文章编辑、草稿、R2 媒体和评论审核继续扩展。",
    },
  },
  en: {
    nav: ["Posts", "Moments", "Gallery", "Comments", "Studio"],
    search: "Search",
    language: "Switch to Chinese",
    ambient: "Toggle background mood",
    heroKicker: "Building a personal blog with a real application core",
    heroTitle: "A luminous notebook for code, research, and everyday fragments.",
    heroBio:
      "Built with our modern stack while borrowing the airy, transparent, personal mood of XinghuisamaBlogs.",
    readLatest: "Read latest",
    studioPreview: "Studio preview",
    metrics: ["Posts", "Views", "Likes", "Comments"],
    author: "Author",
    authorBio: "Code notes, research traces, photos, and small daily signals.",
    featured: "Featured",
    studioStack: "Studio stack",
    studioTitle: "Full-stack core reserved",
    latestPosts: "Latest posts",
    recentNotes: "Recent notes",
    minutes: "min",
    moments: "Moments",
    smallRecords: "Small records",
    photoWall: "Photo wall",
    galleryPreview: "Gallery preview",
    newsletter: "Newsletter",
    newsletterTitle: "Leave an email for the first real article.",
    subscribe: "Subscribe",
    commentSystem: "Comment system",
    sayHello: "Say hello",
    name: "Name",
    email: "Email",
    commentOn: "Comment on",
    postComment: "Post comment",
    sending: "Sending...",
    recentVoices: "Recent voices",
    readerNotes: "Reader notes",
    live: "live",
    cards: {
      auth:
        "Email/password, sessions, and Next route handlers are ready for studio access.",
      r2Ready: "Upload signing is ready for",
      r2Pending:
        "R2 upload signing is scaffolded and waiting for bucket credentials.",
      studio:
        "Designed for article editing, drafts, R2 media, and comment moderation.",
    },
  },
};

export type HomeCopy = typeof copy[Locale];

type PostLocaleOverride = Partial<{
  title: string;
  excerpt: string;
  content: string;
  category: string;
}>;

type TextOverride = Partial<{ body: string }>;

export const localizedPosts: Record<Locale, Record<string, PostLocaleOverride>> = {
  zh: {
    "first-light": {
      title: "把博客做成一间会发光的书房",
      excerpt:
        "新的站点从氛围开始，但底层仍然保留 tRPC、Drizzle、Better Auth、Neon 和 R2，方便以后扩展成真正的创作系统。",
      content:
        "这篇文章是初始化内容，也验证了数据层、接口层和界面层可以一起工作。",
      category: "建站记录",
    },
    "neon-notes": {
      title: "给文章系统接好 Neon 数据库",
      excerpt:
        "配置 DATABASE_URL 后，同一套 tRPC 查询会从预览数据切换到 Drizzle 管理的 Postgres 表。",
      content:
        "数据库连接被包在可选路径里，这样设计和开发体验不会被环境变量阻塞。",
      category: "数据库",
    },
    "auth-room": {
      title: "Better Auth 负责门禁，博客负责表达",
      excerpt:
        "邮箱密码登录和 session 管线已经准备好，后续可以接作者后台、草稿箱、评论与收藏。",
      content:
        "认证系统暂时不打扰首页体验，但 API 路由和客户端入口已经准备好。",
      category: "认证",
    },
  },
  en: {},
};

export const localizedMoments: Record<Locale, Record<string, TextOverride>> = {
  zh: {
    "moment-01": {
      body: "今天把首页定成玻璃拟态，不做空洞模板，先让它像一个有人生活过的地方。",
    },
    "moment-02": {
      body: "tRPC 查询接上后，首页数据不再只是静态摆设；未来写作后台会自然长出来。",
    },
    "moment-03": {
      body: "保留 shadcn 的组件思路，但视觉不走默认后台风，而是柔和、通透、可停留。",
    },
  },
  en: {},
};

export const localizedComments: Record<Locale, Record<string, TextOverride>> = {
  zh: {
    "comment-01": {
      body: "这个博客像是能同时记住实验、天气和一点点心情的地方。",
    },
    "comment-02": {
      body: "技术栈说明很清楚，预览数据和 Neon 共用一条 API 路径这一点很舒服。",
    },
  },
  en: {},
};
