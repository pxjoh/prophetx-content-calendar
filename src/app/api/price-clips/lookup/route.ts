import { NextResponse } from "next/server";
import { resolveGameAuto } from "@/lib/snowflake/queries";

// Tries to auto-resolve a game's Snowflake event/market/outcome IDs from
// league + team names + date. This is expected to fail until the real
// SPORT_EVENT-style schema is confirmed (see src/lib/snowflake/queries.ts
// header) — callers should treat `resolved: false` as normal, not an
// error, and fall back to manual event/market ID entry in the UI.
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
    const candidates = await resolveGameAuto({ league, homeTeamName, awayTeamName, date, marketType });
    if (candidates.length === 0) {
      return NextResponse.json({
        resolved: false,
        reason: "No matching game found for that date/matchup. Double-check the date, or enter the event/market IDs manually.",
      });
    }
    return NextResponse.json({ resolved: true, candidates });
  } catch (err) {
    return NextResponse.json({
      resolved: false,
      reason:
        "Auto-lookup isn't wired to a confirmed Snowflake schema yet — enter the event ID, market ID, and outcome IDs manually (see SPORTS.md Step 1 for how to find them).",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
