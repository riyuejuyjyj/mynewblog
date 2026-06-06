import type { Metadata } from "next";
import { SplashScreen } from "@/components/splash-screen";
import { ThemeProvider } from "@/components/theme-provider";
import { TRPCReactProvider } from "@/trpc/provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyNewBlog",
  description: "A glassmorphism Next.js blog powered by tRPC, Drizzle, Neon, and Better Auth.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="min-h-full overflow-x-hidden bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
        <ThemeProvider>
          <SplashScreen />
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
