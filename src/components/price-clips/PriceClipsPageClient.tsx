"use client";

import { useMemo, useState } from "react";
import { checkAllPostingCopy } from "@/lib/compliance/bannedWords";
import type { League, MarketType, PriceClipRenderWithTeams, Team } from "@/types/domain";

type DataRoute = "feed" | "orderbook";

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
  const [marketType, setMarketType] = useState<MarketType>("moneyline");
  const [spreadLine, setSpreadLine] = useState("");
  const [dataRoute, setDataRoute] = useState<DataRoute>("feed");

  const [pxEventId, setPxEventId] = useState("");
  const [pxMarketId, setPxMarketId] = useState("");
  const [homeOutcomeId, setHomeOutcomeId] = useState("");
  const [awayOutcomeId, setAwayOutcomeId] = useState("");
  const [tipoff, setTipoff] = useState("");
  const [homeIsStoredSide, setHomeIsStoredSide] = useState(true);
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");

  const [headline, setHeadline] = useState("");
  const [endline, setEndline] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PriceClipRenderWithTeams | null>(null);
  const [renders, setRenders] = useState(initialRenders);

  const teamsForLeague = useMemo(() => teams.filter((t) => t.league_id === leagueId), [teams, leagueId]);
  const copyIssues = useMemo(() => checkAllPostingCopy(headline, endline), [headline, endline]);

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
    if (!pxEventId || !pxMarketId) {
      setError("Event ID and Market ID are required.");
      return;
    }

    const body: Record<string, unknown> = {
      leagueId,
      homeTeamId,
      awayTeamId,
      marketType,
      spreadLine: marketType === "spread" ? Number(spreadLine) : undefined,
      dataRoute,
      pxEventId,
      pxMarketId,
      headline: headline.trim() || null,
      endline: endline.trim() || null,
    };
    if (dataRoute === "feed") {
      if (!homeOutcomeId || !awayOutcomeId || !tipoff) {
        setError("Home/away outcome IDs and tipoff are required for the feed data route.");
        return;
      }
      body.homeOutcomeId = homeOutcomeId;
      body.awayOutcomeId = awayOutcomeId;
      body.tipoffUtc = toIsoUtc(tipoff);
    } else {
      if (!since || !until) {
        setError("Since/until are required for the orderbook data route.");
        return;
      }
      body.homeIsStoredSide = homeIsStoredSide;
      body.since = toIsoUtc(since);
      body.until = toIsoUtc(until);
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
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">League</label>
            <select
              value={leagueId}
              onChange={(e) => {
                setLeagueId(e.target.value);
                setHomeTeamId("");
                setAwayTeamId("");
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
              onChange={(e) => setAwayTeamId(e.target.value)}
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
              onChange={(e) => setHomeTeamId(e.target.value)}
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
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Market</label>
            <select
              value={marketType}
              onChange={(e) => setMarketType(e.target.value as MarketType)}
              className="w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white"
            >
              <option value="moneyline">Moneyline</option>
              <option value="spread">Spread</option>
            </select>
          </div>
          {marketType === "spread" && (
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Spread Line (home)</label>
              <input
                value={spreadLine}
                onChange={(e) => setSpreadLine(e.target.value)}
                placeholder="e.g. -5.5"
                className="w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
              />
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Snowflake Data Route</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDataRoute("feed")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${dataRoute === "feed" ? "bg-teal-500/10 text-teal-300" : "text-slate-400 hover:text-white"}`}
            >
              Outside feed (BEST_ODDS_MINUTES)
            </button>
            <button
              type="button"
              onClick={() => setDataRoute("orderbook")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${dataRoute === "orderbook" ? "bg-teal-500/10 text-teal-300" : "text-slate-400 hover:text-white"}`}
            >
              ProphetX book (ORDERBOOK.SNAPSHOTS)
            </button>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Prefer the ProphetX book when it&apos;s healthy (two-sided, few crossed rows); fall back to the outside
            feed otherwise. See SPORTS.md for how to check.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
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
        </div>

        {dataRoute === "feed" ? (
          <div className="grid grid-cols-3 gap-3">
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
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Tipoff (ET)</label>
              <input
                type="datetime-local"
                value={tipoff}
                onChange={(e) => setTipoff(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Stored side is…</label>
              <select
                value={homeIsStoredSide ? "home" : "away"}
                onChange={(e) => setHomeIsStoredSide(e.target.value === "home")}
                className="w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white"
              >
                <option value="home">Home team</option>
                <option value="away">Away team</option>
              </select>
              <p className="mt-1 text-[11px] text-slate-500">Confirm from the final score (loser&apos;s price ends near 0).</p>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Since</label>
              <input
                type="datetime-local"
                value={since}
                onChange={(e) => setSince(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Until</label>
              <input
                type="datetime-local"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
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
