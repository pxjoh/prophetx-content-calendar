// Query layer for Price Clips. All of these are now verified against the
// real Snowflake schema (explored live via Tensor on 2026-11-06), replacing
// an earlier version of this file that guessed table names for the
// game-lookup query. Key finding: team <-> outcome mapping does NOT require
// checking the final score (SPORTS.md's manual workaround) — it's a
// structural join:
//   OPENFLOW.REPORTING.SPORT_EVENTS      one row per game
//   OPENFLOW.REPORTING.TOURNAMENTS       TOURNAMENTS.NAME disambiguates
//                                        league (NBA vs NCAAB both share
//                                        SPORT_ID=2 "Basketball", etc.)
//   OPENFLOW.REPORTING.SPORT_EVENT_COMPETITORS  SPORT_EVENT_ID -> COMPETITOR_ID,
//                                        SEQ: verified 0=home, 1=away across
//                                        multiple real games (NBA 2026-11).
//   OPENFLOW.REPORTING.COMPETITORS       COMPETITOR_ID -> team NAME
//   OPENFLOW.REPORTING.MARKETS /
//   OPENFLOW.REPORTING.MARKET_DESCRIPTIONS   MARKET_DESCRIPTIONS.ID is a
//                                        GLOBAL market-template id (e.g. 219
//                                        = "Moneyline" for every game of
//                                        every sport); MARKET_DESCRIPTIONS.TYPE
//                                        / SUB_TYPE select moneyline vs spread.
//   OPENFLOW.REPORTING.OUTCOME_DESCRIPTIONS  per market-template outcome
//                                        slots, literally named
//                                        "{$competitor1}" / "{$competitor2}"
//                                        — competitor1 is always the SEQ=0
//                                        (home) team's slot, competitor2 is
//                                        always SEQ=1 (away), verified
//                                        against real settled games.
//   PROPHET.ANALYTICS.MARKET_LINE_MOVEMENTS  SCD-2 history of the "main"
//                                        spread/total line, with
//                                        MAIN_LINE_SIDES giving the signed
//                                        line + outcome_id per side at each
//                                        interval — needed because a spread
//                                        market's specific traded contract
//                                        (outcome_id pair) changes as the
//                                        line moves.
import { querySnowflake } from "./client";

const TOURNAMENT_NAME_BY_LEAGUE: Record<string, string> = {
  nba: "NBA",
  nfl: "NFL",
  mlb: "MLB",
  nhl: "NHL",
  cfb: "NCAAF",
  cbb: "NCAAB",
};

export interface GameCandidate {
  sportEventId: string;
  homeTeamName: string;
  awayTeamName: string;
  scheduledUtc: string;
  status: string;
}

