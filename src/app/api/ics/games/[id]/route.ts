import { NextResponse } from "next/server";
import { getDataStore } from "@/lib/data";
import { buildIcsCalendar, icsResponseHeaders } from "@/lib/ics/generate";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await getDataStore().getGameDetail(id);
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });

  const calendar = buildIcsCalendar([
    {
      uid: `game-${game.id}`,
      title: `${game.away_team.name} @ ${game.home_team.name}`,
      description: [
        game.tv_network ? `TV: ${game.tv_network}` : null,
        game.odds_spread ? `Spread: ${game.odds_spread}` : null,
        game.prophetx_market_url ? `ProphetX: ${game.prophetx_market_url}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      location: game.venue,
      start: new Date(game.start_time),
      url: game.prophetx_market_url,
    },
  ]);

  return new NextResponse(calendar, { headers: icsResponseHeaders(`${game.away_team.abbreviation ?? "away"}-at-${game.home_team.abbreviation ?? "home"}.ics`) });
}
