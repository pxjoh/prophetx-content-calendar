import { getDataStore } from "@/lib/data";
import { TeamsPageClient } from "@/components/teams/TeamsPageClient";

export default async function TeamsPage() {
  const store = getDataStore();
  const [leagues, teams] = await Promise.all([store.listAllLeagues(), store.listTeams()]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-white">Teams</h1>
        <p className="text-sm text-slate-400">
          Team name, abbreviation, and color used by Price Clips. No logos — team tiles render in color only.
        </p>
      </div>

      <TeamsPageClient leagues={leagues} teams={teams} />
    </div>
  );
}
