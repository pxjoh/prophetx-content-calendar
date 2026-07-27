import { getDataStore } from "@/lib/data";
import { StorylinesPageClient } from "@/components/storylines/StorylinesPageClient";

export default async function StorylinesPage() {
  const store = getDataStore();
  const [storylines, leagues, games, majorEvents] = await Promise.all([
    store.listStorylines({}),
    store.listLeagues(),
    store.listGames({ includeArchived: true }),
    store.listMajorEvents({ includeArchived: true }),
  ]);

  const teams = await store.listTeams();
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const gameLabels = new Map(
    games.map((g) => [
      g.id,
      `${teamsById.get(g.away_team_id)?.short_name ?? "Away"} @ ${teamsById.get(g.home_team_id)?.short_name ?? "Home"}`,
    ])
  );
  const eventsById = new Map(majorEvents.map((e) => [e.id, e]));

  return <StorylinesPageClient storylines={storylines} leagues={leagues} gameLabels={gameLabels} eventsById={eventsById} />;
}
