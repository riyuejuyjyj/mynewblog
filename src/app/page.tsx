import { HomeExperience } from "@/components/home-experience";
import { getHomePageData } from "@/lib/blog-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { dashboard, gallery, moments, posts, recentComments } =
    await getHomePageData();

  return (
    <HomeExperience
      initialDashboard={dashboard}
      initialGallery={gallery}
      initialMoments={moments}
      initialPosts={posts}
      initialRecentComments={recentComments}
    />
  );
}
