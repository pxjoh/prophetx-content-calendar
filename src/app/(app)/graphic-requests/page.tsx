import { getDataStore } from "@/lib/data";
import { ContentIdeasPageClient } from "@/components/content/ContentIdeasPageClient";

export default async function GraphicRequestsPage() {
  const ideas = await getDataStore().listContentIdeas({ onlyGraphicRequests: true });
  return (
    <ContentIdeasPageClient
      ideas={ideas}
      title="Graphic Requests"
      allowCreate={false}
      emptyMessage="No active graphic requests. Add a content idea with type Graphic to create one."
    />
  );
}
