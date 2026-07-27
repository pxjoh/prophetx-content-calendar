import { getDataStore } from "@/lib/data";
import { ContentIdeasPageClient } from "@/components/content/ContentIdeasPageClient";

export default async function VideoRequestsPage() {
  const ideas = await getDataStore().listContentIdeas({ onlyVideoRequests: true });
  return (
    <ContentIdeasPageClient
      ideas={ideas}
      title="Video Requests"
      allowCreate={false}
      emptyMessage="No active video requests. Add a content idea with a video type to create one."
    />
  );
}
