import { getDataStore } from "@/lib/data";
import { LeagueToggleRow } from "@/components/leagues/LeagueToggleRow";

export default async function LeaguesPage() {
  const leagues = await getDataStore().listAllLeagues();

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-white">Leagues</h1>
        <p className="text-sm text-slate-400">
          Turn a league off to hide its games, major events, storylines, and teams from the calendar. Nothing is
          deleted — flip it back on to bring everything back.
        </p>
      </div>

      <div className="space-y-2">
        {leagues.map((league) => (
          <LeagueToggleRow key={league.id} league={league} />
        ))}
      </div>
    </div>
  );
}