/** Finds a game by league slug (nba/nfl/mlb/nhl/cfb/cbb) + team names + an ET calendar date (YYYY-MM-DD). */
export async function findGameByTeamsAndDate(params: {
  league: string;
  homeTeamName: string;
  awayTeamName: string;
  date: string;
}): Promise<GameCandidate[]> {
  const tournamentName = TOURNAMENT_NAME_BY_LEAGUE[params.league];
  if (!tournamentName) throw new Error(`Unknown league "${params.league}" — no Snowflake tournament mapping configured.`);

  const nextDay = new Date(`${params.date}T00:00:00Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const nextDate = nextDay.toISOString().slice(0, 10);

  const rows = await querySnowflake<{
    SPORT_EVENT_ID: string;
    HOME_NAME: string;
    AWAY_NAME: string;
    SCHEDULED: string;
    STATUS: string;
  }>(
    `select e.ID as SPORT_EVENT_ID, home.NAME as HOME_NAME, away.NAME as AWAY_NAME, e.SCHEDULED, e.STATUS
     from OPENFLOW.REPORTING.SPORT_EVENTS e
     join OPENFLOW.REPORTING.TOURNAMENTS t on t.ID = e.TOURNAMENT_ID
     join (
       select sec.SPORT_EVENT_ID, c.NAME
       from OPENFLOW.REPORTING.SPORT_EVENT_COMPETITORS sec
       join OPENFLOW.REPORTING.COMPETITORS c on c.ID = sec.COMPETITOR_ID
       where sec.SEQ = 0
     ) home on home.SPORT_EVENT_ID = e.ID
     join (
       select sec.SPORT_EVENT_ID, c.NAME
       from OPENFLOW.REPORTING.SPORT_EVENT_COMPETITORS sec
       join OPENFLOW.REPORTING.COMPETITORS c on c.ID = sec.COMPETITOR_ID
       where sec.SEQ = 1
     ) away on away.SPORT_EVENT_ID = e.ID
     where t.NAME = :1
       and home.NAME ilike :2 and away.NAME ilike :3
       and e.SCHEDULED >= convert_timezone('America/New_York', 'UTC', :4::timestamp_ntz)
       and e.SCHEDULED <  convert_timezone('America/New_York', 'UTC', :5::timestamp_ntz)
     order by e.SCHEDULED`,
    [tournamentName, `%${params.homeTeamName}%`, `%${params.awayTeamName}%`, `${params.date} 00:00:00`, `${nextDate} 00:00:00`]
  );
  return rows.map((r) => ({
    sportEventId: r.SPORT_EVENT_ID,
    homeTeamName: r.HOME_NAME,
    awayTeamName: r.AWAY_NAME,
    scheduledUtc: r.SCHEDULED,
    status: r.STATUS,
  }));
}

export interface MoneylineMarket {
  marketId: string;
  homeOutcomeId: string;
  awayOutcomeId: string;
}

/** Resolves the full-game moneyline market + its home/away outcome ids for one event. */
export async function resolveMoneylineMarket(sportEventId: string): Promise<MoneylineMarket | null> {
  const rows = await querySnowflake<{ MARKET_ID: string; OUTCOME_ID: string; NAME: string }>(
    `select m.MARKET_ID, od.ID as OUTCOME_ID, od.NAME
     from OPENFLOW.REPORTING.MARKETS m
     join OPENFLOW.REPORTING.MARKET_DESCRIPTIONS md on md.ID = m.MARKET_ID
     join OPENFLOW.REPORTING.OUTCOME_DESCRIPTIONS od on od.MARKET_ID = m.MARKET_ID
     where m.SPORT_EVENT_ID = :1 and md.TYPE = 'moneyline' and md.SUB_TYPE = 'moneyline'`,
    [sportEventId]
  );
  if (rows.length === 0) return null;
  const home = rows.find((r) => r.NAME.includes("competitor1"));
  const away = rows.find((r) => r.NAME.includes("competitor2"));
  if (!home || !away) return null;
  return { marketId: home.MARKET_ID, homeOutcomeId: home.OUTCOME_ID, awayOutcomeId: away.OUTCOME_ID };
}

export interface SpreadLineInterval {
  marketId: string;
  homeOutcomeId: string;
  awayOutcomeId: string;
  homeLine: number;
  awayLine: number;
  validFromEst: string;
  validToEst: string | null;
  isCurrent: boolean;
}

/**
 * Lists every historical "main line" interval for the full-game spread
 * market. Each interval has its own outcome_id pair — the specific traded
 * contract changes when the main line moves — so the caller (or the UI)
 * picks ONE interval's outcome pair to chart, rather than assuming a single
 * pair covers the whole game.
 */
export async function resolveSpreadLineHistory(sportEventId: string): Promise<SpreadLineInterval[]> {
  const marketRows = await querySnowflake<{ MARKET_ID: string }>(
    `select distinct m.MARKET_ID
     from OPENFLOW.REPORTING.MARKETS m
     join OPENFLOW.REPORTING.MARKET_DESCRIPTIONS md on md.ID = m.MARKET_ID
     where m.SPORT_EVENT_ID = :1 and md.TYPE = 'spread' and md.SUB_TYPE = 'spread'`,
    [sportEventId]
  );
  const marketId = marketRows[0]?.MARKET_ID;
  if (!marketId) return [];

  // Need to know which outcome id is home vs away — same competitor1/competitor2 convention as moneyline.
  const outcomeRows = await querySnowflake<{ OUTCOME_ID: string; NAME: string }>(
    `select ID as OUTCOME_ID, NAME from OPENFLOW.REPORTING.OUTCOME_DESCRIPTIONS where MARKET_ID = :1`,
    [marketId]
  );
  const homeIsCompetitor1 = true; // verified: SEQ=0 (home) always fills the competitor1 slot

  const rows = await querySnowflake<{
    MAIN_LINE_SIDES: string | { line: number; market_line_id: number; outcome_id: number }[];
    VALID_FROM_EST: string;
    VALID_TO_EST: string | null;
    IS_CURRENT: boolean;
  }>(
    `select MAIN_LINE_SIDES, VALID_FROM_EST, VALID_TO_EST, IS_CURRENT
     from PROPHET.ANALYTICS.MARKET_LINE_MOVEMENTS
     where SPORT_EVENT_ID = :1 and MARKET_ID = :2
     order by VALID_FROM_EST`,
    [sportEventId, marketId]
  );

  return rows
    .map((r) => {
      const sides: { line: number; market_line_id: number; outcome_id: number }[] =
        typeof r.MAIN_LINE_SIDES === "string" ? JSON.parse(r.MAIN_LINE_SIDES) : r.MAIN_LINE_SIDES;
      const bySide = new Map(sides.map((s) => [String(s.outcome_id), s.line]));
      const competitor1Outcome = outcomeRows.find((o) => o.NAME.includes("competitor1"))?.OUTCOME_ID;
      const competitor2Outcome = outcomeRows.find((o) => o.NAME.includes("competitor2"))?.OUTCOME_ID;
      const homeOutcomeId = homeIsCompetitor1 ? competitor1Outcome : competitor2Outcome;
      const awayOutcomeId = homeIsCompetitor1 ? competitor2Outcome : competitor1Outcome;
      if (!homeOutcomeId || !awayOutcomeId || !bySide.has(homeOutcomeId) || !bySide.has(awayOutcomeId)) return null;
      return {
        marketId,
        homeOutcomeId,
        awayOutcomeId,
        homeLine: bySide.get(homeOutcomeId)!,
        awayLine: bySide.get(awayOutcomeId)!,
        validFromEst: r.VALID_FROM_EST,
        validToEst: r.VALID_TO_EST,
        isCurrent: r.IS_CURRENT,
      };
    })
    .filter((x): x is SpreadLineInterval => x !== null);
}

/** Outside-feed odds (verified real shape: OPENFLOW.REPORTING.BEST_ODDS_MINUTES). */
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

/** ProphetX's own order book (verified real shape: PROPHET.ORDERBOOK.SNAPSHOTS). Preferred when the live book is healthy. */
export async function fetchOrderbookSnapshots(params: { eventId: string; marketId: string; from: string; to: string }) {
  return querySnowflake<{ SNAPSHOT_AT_EST: string; BID: number | null; ASK: number | null }>(
    `select SNAPSHOT_AT_EST, round(BEST_BID*100,2) as BID, round(BEST_OFFER*100,2) as ASK
     from PROPHET.ORDERBOOK.SNAPSHOTS
     where EVENT_ID = :1 and MARKET_ID = :2 and SNAPSHOT_AT_EST between :3 and :4
     order by SNAPSHOT_AT_EST, SEQUENCE`,
    [params.eventId, params.marketId, params.from, params.to]
  );
}
