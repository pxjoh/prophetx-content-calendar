// Query layer for Price Clips. Two of these query shapes are confirmed real
// (copied straight from the sports toolkit's SPORTS.md, which the social
// team already runs by hand through Tensor) — `fetchBestOddsMinutes` and
// `fetchOrderbookSnapshots`. The third, `resolveGameAuto`, is NOT confirmed:
// SPORTS.md's own workflow finds a game's event_id/market_id by asking
// a human ("Ask Claude: Find <AWAY> @ <HOME> on <date>...") rather than a
// known lookup table, and resolves which outcome_id belongs to which team
// by checking the final score after the game — not something a self-serve
// tool can do automatically before/during a game.
//
// `resolveGameAuto` is written against the most likely table shape (a
// SPORT_EVENT-style table joined to SPORT_EVENT_GO_LIVE, per the join hint
// in SPORTS.md's "Scan for healthy games" section) but table/column names
// are configurable via env vars specifically so they can be corrected once
// Engineering/Analytics confirms the real schema, without touching calling
// code. Until then, expect this to fail — callers must fall back to manual
// event/market/outcome-id entry (see the lookup API route).
import { querySnowflake } from "./client";

const EVENTS_TABLE = process.env.SNOWFLAKE_SPORT_EVENTS_TABLE || "PROPHET.REFERENCE.SPORT_EVENTS";
const GO_LIVE_TABLE = process.env.SNOWFLAKE_GO_LIVE_TABLE || "PROPHET.REFERENCE.SPORT_EVENT_GO_LIVE";

export interface GameCandidate {
  eventId: string;
  marketId: string;
  marketType: "moneyline" | "spread";
  spreadLine: number | null;
  homeOutcomeId: string | null;
  awayOutcomeId: string | null;
  tipoffUtc: string;
}

/**
 * UNVERIFIED — see file header. Attempts to resolve a game + market by
 * league/team names/date. Throws if the configured table/columns don't
 * exist; callers must catch and offer manual entry.
 */
export async function resolveGameAuto(params: {
  league: string;
  homeTeamName: string;
  awayTeamName: string;
  date: string; // YYYY-MM-DD, ET
  marketType: "moneyline" | "spread";
}): Promise<GameCandidate[]> {
  const rows = await querySnowflake<{
    EVENT_ID: string;
    MARKET_ID: string;
    SPREAD_LINE: number | null;
    HOME_OUTCOME_ID: string | null;
    AWAY_OUTCOME_ID: string | null;
    TIPOFF_UTC: string;
  }>(
    `select e.EVENT_ID, e.MARKET_ID, e.SPREAD_LINE, e.HOME_OUTCOME_ID, e.AWAY_OUTCOME_ID, g.FIRST_LIVE_AT_EST as TIPOFF_UTC
     from ${EVENTS_TABLE} e
     join ${GO_LIVE_TABLE} g on g.EVENT_ID = e.EVENT_ID
     where e.SPORT = :1 and e.MARKET_TYPE = :2
       and e.HOME_TEAM_NAME = :3 and e.AWAY_TEAM_NAME = :4
       and to_date(g.FIRST_LIVE_AT_EST) = to_date(:5)`,
    [params.league, params.marketType, params.homeTeamName, params.awayTeamName, params.date]
  );
  return rows.map((r) => ({
    eventId: r.EVENT_ID,
    marketId: r.MARKET_ID,
    marketType: params.marketType,
    spreadLine: r.SPREAD_LINE,
    homeOutcomeId: r.HOME_OUTCOME_ID,
    awayOutcomeId: r.AWAY_OUTCOME_ID,
    tipoffUtc: r.TIPOFF_UTC,
  }));
}

/** Route A (confirmed shape — SPORTS.md Step 1). Outside-feed odds, not the ProphetX book. */
export async function fetchBestOddsMinutes(params: { eventId: string; marketId: string }) {
  return querySnowflake<{
    T_ET: string;
    T_UTC: string;
    OUTCOME_ID: string | number;
    ODDS_TYPE: "PREMATCH" | "LIVE";
    BEST_ODDS: number;
    PROBABILITY: number;
  }>(
    `select CONVERT_TIMEZONE('UTC','America/New_York',TIME)::TIMESTAMP_NTZ as T_ET, TIME as T_UTC,
            OUTCOME_ID, ODDS_TYPE, BEST_ODDS, PROBABILITY
     from OPENFLOW.REPORTING.BEST_ODDS_MINUTES
     where SPORT_EVENT_ID = :1 and MARKET_ID = :2
     order by T_UTC, OUTCOME_ID, ODDS_TYPE`,
    [params.eventId, params.marketId]
  );
}

/** Route B (confirmed shape — SPORTS.md Route B). ProphetX's own book; preferred when the live book is healthy. */
export async function fetchOrderbookSnapshots(params: { eventId: string; marketId: string; from: string; to: string }) {
  return querySnowflake<{ SNAPSHOT_AT_EST: string; BID: number | null; ASK: number | null }>(
    `select SNAPSHOT_AT_EST, round(BEST_BID*100,2) as BID, round(BEST_OFFER*100,2) as ASK
     from PROPHET.ORDERBOOK.SNAPSHOTS
     where EVENT_ID = :1 and MARKET_ID = :2 and SNAPSHOT_AT_EST between :3 and :4
     order by SNAPSHOT_AT_EST, SEQUENCE`,
    [params.eventId, params.marketId, params.from, params.to]
  );
}
