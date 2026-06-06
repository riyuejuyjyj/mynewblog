import type { BlogComment, BlogMoment, BlogPostPreview } from "@/content/seed";

export type Locale = "zh" | "en";
export type AmbientMode = "day" | "night";

export type DisplayPost = Omit<BlogPostPreview, "publishedAt"> & {
  publishedAt: string;
};

export type DisplayMoment = Omit<BlogMoment, "accent" | "createdAt"> & {
  accent: string;
  createdAt: string;
};

export type DisplayComment = Omit<BlogComment, "createdAt" | "status"> & {
  status: string;
  createdAt: string;
};

export type DashboardData = {
  postCount: number;
  momentCount: number;
  commentCount: number;
  totalViews: number;
  totalLikes: number;
  stack: string[];
  databaseMode: string;
  storageMode: string;
};

export type StorageStatus = {
  provider: string;
  configured: boolean;
  bucket: string | null;
  publicBaseUrl: string | null;
};
