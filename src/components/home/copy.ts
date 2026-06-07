import type { Locale } from "@/components/home/types";

export const copy = {
  zh: {
    nav: ["文章", "随笔", "相册", "留言", "书房"],
    language: "切换到英文",
    ambient: "切换背景明暗",
    heroKicker: "写给研究、代码和生活之间的慢速记录",
    heroTitle: "把灵感、实验和日常，安放在一座会呼吸的博客里。",
    heroBio:
      "这里记录研究想法、工程笔记、阅读摘录和小小的生活现场。少一点模板气，多一点可回来的温度。",
    readLatest: "从最新文章开始",
    studioPreview: "进入创作室",
    metrics: ["文章", "随笔", "浏览", "留言"],
    author: "作者",
    authorBio: "研究、写作、工程和生活碎片的长期收纳处。",
    featured: "精选",
    studioStack: "当前书签",
    studioTitle: "正在写作的主题",
    latestPosts: "最新文章",
    recentNotes: "最近写下的东西",
    minutes: "分钟",
    moments: "随笔",
    smallRecords: "碎片记录",
    photoWall: "相册墙",
    galleryPreview: "三张日常",
    closingKicker: "留一盏灯",
    closingTitle: "读到这里的话，也可以把一句话留在这座小书房里。",
    leaveMessage: "去留言",
    commentSystem: "留言板",
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
      writing: {
        title: "文章书桌",
        body: "长文留给研究、工程和读书笔记，让线索慢慢沉下来。",
      },
      gallery: {
        title: "影像剪影",
        body: "相册只放真正想回看的画面，不把页面变成素材堆。",
      },
      guestbook: {
        title: "读者回声",
        body: "留言会经过整理再出现，让讨论保持安静、清楚、有人味。",
      },
    },
  },
  en: {
    nav: ["Posts", "Moments", "Gallery", "Notes", "Studio"],
    language: "Switch to Chinese",
    ambient: "Toggle background mood",
    heroKicker: "Slow notes between research, code, and ordinary days",
    heroTitle: "A breathing blog for ideas, experiments, and daily fragments.",
    heroBio:
      "A place for research thoughts, engineering notes, reading traces, and small scenes from daily life.",
    readLatest: "Start with the latest",
    studioPreview: "Open studio",
    metrics: ["Posts", "Moments", "Views", "Notes"],
    author: "Author",
    authorBio: "A long-term shelf for research, writing, engineering, and daily fragments.",
    featured: "Featured",
    studioStack: "Current bookmarks",
    studioTitle: "Themes on the desk",
    latestPosts: "Latest posts",
    recentNotes: "Recent notes",
    minutes: "min",
    moments: "Moments",
    smallRecords: "Small records",
    photoWall: "Photo wall",
    galleryPreview: "Three quiet frames",
    closingKicker: "Leave a light on",
    closingTitle: "If something here stays with you, leave a small note in the room.",
    leaveMessage: "Leave a note",
    commentSystem: "Guestbook",
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
      writing: {
        title: "Writing desk",
        body: "Longer pieces hold research, engineering, and reading notes with room to breathe.",
      },
      gallery: {
        title: "Image shelf",
        body: "The gallery keeps only scenes worth returning to, not a pile of placeholders.",
      },
      guestbook: {
        title: "Reader echoes",
        body: "Notes are kept calm and considered, so the conversation still feels human.",
      },
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
        "这里会收下研究笔记、代码札记、阅读灵感和生活碎片，让内容先拥有可以停留的气味。",
      content:
        "第一篇文章不急着证明什么，只先把桌面、灯光、纸张和入口摆好，等真正的内容慢慢落座。",
      category: "书房札记",
    },
    "neon-notes": {
      title: "给慢一点的笔记留出位置",
      excerpt:
        "有些想法不适合被压缩成状态更新，它们需要一段路、一盏灯，和能反复回来修改的空间。",
      content:
        "博客最珍贵的部分，是它允许未完成。研究问题、工程判断和阅读札记都可以先留下轮廓，再慢慢长出细节。",
      category: "写作",
    },
    "auth-room": {
      title: "给创作室留一扇安静的门",
      excerpt:
        "公开页面负责表达，创作室负责整理草稿。门关上时，读者只需要看见已经准备好的部分。",
      content:
        "一个好的写作空间应该把工具收在幕后，把注意力留给文字、图片和那些真正需要被记录的时刻。",
      category: "创作室",
    },
  },
  en: {},
};

export const localizedMoments: Record<Locale, Record<string, TextOverride>> = {
  zh: {
    "moment-01": {
      body: "今天把首页收拾成一间能坐下来的书房：有文章，有照片，也有留白。",
    },
    "moment-02": {
      body: "有些工程判断需要写成笔记，过几周再回来看，才知道当时的犹豫有没有意义。",
    },
    "moment-03": {
      body: "希望这个地方轻一点，但不要空；安静一点，但仍然有人正在生活。",
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
      body: "喜欢这种不急着喊口号的首页，读起来像是可以慢慢回来。",
    },
  },
  en: {},
};
