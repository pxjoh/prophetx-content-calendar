import { getDataStore } from "@/lib/data";
import { ArchivedPageClient } from "@/components/archived/ArchivedPageClient";

export default async function ArchivedPage() {
  const store = getDataStore();
  const [games, majorEvents, storylines, contentIdeas] = await Promise.all([
    store.listGames({ includeArchived: true }),
    store.listMajorEvents({ includeArchived: true }),
    store.listStorylines({ includeArchived: true }),
    store.listContentIdeas({ includeArchived: true }),
  ]);

  return (
    <ArchivedPageClient
      games={games.filter((g) => g.archived_at)}
      majorEvents={majorEvents.filter((e) => e.archived_at)}
      storylines={storylines.filter((s) => s.archived_at)}
      contentIdeas={contentIdeas.filter((c) => c.archived_at)}
    />
  );
}
