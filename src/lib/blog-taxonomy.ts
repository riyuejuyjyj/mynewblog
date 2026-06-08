import type { PublicPost } from "@/lib/blog-data";

export function decodeTaxonomyParam(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function getCategoryPath(category: string) {
  return `/categories/${encodeURIComponent(category)}`;
}

export function getTagPath(tag: string) {
  return `/tags/${encodeURIComponent(tag)}`;
}

export function getPostCategories(posts: PublicPost[]) {
  return Array.from(new Set(posts.map((post) => post.category)));
}

export function getPostTags(posts: PublicPost[]) {
  return Array.from(new Set(posts.flatMap((post) => post.tags)));
}
