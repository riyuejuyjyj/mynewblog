import type { Metadata } from "next";

import { FriendsPageContent } from "@/components/friends/friends-page-content";
import { siteConfig } from "@/lib/site-metadata";

export const metadata: Metadata = {
  alternates: {
    canonical: "/friends",
  },
  description:
    "晴空书房的同好友人帐与开源视觉灵感参考，欢迎热爱写作、设计与技术的独立博客交换友链。",
  openGraph: {
    description:
      "晴空书房的同好友人帐与开源视觉灵感参考，欢迎热爱写作、设计与技术的独立博客交换友链。",
    locale: siteConfig.locale,
    siteName: siteConfig.name,
    title: "友人帐",
    type: "website",
    url: "/friends",
  },
  title: "友人帐",
  twitter: {
    card: "summary_large_image",
    description:
      "晴空书房的同好友人帐与开源视觉灵感参考，欢迎热爱写作、设计与技术的独立博客交换友链。",
    title: "友人帐",
  },
};

export default function FriendsPage() {
  return <FriendsPageContent />;
}
