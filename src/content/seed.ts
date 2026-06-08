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
  parentId?: string | null;
  authorName: string;
  body: string;
  status: "approved" | "pending";
  createdAt: Date;
};

export const profile = {
  name: "MyNewBlog",
  handle: "treasure log",
  title: "A breathing blog for ideas, experiments, and daily fragments.",
  bio: "Research thoughts, engineering notes, reading traces, and small scenes from daily life.",
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
      "A place for research notes, code journals, reading sparks, and ordinary fragments to settle before they disappear.",
    content:
      "The first note does not need to prove much. It only has to arrange the desk, the lamp, the paper, and the doorway for the work that follows.",
    coverImage:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
    category: "Notebook",
    mood: "spark",
    tags: ["Research", "Code", "Life"],
    readingMinutes: 5,
    viewCount: 1280,
    likeCount: 86,
    featured: true,
    publishedAt: new Date("2026-05-24T09:30:00+08:00"),
  },
  {
    id: "seed-02",
    slug: "neon-notes",
    title: "Making room for slower notes",
    excerpt:
      "Some ideas should not be compressed into a status update. They need a path, a light, and space to be revised.",
    content:
      "A blog is useful because it allows unfinished thinking. Research questions, engineering choices, and reading traces can start as outlines and grow into clearer notes.",
    coverImage:
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
    category: "Writing",
    mood: "focus",
    tags: ["Notes", "Reading", "Drafts"],
    readingMinutes: 4,
    viewCount: 932,
    likeCount: 64,
    featured: false,
    publishedAt: new Date("2026-05-20T21:15:00+08:00"),
  },
  {
    id: "seed-03",
    slug: "auth-room",
    title: "A quiet door for drafts",
    excerpt:
      "The public site holds the finished pieces. The private room keeps the drafts, edits, and half-shaped thoughts out of the way.",
    content:
      "A good writing room keeps its tools in the background and leaves attention for words, images, and the moments worth recording.",
    coverImage:
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",
    category: "Studio",
    mood: "calm",
    tags: ["Drafts", "Writing", "Quiet"],
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
    body: "Today the homepage became a room someone could sit down in: posts, photos, and enough quiet space between them.",
    location: "Design desk",
    accent: "coral",
    createdAt: new Date("2026-05-24T11:10:00+08:00"),
  },
  {
    id: "moment-02",
    body: "Some engineering choices need to be written down, then reread weeks later to see whether the hesitation was useful.",
    location: "Notebook",
    accent: "mint",
    createdAt: new Date("2026-05-23T22:00:00+08:00"),
  },
  {
    id: "moment-03",
    body: "I want this place to feel light without feeling empty, quiet without feeling abandoned.",
    location: "Window light",
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
    body: "I like that the homepage does not rush to explain itself. It feels like somewhere worth returning to.",
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
