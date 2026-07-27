"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { StorylineForm } from "./StorylineForm";
import { Badge } from "@/components/ui/Badge";
import { PRIORITY_BADGE_CLASS, PRIORITY_LABEL } from "@/lib/labels";
import { archiveStorylineAction } from "@/lib/data/actions";
import type { League, MajorEvent, Storyline } from "@/types/domain";

function contextLabel(
  s: Storyline,
  gameLabels: Map<string, string>,
  events: Map<string, MajorEvent>,
  leagues: Map<string, League>
) {
  if (s.game_id) return `Game: ${gameLabels.get(s.game_id) ?? "Unknown game"}`;
  if (s.major_event_id) return `Event: ${events.get(s.major_event_id)?.title ?? "Unknown event"}`;
  if (s.league_id) return `League-wide: ${leagues.get(s.league_id)?.name ?? "Unknown league"}`;
  return "Standalone";
}

export function StorylinesPageClient({
  storylines,
  leagues,
  gameLabels,
  eventsById,
}: {
  storylines: Storyline[];
  leagues: League[];
  gameLabels: Map<string, string>;
  eventsById: Map<string, MajorEvent>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [, startTransition] = useTransition();
  const leaguesById = new Map(leagues.map((l) => [l.id, l]));

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">Storylines</h1>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-teal-500 px-3.5 py-2 text-xs font-semibold text-navy-950 hover:bg-teal-400"
          >
            <Plus className="h-3.5 w-3.5" /> Add League-Wide Storyline
          </button>
        )}
      </div>

      {showForm && (
        <StorylineForm availableLeagues={leagues} onDone={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
      )}

      <div className="space-y-3">
        {storylines.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-500">
            No storylines yet.
          </div>
        )}
        {storylines.map((s) => (
          <div key={s.id} className="rounded-2xl border border-white/10 bg-navy-900 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <Badge className={PRIORITY_BADGE_CLASS[s.priority]}>{PRIORITY_LABEL[s.priority]}</Badge>
                  <span className="text-[11px] text-slate-500">{contextLabel(s, gameLabels, eventsById, leaguesById)}</span>
                </div>
                <h3 className="text-sm font-semibold text-white">{s.title}</h3>
                {s.description && <p className="mt-1 text-xs text-slate-400">{s.description}</p>}
                {s.relevant_players.length > 0 && (
                  <p className="mt-1 text-xs text-slate-500">Players: {s.relevant_players.join(", ")}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Archive "${s.title}"?`)) startTransition(() => void archiveStorylineAction(s.id));
                }}
                className="shrink-0 rounded-lg px-2.5 py-1 text-xs text-slate-500 hover:text-red-300"
              >
                Archive
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
