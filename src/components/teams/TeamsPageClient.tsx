"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteTeamAction } from "@/lib/data/actions";
import { TeamForm } from "./TeamForm";
import type { League, Team } from "@/types/domain";

export function TeamsPageClient({ leagues, teams }: { leagues: League[]; teams: Team[] }) {
  const [leagueId, setLeagueId] = useState(leagues[0]?.id ?? "");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const league = leagues.find((l) => l.id === leagueId);
  const teamsForLeague = useMemo(
    () => teams.filter((t) => t.league_id === leagueId).sort((a, b) => a.name.localeCompare(b.name)),
    [teams, leagueId]
  );

  if (!league) {
    return <p className="text-sm text-slate-400">No leagues yet — add one from the Leagues page first.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {leagues.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => {
              setLeagueId(l.id);
              setAdding(false);
              setEditingId(null);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              l.id === leagueId ? "bg-teal-500/10 text-teal-300" : "text-slate-400 hover:text-white"
            }`}
          >
            {l.name}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {teamsForLeague.length} team{teamsForLeague.length === 1 ? "" : "s"} in {league.name}
        </p>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-semibold text-navy-950 hover:bg-teal-400"
          >
            <Plus className="h-3.5 w-3.5" /> Add Team
          </button>
        )}
      </div>

      {adding && <TeamForm league={league} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} />}

      <div className="divide-y divide-white/5 rounded-xl border border-white/10 bg-navy-900">
        {teamsForLeague.length === 0 && !adding && (
          <p className="p-4 text-sm text-slate-500">No teams yet for {league.name}.</p>
        )}
        {teamsForLeague.map((team) =>
          editingId === team.id ? (
            <div key={team.id} className="p-3">
              <TeamForm
                league={league}
                existing={team}
                onDone={() => setEditingId(null)}
                onCancel={() => setEditingId(null)}
              />
            </div>
          ) : (
            <div key={team.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                  style={{ backgroundColor: team.primary_color ?? "#334155" }}
                >
                  {team.abbreviation ?? "—"}
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{team.name}</p>
                  <p className="text-xs text-slate-500">{team.short_name ?? team.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditingId(team.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
                  aria-label={`Edit ${team.name}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!confirm(`Delete ${team.name}? This can't be undone.`)) return;
                    startTransition(() => void deleteTeamAction(team.id));
                  }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-300"
                  aria-label={`Delete ${team.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
