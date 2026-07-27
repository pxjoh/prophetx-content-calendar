"use client";

import { useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";
import {
  restoreContentIdeaAction,
  restoreGameAction,
  restoreMajorEventAction,
  restoreStorylineAction,
} from "@/lib/data/actions";
import type { ContentIdea, GameWithTeams, MajorEvent, Storyline } from "@/types/domain";

interface Row {
  id: string;
  kind: "Game" | "Major Event" | "Storyline" | "Content Idea";
  title: string;
  onRestore: () => void;
}

export function ArchivedPageClient({
  games,
  majorEvents,
  storylines,
  contentIdeas,
}: {
  games: GameWithTeams[];
  majorEvents: MajorEvent[];
  storylines: Storyline[];
  contentIdeas: ContentIdea[];
}) {
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();

  const rows: Row[] = useMemo(
    () => [
      ...games.map((g) => ({
        id: g.id,
        kind: "Game" as const,
        title: `${g.away_team.name} @ ${g.home_team.name}`,
        onRestore: () => startTransition(() => void restoreGameAction(g.id)),
      })),
      ...majorEvents.map((e) => ({
        id: e.id,
        kind: "Major Event" as const,
        title: e.title,
        onRestore: () => startTransition(() => void restoreMajorEventAction(e.id)),
      })),
      ...storylines.map((s) => ({
        id: s.id,
        kind: "Storyline" as const,
        title: s.title,
        onRestore: () => startTransition(() => void restoreStorylineAction(s.id)),
      })),
      ...contentIdeas.map((c) => ({
        id: c.id,
        kind: "Content Idea" as const,
        title: c.title,
        onRestore: () => startTransition(() => void restoreContentIdeaAction(c.id)),
      })),
    ],
    [games, majorEvents, storylines, contentIdeas]
  );

  const filtered = rows.filter((r) => r.title.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-lg font-semibold text-white">Archived</h1>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search archived items..."
          className="w-full rounded-lg border border-white/10 bg-navy-900 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-teal-500/50"
        />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-500">
            Nothing archived{search ? " matching that search" : ""}.
          </div>
        )}
        {filtered.map((row) => (
          <div key={`${row.kind}-${row.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-navy-900 p-3.5">
            <div>
              <span className="mr-2 rounded-full bg-navy-700 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-400 ring-1 ring-white/10">
                {row.kind}
              </span>
              <span className="text-sm text-slate-200">{row.title}</span>
            </div>
            <button
              type="button"
              onClick={row.onRestore}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-teal-300 hover:border-teal-500/30"
            >
              Restore
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
