import { getPublishedPosts, type PublicPost } from "@/lib/blog-data";
import { absoluteSiteUrl, siteConfig } from "@/lib/site-metadata";

export const revalidate = 3600;

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripMarkdown(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[([^\]]*)]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/[*_~`>#-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatRssDate(value: string) {
  return new Date(value).toUTCString();
}

function renderRssItem(post: PublicPost) {
  const url = absoluteSiteUrl(`/posts/${post.slug}`);
  const description = post.excerpt || stripMarkdown(post.content).slice(0, 220);
  const categories = [post.category, ...post.tags]
    .map((category) => `<category>${escapeXml(category)}</category>`)
    .join("");

  return `<item>
  <title>${escapeXml(post.title)}</title>
  <link>${url}</link>
  <guid isPermaLink="true">${url}</guid>
  <description>${escapeXml(description)}</description>
  <pubDate>${formatRssDate(post.publishedAt)}</pubDate>
  ${categories}
</item>`;
}

export async function GET() {
  const posts = await getPublishedPosts(100);
  const lastBuildDate = posts[0]?.updatedAt ?? posts[0]?.publishedAt;
  const feedUrl = absoluteSiteUrl("/feed.xml");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${escapeXml(siteConfig.name)}</title>
  <link>${absoluteSiteUrl("/")}</link>
  <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
  <description>${escapeXml(siteConfig.description)}</description>
  <language>zh-CN</language>
  ${lastBuildDate ? `<lastBuildDate>${formatRssDate(lastBuildDate)}</lastBuildDate>` : ""}
  ${posts.map(renderRssItem).join("\n")}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=3600",
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
