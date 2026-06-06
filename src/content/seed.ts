export type BlogPostPreview = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  mood: string;
  tags: string[];
  readingMinutes: number;
  viewCount: number;
  likeCount: number;
  featured: boolean;
  publishedAt: Date;
};

export type BlogMoment = {
  id: string;
  body: string;
  location: string;
  accent: "mint" | "coral" | "indigo" | "amber";
  createdAt: Date;
};

export type BlogComment = {
  id: string;
  postSlug: string;
  authorName: string;
  body: string;
  status: "approved" | "pending";
  createdAt: Date;
};

export const profile = {
  name: "MyNewBlog",
  handle: "treasure log",
  title: "A luminous notebook for code, research, and everyday fragments.",
  bio: "Built with our modern stack while borrowing the airy, transparent, personal mood of XinghuisamaBlogs.",
  avatar:
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=320&q=80",
  backgroundImages: [
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80",
    "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1800&q=80",
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1800&q=80",
  ],
};

export const seedPosts: BlogPostPreview[] = [
  {
    id: "seed-01",
    slug: "first-light",
    title: "Turning a blog into a small room of light",
    excerpt:
      "The new site starts from atmosphere, but the foundation stays practical: tRPC, Drizzle, Better Auth, Neon, and room to grow.",
    content:
      "This seed entry proves the data layer, API layer, and visual layer can work together before the full writing studio lands.",
    coverImage:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
    category: "Build Log",
    mood: "spark",
    tags: ["Next.js", "tRPC", "Drizzle"],
    readingMinutes: 5,
    viewCount: 1280,
    likeCount: 86,
    featured: true,
    publishedAt: new Date("2026-05-24T09:30:00+08:00"),
  },
  {
    id: "seed-02",
    slug: "neon-notes",
    title: "Wiring Neon into the writing system",
    excerpt:
      "When DATABASE_URL exists, the same tRPC queries switch from preview seed data to Drizzle tables backed by Postgres.",
    content:
      "The connection is guarded so local design work still feels smooth, while production can rely on Neon Postgres.",
    coverImage:
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
    category: "Database",
    mood: "focus",
    tags: ["Neon", "Postgres", "Schema"],
    readingMinutes: 4,
    viewCount: 932,
    likeCount: 64,
    featured: false,
    publishedAt: new Date("2026-05-20T21:15:00+08:00"),
  },
  {
    id: "seed-03",
    slug: "auth-room",
    title: "Better Auth guards the studio door",
    excerpt:
      "Email/password sign-in and sessions are ready for the future author dashboard, drafts, comments, and collections.",
    content:
      "Authentication stays quiet on the homepage, but the route handlers and client entry are already in place.",
    coverImage:
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",
    category: "Auth",
    mood: "calm",
    tags: ["Better Auth", "Session", "Author"],
    readingMinutes: 3,
    viewCount: 760,
    likeCount: 51,
    featured: false,
    publishedAt: new Date("2026-05-18T19:20:00+08:00"),
  },
];

export const seedMoments: BlogMoment[] = [
  {
    id: "moment-01",
    body: "Today the homepage became glassy and lived-in instead of a blank template.",
    location: "Design desk",
    accent: "coral",
    createdAt: new Date("2026-05-24T11:10:00+08:00"),
  },
  {
    id: "moment-02",
    body: "After tRPC landed, the homepage stopped being static decoration and started behaving like an application.",
    location: "API route",
    accent: "mint",
    createdAt: new Date("2026-05-23T22:00:00+08:00"),
  },
  {
    id: "moment-03",
    body: "The component system stays shadcn-like, but the surface is softer, lighter, and more personal.",
    location: "UI pass",
    accent: "indigo",
    createdAt: new Date("2026-05-22T20:40:00+08:00"),
  },
];

export const seedComments: BlogComment[] = [
  {
    id: "comment-01",
    postSlug: "first-light",
    authorName: "Mika",
    body: "This feels like a blog that remembers both experiments and small weather.",
    status: "approved",
    createdAt: new Date("2026-05-24T12:10:00+08:00"),
  },
  {
    id: "comment-02",
    postSlug: "neon-notes",
    authorName: "Aster",
    body: "The stack note is clean. I like that preview data and Neon share one API path.",
    status: "approved",
    createdAt: new Date("2026-05-23T18:35:00+08:00"),
  },
];

export const navItems = [
  { label: "Posts", href: "#posts" },
  { label: "Moments", href: "#moments" },
  { label: "Gallery", href: "#gallery" },
  { label: "Comments", href: "#comments" },
  { label: "Studio", href: "/studio" },
];
