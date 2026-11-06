import { NextResponse } from "next/server";
import { findGameByTeamsAndDate, resolveMoneylineMarket, resolveSpreadLineHistory } from "@/lib/snowflake/queries";

// Resolves a game's Snowflake event/market/outcome IDs from league + team
// names + date. Verified against the real schema on 2026-11-06 (see
// src/lib/snowflake/queries.ts header) — this should work reliably for any
// settled or in-progress game once the Snowflake service account exists.
export async function POST(request: Request) {
  const body = await request.json();
  const { league, homeTeamName, awayTeamName, date, marketType } = body as {
    league?: string;
    homeTeamName?: string;
    awayTeamName?: string;
    date?: string;
    marketType?: "moneyline" | "spread";
  };

  if (!league || !homeTeamName || !awayTeamName || !date || !marketType) {
    return NextResponse.json(
      { error: "league, homeTeamName, awayTeamName, date, and marketType are required." },
      { status: 400 }
    );
  }

  try {
    const games = await findGameByTeamsAndDate({ league, homeTeamName, awayTeamName, date });
    if (games.length === 0) {
      return NextResponse.json({
        resolved: false,
        reason: "No matching game found for that date/matchup. Double-check the date and team names.",
      });
    }
    const game = games[0];

    if (marketType === "moneyline") {
      const market = await resolveMoneylineMarket(game.sportEventId);
      if (!market) {
        return NextResponse.json({ resolved: false, reason: "Game found, but no moneyline market exists for it.", game });
      }
      return NextResponse.json({ resolved: true, game, market });
    }

    const lines = await resolveSpreadLineHistory(game.sportEventId);
    if (lines.length === 0) {
      return NextResponse.json({ resolved: false, reason: "Game found, but no spread line history exists for it.", game });
    }
    return NextResponse.json({ resolved: true, game, lines });
  } catch (err) {
    return NextResponse.json(
      {
        resolved: false,
        reason: "Snowflake lookup failed — enter the event/market/outcome IDs manually.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 200 }
    );
  }
}
