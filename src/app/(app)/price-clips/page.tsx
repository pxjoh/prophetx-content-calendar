import { getDataStore } from "@/lib/data";
import { PriceClipsPageClient } from "@/components/price-clips/PriceClipsPageClient";

export default async function PriceClipsPage() {
  const store = getDataStore();
  const [leagues, teams, renders] = await Promise.all([
    store.listAllLeagues(),
    store.listTeams(),
    store.listPriceClipRenders(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-white">Price Clips</h1>
        <p className="text-sm text-slate-400">
          Pick two teams and a market, pull the real price history from Snowflake, and render a branded price-move
          clip. Nothing here posts anything — review every clip before it goes anywhere.
        </p>
      </div>

      <PriceClipsPageClient leagues={leagues} teams={teams} initialRenders={renders} />
    </div>
  );
}
