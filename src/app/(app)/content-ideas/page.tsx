import { getDataStore } from "@/lib/data";
import { ContentIdeasPageClient } from "@/components/content/ContentIdeasPageClient";

export default async function ContentIdeasPage() {
  const ideas = await getDataStore().listContentIdeas({});
  return <ContentIdeasPageClient ideas={ideas} title="Content Ideas" />;
}
