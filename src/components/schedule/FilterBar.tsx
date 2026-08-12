"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutList, Rows3, Search, SlidersHorizontal, X } from "lucide-react";
import type { Importance, League, Team } from "@/types/domain";
import { IMPORTANCE_LABEL } from "@/lib/labels";

const TV_NETWORKS = ["NBC", "CBS", "FOX", "ABC", "ESPN", "ESPN2", "TNT", "Prime Video"];
const IMPORTANCE_OPTIONS: Importance[] = ["standard", "notable", "major", "must_cover"];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? "border-teal-500/40 bg-teal-500/10 text-teal-300"
          : "border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

export function FilterBar({ leagues, teams }: { leagues: League[]; teams: Team[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(searchParams.get("q") ?? "");

  const params = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams]);

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
      startTransition(() => router.push(`${pathname}?${next.toString()}`));
    },
    [params, pathname, router]
  );

  const toggleListParam = useCallback(
    (key: string, value: string) => {
      const current = params.get(key)?.split(",").filter(Boolean) ?? [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      setParam(key, next.length ? next.join(",") : null);
    },
    [params, setParam]
  );

  const view = params.get("view") === "list" ? "list" : "timeline";
  const activeLeagues = params.get("league")?.split(",").filter(Boolean) ?? [];
  const activeImportance = params.get("importance")?.split(",").filter(Boolean) ?? [];

  const advancedActiveCount = [
    params.get("team"),
    params.get("conference"),
    params.get("ranked"),
    params.get("rivalry"),
    params.get("playoff"),
    params.get("tournament"),
    params.get("tv"),
    params.get("ideas"),
    params.get("graphic"),
    params.get("video"),
    params.get("from"),
    params.get("to"),
    activeImportance.length ? "x" : null,
  ].filter(Boolean).length;

  const totalActiveCount = advancedActiveCount + activeLeagues.length + (params.get("q") ? 1 : 0);

  const clearAll = () => {
    setSearchValue("");
    startTransition(() => router.push(pathname));
  };

  return (
    <div className="sticky top-[57px] z-30 -mx-4 border-b border-white/10 bg-navy-950/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setParam("q", searchValue || null);
            }}
            onBlur={() => setParam("q", searchValue || null)}
            placeholder="Search teams, storylines, content ideas..."
            className="w-full rounded-lg border border-white/10 bg-navy-900 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-teal-500/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {leagues.map((l) => (
            <Chip key={l.id} active={activeLeagues.includes(l.slug)} onClick={() => toggleListParam("league", l.slug)}>
              {l.slug.toUpperCase()}
            </Chip>
          ))}
        </div>

        <div className="flex items-center gap-0.5 rounded-lg border border-white/10 p-0.5">
          <button
            type="button"
            onClick={() => setParam("view", null)}
            aria-label="Timeline view"
            title="Timeline view"
            className={`flex items-center rounded-md p-1.5 transition ${
              view === "timeline" ? "bg-teal-500/10 text-teal-300" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setParam("view", "list")}
            aria-label="Condensed list view"
            title="Condensed list view"
            className={`flex items-center rounded-md p-1.5 transition ${
              view === "list" ? "bg-teal-500/10 text-teal-300" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Rows3 className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${
            advancedActiveCount > 0 ? "border-teal-500/40 text-teal-300" : "border-white/10 text-slate-400 hover:text-slate-200"
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {advancedActiveCount > 0 && (
            <span className="rounded-full bg-teal-500/20 px-1.5 text-[10px] font-bold text-teal-300">{advancedActiveCount}</span>
          )}
        </button>

        {totalActiveCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium text-slate-500 hover:text-red-300"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {advancedOpen && (
        <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-navy-900 p-4 sm:grid-cols-3 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Team</label>
            <select
              value={params.get("team") ?? ""}
              onChange={(e) => setParam("team", e.target.value || null)}
              className="w-full rounded-lg border border-white/10 bg-navy-850 px-2.5 py-1.5 text-xs text-white"
            >
              <option value="">Any team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">TV Network</label>
            <select
              value={params.get("tv") ?? ""}
              onChange={(e) => setParam("tv", e.target.value || null)}
              className="w-full rounded-lg border border-white/10 bg-navy-850 px-2.5 py-1.5 text-xs text-white"
            >
              <option value="">Any network</option>
              {TV_NETWORKS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Content Ideas</label>
            <select
              value={params.get("ideas") ?? ""}
              onChange={(e) => setParam("ideas", e.target.value || null)}
              className="w-full rounded-lg border border-white/10 bg-navy-850 px-2.5 py-1.5 text-xs text-white"
            >
              <option value="">Any</option>
              <option value="with">With content ideas</option>
              <option value="without">Without content ideas</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Date Range</label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={params.get("from") ?? ""}
                onChange={(e) => setParam("from", e.target.value || null)}
                className="w-full rounded-lg border border-white/10 bg-navy-850 px-2 py-1.5 text-xs text-white"
              />
              <input
                type="date"
                value={params.get("to") ?? ""}
                onChange={(e) => setParam("to", e.target.value || null)}
                className="w-full rounded-lg border border-white/10 bg-navy-850 px-2 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Importance</label>
            <div className="flex flex-wrap gap-1">
              {IMPORTANCE_OPTIONS.map((imp) => (
                <Chip key={imp} active={activeImportance.includes(imp)} onClick={() => toggleListParam("importance", imp)}>
                  {IMPORTANCE_LABEL[imp]}
                </Chip>
              ))}
            </div>
          </div>

          <div className="col-span-2 flex flex-wrap items-end gap-4 sm:col-span-2 lg:col-span-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={params.get("ranked") === "1"}
                onChange={(e) => setParam("ranked", e.target.checked ? "1" : null)}
                className="accent-teal-500"
              />
              Ranked teams only
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={params.get("rivalry") === "1"}
                onChange={(e) => setParam("rivalry", e.target.checked ? "1" : null)}
                className="accent-teal-500"
              />
              Rivalry games
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={params.get("playoff") === "1"}
                onChange={(e) => setParam("playoff", e.target.checked ? "1" : null)}
                className="accent-teal-500"
              />
              Playoff implications
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={params.get("tournament") === "1"}
                onChange={(e) => setParam("tournament", e.target.checked ? "1" : null)}
                className="accent-teal-500"
              />
              Tournament implications
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={params.get("graphic") === "1"}
                onChange={(e) => setParam("graphic", e.target.checked ? "1" : null)}
                className="accent-teal-500"
              />
              Graphic requested
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={params.get("video") === "1"}
                onChange={(e) => setParam("video", e.target.checked ? "1" : null)}
                className="accent-teal-500"
              />
              Video requested
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
