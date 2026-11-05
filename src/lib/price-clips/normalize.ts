// TypeScript port of the sports toolkit's feed_to_snapshots.py and
// px_book_to_snapshots.py (see Downloads/px_extract/px_sports/prices_sports/
// in the original kit). Converts raw Snowflake rows into the flat
// {ts, side, mid} series the render script expects — same math, just inline
// instead of writing an intermediate snapshots.jsonl file.

export interface PricePoint {
  ts: string; // ISO 8601 UTC
  side: "home" | "away";
  mid: number; // cents, 0-100, one decimal
  bid: number;
  ask: number;
  spread: number;
}

/**
 * Route A: OPENFLOW.REPORTING.BEST_ODDS_MINUTES rows
 * (T_ET, T_UTC, OUTCOME_ID, ODDS_TYPE, BEST_ODDS, PROBABILITY).
 * PREMATCH rows are used before tipoff, LIVE rows from tipoff on — mirrors
 * feed_to_snapshots.py's `(typ == 'LIVE') != (t >= tip)` filter exactly.
 */
export function normalizeFeedRows(
  rows: { tUtc: string; outcomeId: string | number; oddsType: "PREMATCH" | "LIVE"; probability: number }[],
  opts: { tipoffUtc: string; homeOutcomeId: string | number; awayOutcomeId: string | number }
): PricePoint[] {
  const tip = new Date(opts.tipoffUtc).getTime();
  const home = String(opts.homeOutcomeId);
  const away = String(opts.awayOutcomeId);

  const byTime = new Map<number, Map<string, number>>();
  for (const r of rows) {
    const t = new Date(r.tUtc).getTime();
    const isLive = r.oddsType === "LIVE";
    if (isLive !== t >= tip) continue; // keep PREMATCH before tip, LIVE at/after tip
    if (!byTime.has(t)) byTime.set(t, new Map());
    byTime.get(t)!.set(String(r.outcomeId), r.probability);
  }

  const points: PricePoint[] = [];
  for (const [t, d] of [...byTime.entries()].sort((a, b) => a[0] - b[0])) {
    let pHome: number | null = null;
    if (d.has(home) && d.has(away)) {
      pHome = d.get(home)! / (d.get(home)! + d.get(away)!);
    } else if (d.has(home)) {
      pHome = d.get(home)!;
    } else if (d.has(away)) {
      pHome = 1 - d.get(away)!;
    } else {
      continue;
    }
    const ts = new Date(t).toISOString();
    for (const [side, p] of [
      ["home", pHome],
      ["away", 1 - pHome],
    ] as const) {
      const mid = Math.round(p * 100 * 10) / 10;
      points.push({ ts, side, mid, bid: mid, ask: mid, spread: 0 });
    }
  }
  return points;
}

/**
 * Route B: PROPHET.ORDERBOOK.SNAPSHOTS rows (SNAPSHOT_AT_EST, BID, ASK in
 * cents). The book stores ONE contract per market — `homeIsStoredSide` says
 * whether the stored bid/ask belongs to the home team (true) or away team
 * (false); the other side is mirrored (100 - ask, 100 - bid). One-sided and
 * crossed (bid > ask) rows are dropped, exactly like px_book_to_snapshots.py.
 */
export function normalizeOrderbookRows(
  rows: { tsEt: string; bid: number | null; ask: number | null }[],
  opts: { homeIsStoredSide: boolean }
): PricePoint[] {
  const points: PricePoint[] = [];
  for (const r of rows) {
    if (r.bid === null || r.ask === null || r.bid > r.ask) continue;
    const ts = new Date(r.tsEt).toISOString();
    const storedBid = r.bid;
    const storedAsk = r.ask;
    const mirroredBid = Math.round((100 - storedAsk) * 10) / 10;
    const mirroredAsk = Math.round((100 - storedBid) * 10) / 10;
    const [homeBid, homeAsk, awayBid, awayAsk] = opts.homeIsStoredSide
      ? [storedBid, storedAsk, mirroredBid, mirroredAsk]
      : [mirroredBid, mirroredAsk, storedBid, storedAsk];
    for (const [side, bid, ask] of [
      ["home", homeBid, homeAsk],
      ["away", awayBid, awayAsk],
    ] as const) {
      points.push({
        ts,
        side,
        bid,
        ask,
        mid: Math.round(((bid + ask) / 2) * 10) / 10,
        spread: Math.round((ask - bid) * 10) / 10,
      });
    }
  }
  return points;
}
