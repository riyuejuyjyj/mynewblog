export type AccentThemeId = "sakura" | "sky" | "wisteria" | "mint";

export type AccentThemeOption = {
  id: AccentThemeId;
  label: string;
  swatch: string;
  description: string;
};

export const accentThemes: readonly AccentThemeOption[] = [
  {
    id: "sakura",
    label: "樱花晴空",
    swatch: "#ec5b8a",
    description: "柔和樱粉与晴空光影",
  },
  {
    id: "sky",
    label: "晴空海风",
    swatch: "#0ea5e9",
    description: "清透天蓝与微风海岸",
  },
  {
    id: "wisteria",
    label: "紫藤星海",
    swatch: "#8b5cf6",
    description: "暮光紫藤与柔和星夜",
  },
  {
    id: "mint",
    label: "薄荷初夏",
    swatch: "#10b981",
    description: "青翠微风与夏日窗边",
  },
] as const;

export const defaultAccentTheme: AccentThemeId = "sakura";

/**
 * 全站个人品牌与二次元视觉配置中心。
 * 以后修改站点名、昵称、简介、头图、头像或导航项，只需改这一个文件。
 */
export const blogConfig = {
  name: "MyNewBlog",
  brandPrefix: "MyNewBlog",
  brandConnector: "の",
  brandSuffix: "晴空书房",
  author: "MyNewBlog",
  authorRole: "研究 · 代码 · 轻小说式日常记录",
  subtitle: "把研究笔记、代码实验和微风里的日常碎片，轻轻收进一座会呼吸的二次元书房。",
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
    { href: "/#moments", label: "随笔" },
    { href: "/#comments", label: "评论" },
    { href: "/studio", label: "创作室" },
  ],
} as const;
