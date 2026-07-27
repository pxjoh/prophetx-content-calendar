"use client";

import { useState, useTransition } from "react";
import { addReferenceLinkAction, createStorylineAction } from "@/lib/data/actions";
import type { League, Priority, Team } from "@/types/domain";

const PRIORITY_OPTIONS: Priority[] = ["low", "normal", "high", "breaking"];

export function StorylineForm({
  gameId,
  majorEventId,
  leagueId,
  availableTeams,
  availableLeagues,
  onDone,
  onCancel,
}: {
  gameId?: string | null;
  majorEventId?: string | null;
  leagueId?: string | null;
  availableTeams?: Team[];
  /** When set (and no gameId/majorEventId), shows a league picker and the storyline is created as league-wide. */
  availableLeagues?: League[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [selectedLeagueId, setSelectedLeagueId] = useState(leagueId ?? availableLeagues?.[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [players, setPlayers] = useState("");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [referenceLink, setReferenceLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const storyline = await createStorylineAction({
        title: title.trim(),
        description: description.trim() || null,
        priority,
        game_id: gameId ?? null,
        major_event_id: majorEventId ?? null,
        league_id: gameId || majorEventId ? (leagueId ?? null) : selectedLeagueId || null,
        relevant_players: players
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
        relevant_team_ids: selectedTeams,
        notes: notes.trim() || null,
      });
      if (referenceLink.trim()) {
        await addReferenceLinkAction("storylines", storyline.id, referenceLink.trim());
      }
      onDone();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-navy-850 p-4">
      <h4 className="text-sm font-semibold text-white">New Storyline</h4>

      {!gameId && !majorEventId && availableLeagues && availableLeagues.length > 0 && (
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">League (league-wide storyline)</label>
          <select
            value={selectedLeagueId}
            onChange={(e) => setSelectedLeagueId(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white"
          >
            {availableLeagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Title *</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          placeholder="e.g. Bills' revenge-tour narrative"
        />
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white"
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p[0].toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Relevant Players</label>
          <input
            value={players}
            onChange={(e) => setPlayers(e.target.value)}
            placeholder="Comma-separated"
            className="w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
        </div>
      </div>

      {availableTeams && availableTeams.length > 0 && (
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Relevant Teams</label>
          <div className="flex flex-wrap gap-2">
            {availableTeams.map((t) => (
              <label key={t.id} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={selectedTeams.includes(t.id)}
                  onChange={(e) =>
                    setSelectedTeams((prev) => (e.target.checked ? [...prev, t.id] : prev.filter((id) => id !== t.id)))
                  }
                  className="accent-teal-500"
                />
                {t.short_name ?? t.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Reference Link</label>
        <input
          value={referenceLink}
          onChange={(e) => setReferenceLink(e.target.value)}
          placeholder="https://..."
          className="w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
        />
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
          {pending ? "Saving…" : "Add Storyline"}
        </button>
      </div>
    </div>
  );
}
