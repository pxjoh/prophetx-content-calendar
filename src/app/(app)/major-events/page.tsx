import { getDataStore } from "@/lib/data";
import { MajorEventsPageClient } from "@/components/major-events/MajorEventsPageClient";

export default async function MajorEventsPage() {
  const store = getDataStore();
  const [events, leagues] = await Promise.all([store.listMajorEvents({}), store.listLeagues()]);
  return <MajorEventsPageClient events={events} leagues={leagues} />;
}
