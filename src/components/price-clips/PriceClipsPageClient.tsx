"use client";

import { useMemo, useState } from "react";
import { checkAllPostingCopy } from "@/lib/compliance/bannedWords";
import type { League, MarketType, PriceClipRenderWithTeams, Team } from "@/types/domain";

interface ResolvedGame {
  sportEventId: string;
  homeTeamName: string;
  awayTeamName: string;
  scheduledUtc: string;
  status: string;
}

interface ResolvedMoneyline {
  marketId: string;
  homeOutcomeId: string;
  awayOutcomeId: string;
}

interface SpreadLineInterval {
  marketId: string;
  homeOutcomeId: string;
  awayOutcomeId: string;
  homeLine: number;
  awayLine: number;
  validFromEst: string;
  validToEst: string | null;
  isCurrent: boolean;
}

function toIsoUtc(localValue: string) {
  if (!localValue) return null;
  return new Date(localValue).toISOString();
}

export function PriceClipsPageClient({
  leagues,
  teams,
  initialRenders,
}: {
  leagues: League[];
  teams: Team[];
  initialRenders: PriceClipRenderWithTeams[];
}) {
  const [leagueId, setLeagueId] = useState(leagues[0]?.id ?? "");
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [date, setDate] = useState("");
  const [marketType, setMarketType] = useState<MarketType>("moneyline");

  // Auto-lookup (verified against the real Snowflake schema — see
  // src/lib/snowflake/queries.ts). Falls back to manual entry below if it
  // can't find a match.
  const [looking, setLooking] = useState(false);
  const [lookupReason, setLookupReason] = useState<string | null>(null);
  const [resolvedGame, setResolvedGame] = useState<ResolvedGame | null>(null);
  const [resolvedMoneyline, setResolvedMoneyline] = useState<ResolvedMoneyline | null>(null);
  const [spreadLines, setSpreadLines] = useState<SpreadLineInterval[]>([]);
  const [selectedSpreadIdx, setSelectedSpreadIdx] = useState<number | null>(null);

  // Manual override / fallback fields.
  const [pxEventId, setPxEventId] = useState("");
  const [pxMarketId, setPxMarketId] = useState("");
  const [homeOutcomeId, setHomeOutcomeId] = useState("");
  const [awayOutcomeId, setAwayOutcomeId] = useState("");
  const [tipoff, setTipoff] = useState("");
  const [showManual, setShowManual] = useState(false);

  const [headline, setHeadline] = useState("");
  const [endline, setEndline] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PriceClipRenderWithTeams | null>(null);
  const [renders, setRenders] = useState(initialRenders);

  const league = leagues.find((l) => l.id === leagueId);
  const teamsForLeague = useMemo(() => teams.filter((t) => t.league_id === leagueId), [teams, leagueId]);
  const homeTeam = teams.find((t) => t.id === homeTeamId);
  const awayTeam = teams.find((t) => t.id === awayTeamId);
  const copyIssues = useMemo(() => checkAllPostingCopy(headline, endline), [headline, endline]);

  function resetLookup() {
    setResolvedGame(null);
    setResolvedMoneyline(null);
    setSpreadLines([]);
    setSelectedSpreadIdx(null);
    setLookupReason(null);
    setShowManual(false);
  }

  async function findGame() {
    if (!league || !homeTeam || !awayTeam || !date) {
      setError("Pick a league, both teams, and a date first.");
      return;
    }
    setError(null);
    resetLookup();
    setLooking(true);
    try {
      const res = await fetch("/api/price-clips/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ league: league.slug, homeTeamName: homeTeam.name, awayTeamName: awayTeam.name, date, marketType }),
      });
      const data = await res.json();
      if (!data.resolved) {
        setLookupReason(data.reason || "Couldn't resolve this game automatically.");
        setShowManual(true);
        return;
      }
      setResolvedGame(data.game);
      if (marketType === "moneyline") {
        setResolvedMoneyline(data.market);
      } else {
        setSpreadLines(data.lines);
        const currentIdx = (data.lines as SpreadLineInterval[]).findIndex((l) => l.isCurrent);
        setSelectedSpreadIdx(currentIdx >= 0 ? currentIdx : 0);
      }
    } catch (err) {
      setLookupReason(err instanceof Error ? err.message : "Lookup failed.");
      setShowManual(true);
    } finally {
      setLooking(false);
    }
  }

  async function submit() {
    setError(null);
    if (!homeTeamId || !awayTeamId) {
      setError("Pick both a home and away team.");
      return;
    }
    if (homeTeamId === awayTeamId) {
      setError("Home and away team must be different.");
      return;
    }
    if (copyIssues.length > 0) {
      setError(`Posting rules: remove "${copyIssues[0].term}" from the headline/endline.`);
      return;
    }

    const body: Record<string, unknown> = {
      leagueId,
      homeTeamId,
      awayTeamId,
      marketType,
      dataRoute: "feed",
      headline: headline.trim() || null,
      endline: endline.trim() || null,
    };

    const selectedSpread = marketType === "spread" && selectedSpreadIdx !== null ? spreadLines[selectedSpreadIdx] : null;

    if (resolvedGame && marketType === "moneyline" && resolvedMoneyline) {
      body.pxEventId = resolvedGame.sportEventId;
      body.pxMarketId = resolvedMoneyline.marketId;
      body.homeOutcomeId = resolvedMoneyline.homeOutcomeId;
      body.awayOutcomeId = resolvedMoneyline.awayOutcomeId;
      body.tipoffUtc = resolvedGame.scheduledUtc;
    } else if (resolvedGame && selectedSpread) {
      body.pxEventId = resolvedGame.sportEventId;
      body.pxMarketId = selectedSpread.marketId;
      body.homeOutcomeId = selectedSpread.homeOutcomeId;
      body.awayOutcomeId = selectedSpread.awayOutcomeId;
      body.tipoffUtc = selectedSpread.validFromEst;
      body.spreadLine = selectedSpread.homeLine;
    } else {
      if (!pxEventId || !pxMarketId || !homeOutcomeId || !awayOutcomeId || !tipoff) {
        setError("Find the game above, or fill in the manual event/market/outcome IDs and tipoff.");
        return;
      }
      body.pxEventId = pxEventId;
      body.pxMarketId = pxMarketId;
      body.homeOutcomeId = homeOutcomeId;
      body.awayOutcomeId = awayOutcomeId;
      body.tipoffUtc = toIsoUtc(tipoff);
    }

    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/price-clips/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Render failed.");
        return;
      }
      setResult(data);
      setRenders((prev) => [data, ...prev.filter((r) => r.id !== data.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Render failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-xl border border-white/10 bg-navy-900 p-4">
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">League</label>
            <select
              value={leagueId}
              onChange={(e) => {
                setLeagueId(e.target.value);
                setHomeTeamId("");
                setAwayTeamId("");
                resetLookup();
              }}
              className="w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white"
            >
              {leagues.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Away Team</label>
            <select
              value={awayTeamId}
              onChange={(e) => {
                setAwayTeamId(e.target.value);
                resetLookup();
              }}
              className="w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white"
            >
              <option value="">Select…</option>
              {teamsForLeague.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Home Team</label>
            <select
              value={homeTeamId}
              onChange={(e) => {
                setHomeTeamId(e.target.value);
                resetLookup();
              }}
              className="w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white"
            >
              <option value="">Select…</option>
              {teamsForLeague.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                resetLookup();
              }}
              className="w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        <div className="flex items-end gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Market</label>
            <select
              value={marketType}
              onChange={(e) => {
                setMarketType(e.target.value as MarketType);
                resetLookup();
              }}
              className="w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white"
            >
              <option value="moneyline">Moneyline</option>
              <option value="spread">Spread</option>
            </select>
          </div>
          <button
            type="button"
            onClick={findGame}
            disabled={looking}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-50"
          >
            {looking ? "Finding…" : "Find Game"}
          </button>
        </div>

        {resolvedGame && (
          <div className="rounded-lg border border-teal-500/30 bg-teal-500/5 p-3 text-sm">
            <p className="text-teal-300">
              Found: {resolvedGame.awayTeamName} @ {resolvedGame.homeTeamName} — {new Date(resolvedGame.scheduledUtc).toLocaleString()} (
              {resolvedGame.status})
            </p>
            {marketType === "moneyline" && resolvedMoneyline && (
              <p className="mt-1 text-xs text-slate-400">
                Market {resolvedMoneyline.marketId} · home outcome {resolvedMoneyline.homeOutcomeId} · away outcome{" "}
                {resolvedMoneyline.awayOutcomeId}
              </p>
            )}
            {marketType === "spread" && spreadLines.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-slate-400">Pick which line interval to chart (the traded contract changes when the line moves):</p>
                {spreadLines.map((l, i) => (
                  <label key={i} className="flex items-center gap-2 text-xs text-slate-300">
                    <input type="radio" checked={selectedSpreadIdx === i} onChange={() => setSelectedSpreadIdx(i)} className="accent-teal-500" />
                    {resolvedGame.homeTeamName} {l.homeLine > 0 ? `+${l.homeLine}` : l.homeLine} / {resolvedGame.awayTeamName}{" "}
                    {l.awayLine > 0 ? `+${l.awayLine}` : l.awayLine} — {new Date(l.validFromEst).toLocaleString()}
                    {l.isCurrent ? " (current)" : l.validToEst ? ` to ${new Date(l.validToEst).toLocaleString()}` : ""}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {lookupReason && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300">
            {lookupReason} Use manual entry below instead.
          </div>
        )}

        {!resolvedGame && (
          <button type="button" onClick={() => setShowManual((v) => !v)} className="text-xs text-slate-400 hover:text-white">
            {showManual ? "Hide" : "Enter event/market IDs manually instead"}
          </button>
        )}

        {showManual && !resolvedGame && (
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-white/10 p-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Event ID</label>
              <input
                value={pxEventId}
                onChange={(e) => setPxEventId(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Market ID</label>
              <input
                value={pxMarketId}
                onChange={(e) => setPxMarketId(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Home Outcome ID</label>
              <input
                value={homeOutcomeId}
                onChange={(e) => setHomeOutcomeId(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Away Outcome ID</label>
              <input
                value={awayOutcomeId}
                onChange={(e) => setAwayOutcomeId(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Tipoff</label>
              <input
                type="datetime-local"
                value={tipoff}
                onChange={(e) => setTipoff(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Headline (optional)</label>
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Hawks erase a double-digit deficit"
              className="w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Endline (optional)</label>
            <input
              value={endline}
              onChange={(e) => setEndline(e.target.value)}
              placeholder="e.g. ATL @ WAS: final prices"
              className="w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
          </div>
        </div>
        {copyIssues.length > 0 && (
          <p className="text-xs text-amber-300">
            Posting rules flag: {copyIssues.map((i) => `"${i.term}"`).join(", ")} — use trade/position/contract instead, no em dashes.
          </p>
        )}

        {error && <p className="text-xs text-red-300">{error}</p>}

        <div className="flex justify-end">
          <button
            type="button"
            disabled={submitting}
            onClick={submit}
            className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-navy-950 hover:bg-teal-400 disabled:opacity-50"
          >
            {submitting ? "Rendering… (can take a minute or two)" : "Generate Clip"}
          </button>
        </div>
      </div>

      {result && result.status === "done" && (
        <div className="space-y-3 rounded-xl border border-teal-500/30 bg-navy-900 p-4">
          <h3 className="text-sm font-semibold text-white">
            {result.away_team.abbreviation} @ {result.home_team.abbreviation}
          </h3>
          {result.video_url && (
            <video src={result.video_url} controls className="w-full max-w-lg rounded-lg border border-white/10" />
          )}
          <div className="flex gap-3 text-xs">
            {result.video_url && (
              <a href={result.video_url} download className="text-teal-300 hover:underline">
                Download MP4
              </a>
            )}
            {result.still_url && (
              <a href={result.still_url} download className="text-teal-300 hover:underline">
                Download final-frame PNG
              </a>
            )}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-white">Recent Renders</h3>
        <div className="divide-y divide-white/5 rounded-xl border border-white/10 bg-navy-900">
          {renders.length === 0 && <p className="p-4 text-sm text-slate-500">No clips rendered yet.</p>}
          {renders.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="text-white">
                  {r.away_team.abbreviation} @ {r.home_team.abbreviation}{" "}
                  <span className="text-slate-500">· {r.market_type}{r.spread_line ? ` ${r.spread_line}` : ""}</span>
                </p>
                <p className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    r.status === "done"
                      ? "bg-teal-500/10 text-teal-300"
                      : r.status === "error"
                        ? "bg-red-500/10 text-red-300"
                        : "bg-white/5 text-slate-400"
                  }`}
                >
                  {r.status}
                </span>
                {r.video_url && (
                  <a href={r.video_url} download className="text-xs text-teal-300 hover:underline">
                    Download
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
