export const siteConfig = {
  author: "MyNewBlog",
  description:
    "A personal blog for research notes, engineering essays, reading traces, and everyday fragments.",
  keywords: [
    "research notes",
    "engineering essays",
    "reading notes",
    "personal blog",
    "studio",
  ],
  locale: "zh_CN",
  name: "MyNewBlog",
  url: "https://tong777.ccwu.cc",
} as const;

export function absoluteSiteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}

export function toAbsoluteUrl(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed || /^(data:|blob:)/i.test(trimmed)) return null;

  return new URL(trimmed, siteConfig.url).toString();
}
