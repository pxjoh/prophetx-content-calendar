"use client";

import { useState, useTransition } from "react";
import { createTeamAction, updateTeamAction } from "@/lib/data/actions";
import type { League, Team } from "@/types/domain";

const DEFAULT_COLOR = "#2dd4bf";

export function TeamForm({
  league,
  existing,
  onDone,
  onCancel,
}: {
  league: League;
  /** When set, edits this team instead of creating a new one. */
  existing?: Team;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [shortName, setShortName] = useState(existing?.short_name ?? "");
  const [abbreviation, setAbbreviation] = useState(existing?.abbreviation ?? "");
  const [color, setColor] = useState(existing?.primary_color ?? DEFAULT_COLOR);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!name.trim()) {
      setError("Team name is required.");
      return;
    }
    if (!abbreviation.trim()) {
      setError("Abbreviation is required — it's what renders on the price clip tile (no logos are used).");
      return;
    }
    setError(null);
    const input = {
      league_id: league.id,
      name: name.trim(),
      short_name: shortName.trim() || null,
      abbreviation: abbreviation.trim().toUpperCase(),
      primary_color: color,
    };
    startTransition(async () => {
      if (existing) {
        await updateTeamAction(existing.id, input);
      } else {
        await createTeamAction(input);
      }
      onDone();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-navy-850 p-4">
      <h4 className="text-sm font-semibold text-white">{existing ? "Edit Team" : `New ${league.name} Team`}</h4>

      <div>
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Name *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Atlanta Hawks"
          className="w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Short Name</label>
          <input
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            placeholder="e.g. Hawks"
            className="w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Abbreviation *</label>
          <input
            value={abbreviation}
            onChange={(e) => setAbbreviation(e.target.value)}
            placeholder="e.g. ATL"
            maxLength={4}
            className="w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 uppercase"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Color</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-14 cursor-pointer rounded-lg border border-white/10 bg-navy-950 p-1"
          />
          <input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-28 rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white"
          />
          <span
            className="rounded-md px-3 py-1 text-xs font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {abbreviation.toUpperCase() || "TILE"}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          Renders as a team-color tile on price clips — no logo is used (not legally cleared).
        </p>
      </div>

      {error && <p className="text-xs text-red-300">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white">
          Cancel
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="rounded-lg bg-teal-500 px-3.5 py-1.5 text-xs font-semibold text-navy-950 hover:bg-teal-400 disabled:opacity-50"
        >
          {pending ? "Saving…" : existing ? "Save Changes" : "Add Team"}
        </button>
      </div>
    </div>
  );
}
