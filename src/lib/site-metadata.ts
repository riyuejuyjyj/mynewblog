import { blogConfig } from "@/config/site";

export const siteConfig = {
  author: blogConfig.author,
  description: blogConfig.subtitle,
  keywords: blogConfig.keywords,
  locale: blogConfig.locale,
  name: blogConfig.name,
  url: blogConfig.url,
} as const;

export function absoluteSiteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}

export function toAbsoluteUrl(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed || /^(data:|blob:)/i.test(trimmed)) return null;

  return new URL(trimmed, siteConfig.url).toString();
}
