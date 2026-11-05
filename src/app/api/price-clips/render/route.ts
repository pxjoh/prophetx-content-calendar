import { NextResponse } from "next/server";
import { getDataStore } from "@/lib/data";
import { checkAllPostingCopy } from "@/lib/compliance/bannedWords";
import { fetchBestOddsMinutes, fetchOrderbookSnapshots } from "@/lib/snowflake/queries";
import { normalizeFeedRows, normalizeOrderbookRows } from "@/lib/price-clips/normalize";
import { renderPriceClip, type RenderPayload } from "@/lib/render/sandbox";
import { uploadRenderAssets } from "@/lib/storage/priceClips";
import type { Team } from "@/types/domain";

interface RenderRequestBody {
  leagueId: string;
  homeTeamId: string;
  awayTeamId: string;
  marketType: "moneyline" | "spread";
  spreadLine?: number;
  dataRoute: "feed" | "orderbook";
  pxEventId: string;
  pxMarketId: string;
  // "feed" route (OPENFLOW.REPORTING.BEST_ODDS_MINUTES)
  homeOutcomeId?: string;
  awayOutcomeId?: string;
  tipoffUtc?: string;
  // "orderbook" route (PROPHET.ORDERBOOK.SNAPSHOTS) — which side the stored
  // contract belongs to can't be determined automatically (see SPORTS.md);
  // the user must confirm it once per game.
  homeIsStoredSide?: boolean;
  since?: string;
  until?: string;
  headline?: string | null;
  endline?: string | null;
  requestedBy?: string | null;
}

function teamTile(team: Team, side: "home" | "away") {
  if (!team.abbreviation) throw new Error(`${team.name} has no abbreviation set — add one on the Teams page first.`);
  const hex = team.primary_color || "#334155";
  const color: [number, number, number] = [
    parseInt(hex.slice(1, 3), 16) || 51,
    parseInt(hex.slice(3, 5), 16) || 65,
    parseInt(hex.slice(5, 7), 16) || 85,
  ];
  return { side, name: team.name, abbr: team.abbreviation, color, role: team.short_name ?? undefined };
}

export async function POST(request: Request) {
  const body = (await request.json()) as RenderRequestBody;
  const issues = checkAllPostingCopy(body.headline, body.endline);
  if (issues.length > 0) {
    return NextResponse.json(
      { error: `Posting rules: remove "${issues[0].term}" from the headline/endline.`, issues },
      { status: 400 }
    );
  }
  if (body.dataRoute === "feed" && (!body.homeOutcomeId || !body.awayOutcomeId || !body.tipoffUtc)) {
    return NextResponse.json({ error: "homeOutcomeId, awayOutcomeId, and tipoffUtc are required for the feed data route." }, { status: 400 });
  }
  if (body.dataRoute === "orderbook" && (body.homeIsStoredSide === undefined || !body.since || !body.until)) {
    return NextResponse.json({ error: "homeIsStoredSide, since, and until are required for the orderbook data route." }, { status: 400 });
  }

  const store = getDataStore();
  const [homeTeam, awayTeam] = await Promise.all([
    store.listTeams(body.leagueId).then((teams) => teams.find((t) => t.id === body.homeTeamId)),
    store.listTeams(body.leagueId).then((teams) => teams.find((t) => t.id === body.awayTeamId)),
  ]);
  if (!homeTeam || !awayTeam) {
    return NextResponse.json({ error: "Home or away team not found in this league." }, { status: 404 });
  }

  const record = await store.createPriceClipRender({
    league_id: body.leagueId,
    home_team_id: body.homeTeamId,
    away_team_id: body.awayTeamId,
    market_type: body.marketType,
    spread_line: body.spreadLine ?? null,
    px_event_id: body.pxEventId,
    px_market_id: body.pxMarketId,
    since: body.since ?? null,
    until: body.until ?? null,
    headline: body.headline ?? null,
    endline: body.endline ?? null,
    requested_by: body.requestedBy ?? null,
  });

  try {
    await store.updatePriceClipRender(record.id, { status: "rendering" });

    let points: { home: { t: string; mid: number }[]; away: { t: string; mid: number }[] };
    if (body.dataRoute === "feed") {
      const rows = await fetchBestOddsMinutes({ eventId: body.pxEventId, marketId: body.pxMarketId });
      const normalized = normalizeFeedRows(
        rows.map((r) => ({ tUtc: r.T_UTC, outcomeId: r.OUTCOME_ID, oddsType: r.ODDS_TYPE, probability: r.PROBABILITY })),
        { tipoffUtc: body.tipoffUtc!, homeOutcomeId: body.homeOutcomeId!, awayOutcomeId: body.awayOutcomeId! }
      );
      points = {
        home: normalized.filter((p) => p.side === "home").map((p) => ({ t: p.ts, mid: p.mid })),
        away: normalized.filter((p) => p.side === "away").map((p) => ({ t: p.ts, mid: p.mid })),
      };
    } else {
      const rows = await fetchOrderbookSnapshots({
        eventId: body.pxEventId,
        marketId: body.pxMarketId,
        from: body.since!,
        to: body.until!,
      });
      const normalized = normalizeOrderbookRows(
        rows.map((r) => ({ tsEt: r.SNAPSHOT_AT_EST, bid: r.BID, ask: r.ASK })),
        { homeIsStoredSide: body.homeIsStoredSide! }
      );
      points = {
        home: normalized.filter((p) => p.side === "home").map((p) => ({ t: p.ts, mid: p.mid })),
        away: normalized.filter((p) => p.side === "away").map((p) => ({ t: p.ts, mid: p.mid })),
      };
    }

    const payload: RenderPayload = {
      label: `${awayTeam.abbreviation ?? awayTeam.name} @ ${homeTeam.abbreviation ?? homeTeam.name}`,
      sub: body.marketType === "spread" ? `Spread ${body.spreadLine ?? ""}`.trim() : "Moneyline",
      headline: body.headline ?? null,
      endline: body.endline ?? null,
      since: body.since ?? null,
      until: body.until ?? null,
      teams: [teamTile(homeTeam, "home"), teamTile(awayTeam, "away")],
      points,
    };

    const { video, still } = await renderPriceClip(payload);
    const { videoUrl, stillUrl } = await uploadRenderAssets(record.id, video, still);

    const updated = await store.updatePriceClipRender(record.id, { status: "done", video_url: videoUrl, still_url: stillUrl });
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await store.updatePriceClipRender(record.id, { status: "error", error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get("leagueId") ?? undefined;
  const renders = await getDataStore().listPriceClipRenders(leagueId ? { leagueId } : undefined);
  return NextResponse.json(renders);
}
