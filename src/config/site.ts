export type AccentThemeId = "sakura" | "sky" | "wisteria" | "mint";
export type MotionLevel = "full" | "subtle" | "off";

export type AccentThemeOption = {
  id: AccentThemeId;
  label: string;
  swatch: string;
  secondary: string;
  description: string;
};

export type FriendLinkItem = {
  name: string;
  url: string;
  avatar: string;
  description: string;
  tag: string;
};

export type FriendLinkGroup = {
  title: string;
  subtitle: string;
  items: readonly FriendLinkItem[];
};

export const accentThemes: readonly AccentThemeOption[] = [
  {
    id: "sakura",
    label: "樱花晴空",
    swatch: "#ec5b8a",
    secondary: "#38bdf8",
    description: "柔和樱粉与晴空粉蓝",
  },
  {
    id: "sky",
    label: "晴空海风",
    swatch: "#0ea5e9",
    secondary: "#f472b6",
    description: "清透天蓝与微风海岸",
  },
  {
    id: "wisteria",
    label: "紫藤星海",
    swatch: "#8b5cf6",
    secondary: "#f472b6",
    description: "暮光紫藤与柔和星夜",
  },
  {
    id: "mint",
    label: "薄荷初夏",
    swatch: "#10b981",
    secondary: "#38bdf8",
    description: "青翠微风与夏日窗边",
  },
] as const;

export const defaultAccentTheme: AccentThemeId = "sakura";

/**
 * 全站个人品牌、二次元视觉、友链与关于页配置中心。
 * 后续改站点名、公告、头像、头图、友链或个人介绍，只需改这一个文件。
 */
export const blogConfig = {
  name: "MyNewBlog",
  brandPrefix: "MyNewBlog",
  brandConnector: "の",
  brandSuffix: "晴空书房",
  author: "MyNewBlog",
  authorRole: "研究 · 代码 · 轻小说式日常记录",
  subtitle:
    "把研究笔记、代码实验和微风里的日常碎片，轻轻收进一座会呼吸的二次元书房。",
  announcement:
    "晴空书房 2.0 已上线：支持圆形扩散昼夜切换、4 套日系色盘、快捷键 Ctrl+K 搜全文与右下角迷你 BGM 胶囊。",
  heroQuotes: [
    "在樱花与晴空之间，为慢一点的想法留一张书桌。",
    "记录代码、研究、阅读与微风掠过窗帘的时刻。",
    "愿每一次点开这里，都像翻开一本刚泡好茶的轻小说。",
  ],
  bio: "写代码、做研究，也收藏生活里值得反复回看的安静瞬间。",
  location: "海风与樱花之间",
  url: "https://tong777.ccwu.cc",
  locale: "zh_CN",
  foundedYear: 2026,
  keywords: [
    "个人博客",
    "研究笔记",
    "工程随笔",
    "读书札记",
    "二次元书房",
    "MyNewBlog",
  ],
  images: {
    heroDay: "/anime/hero-day.jpg",
    heroNight: "/anime/hero-night.jpg",
    avatar: "/anime/avatar.jpg",
    defaultCover: "/anime/default-cover.jpg",
  },
  navLinks: [
    { href: "/", label: "首页" },
    { href: "/posts", label: "归档" },
    { href: "/friends", label: "友链" },
    { href: "/about", label: "关于" },
    { href: "/studio", label: "创作室" },
  ],
  about: {
    greeting: "你好，欢迎来到晴空书房。",
    intro: [
      "这里是我的个人数字书房，用来安放技术研究、前端/全栈工程笔记、读书摘录，以及那些不想被信息流冲散的生活瞬间。",
      "整个站点采用 Next.js 16、tRPC、Neon Postgres、Better Auth 与 Cloudflare R2 构建，前台追求轻小说插画般的通透治愈，后台 Studio 则保留了 Word 风格写作、R2 素材库与云端曲库。",
    ],
    hobbies: [
      { title: "代码与架构", detail: "喜欢打磨顺手的小工具、全栈架构与丝滑微交互。" },
      { title: "ACG 与轻小说", detail: "偏爱治愈系风景动画、新海诚光影与日系手账排版。" },
      { title: "音乐与慢阅读", detail: "写字的时候常开着轻音乐，把零碎灵感慢慢攒成长文。" },
    ],
    techStack: [
      "Next.js 16",
      "React 19",
      "TypeScript",
      "Tailwind CSS v4",
      "Motion",
      "tRPC v11",
      "Drizzle + Neon",
      "Better Auth",
      "Cloudflare Workers & R2",
    ],
  },
  friendGroups: [
    {
      title: "灵感与美学参考",
      subtitle: "激发这座书房视觉与交互巧思的优秀开源项目",
      items: [
        {
          name: "astro-koharu",
          url: "https://github.com/cosZone/astro-koharu",
          avatar: "/anime/avatar.jpg",
          description: "粉蓝萌系二次元博客灵感来源，小春日和般的细腻交互与排版。",
          tag: "ACG 美学",
        },
        {
          name: "ShokaX",
          url: "https://github.com/theme-shoka-x/astro-blog-shokax",
          avatar: "/anime/hero-day.jpg",
          description: "经典日系 Shoka 主题现代续作，斜切卡片与动效的标杆。",
          tag: "日系经典",
        },
        {
          name: "Mizuki",
          url: "https://github.com/matsuzaka-yuki/Mizuki",
          avatar: "/anime/hero-night.jpg",
          description: "清爽 MD3 质感二次元博客，兼顾追番、日记与极速加载。",
          tag: "现代动效",
        },
      ],
    },
    {
      title: "同好友人帐",
      subtitle: "欢迎热爱写作、设计与折腾技术的朋友交换友链",
      items: [
        {
          name: "晴空书房主站",
          url: "https://tong777.ccwu.cc",
          avatar: "/anime/default-cover.jpg",
          description: "在樱花与晴空之间，为慢一点的想法留一张书桌。",
          tag: "本站",
        },
      ],
    },
  ] as readonly FriendLinkGroup[],
} as const;
