import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { siteConfig } from "@/lib/site-metadata";
import { TRPCReactProvider } from "@/trpc/provider";
import "./globals.css";

const themeBootstrapScript = `
(() => {
  try {
    const root = document.documentElement;
    const storedTheme = localStorage.getItem("mynewblog:theme");
    const theme = storedTheme === "dark" || storedTheme === "light"
      ? storedTheme
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    const storedAccent = localStorage.getItem("mynewblog:accent");
    if (storedAccent === "sakura" || storedAccent === "sky" || storedAccent === "wisteria" || storedAccent === "mint") {
      root.dataset.accent = storedAccent;
    } else {
      root.dataset.accent = "sakura";
    }
    const storedMotion = localStorage.getItem("mynewblog:motion");
    if (storedMotion === "full" || storedMotion === "subtle" || storedMotion === "off") {
      root.dataset.motion = storedMotion;
    } else {
      root.dataset.motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "off" : "full";
    }
    const storedPetals = localStorage.getItem("mynewblog:petals");
    root.dataset.petals = storedPetals === "false" ? "false" : "true";
  } catch {}
})();
`;

export const metadata: Metadata = {
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.author }],
  creator: siteConfig.author,
  description: siteConfig.description,
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
  keywords: [...siteConfig.keywords],
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    description: siteConfig.description,
    locale: siteConfig.locale,
    siteName: siteConfig.name,
    title: siteConfig.name,
    type: "website",
    url: "/",
  },
  publisher: siteConfig.author,
  robots: {
    follow: true,
    googleBot: {
      follow: true,
      index: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
    index: true,
  },
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  twitter: {
    card: "summary_large_image",
    description: siteConfig.description,
    title: siteConfig.name,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      data-accent="sakura"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="min-h-full overflow-x-hidden bg-background text-foreground">
        <ThemeProvider>
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
