"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { GameDetailModal } from "./GameDetailModal";
import { formatTimelineDate, groupByMonth } from "@/lib/utils/dates";
import type { GameWithTeams, League, MajorEvent } from "@/types/domain";

export type TimelineItem =
  | { kind: "game"; id: string; date: Date; game: GameWithTeams }
  | { kind: "event"; id: string; date: Date; event: MajorEvent };

function isMajorItem(item: TimelineItem): boolean {
  if (item.kind === "event") return true;
  return item.game.importance === "major" || item.game.importance === "must_cover";
}

const LEAGUE_TAG_CLASS: Record<string, string> = {
  nfl: "bg-amber-500/10 text-amber-300",
  cfb: "bg-orange-500/10 text-orange-300",
  nba: "bg-sky-500/10 text-sky-300",
  cbb: "bg-violet-500/10 text-violet-300",
};

const LEAGUE_EMOJI: Record<string, string> = {
  nfl: "🏈",
  cfb: "🏈",
  nba: "🏀",
  cbb: "🏀",
};

function TimelineCard({ item, onSelectGame }: { item: TimelineItem; onSelectGame: (id: string) => void }) {
  if (item.kind === "game") {
    const { game } = item;
    const leagueSlug = game.league.slug;
    const bodyLines: string[] = [];
    if (game.notes) bodyLines.push(game.notes);
    if (game.rivalry_name) bodyLines.push(game.rivalry_name);
    if (game.playoff_implications) bodyLines.push(game.playoff_implications);
    if (game.tournament_implications) bodyLines.push(game.tournament_implications);
    if (game.conference_implications) bodyLines.push(game.conference_implications);
    if (game.tv_network) bodyLines.push(`Broadcasting on ${game.tv_network}`);
    bodyLines.push(
      `${game.storyline_count} storyline${game.storyline_count === 1 ? "" : "s"} · ${game.content_idea_count} content idea${
        game.content_idea_count === 1 ? "" : "s"
      } tracked`
    );

    return (
      <button
        type="button"
        onClick={() => onSelectGame(game.id)}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-navy-900 p-5 text-left transition hover:border-green-400/30"
      >
        <div className="mb-1 text-xs font-bold uppercase tracking-wide text-green-400">{formatTimelineDate(item.date)}</div>
        <h3 className="mb-2 text-base font-bold text-white sm:text-lg">
          {game.away_team.name} @ {game.home_team.name}
        </h3>
        <span
          className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            LEAGUE_TAG_CLASS[leagueSlug] ?? "bg-navy-700 text-slate-300"
          }`}
        >
          {LEAGUE_EMOJI[leagueSlug] ?? "🎯"} {game.league.name}
        </span>
        <div className="mt-3 space-y-1.5">
          {bodyLines.map((line, i) => (
            <p key={i} className="text-sm text-slate-300">
              {line}
            </p>
          ))}
        </div>
      </button>
    );
  }

  const { event } = item;
  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-navy-900 p-5 text-left">
      <div className="mb-1 text-xs font-bold uppercase tracking-wide text-green-400">{formatTimelineDate(item.date)}</div>
      <h3 className="mb-2 text-base font-bold text-white sm:text-lg">{event.title}</h3>
      <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-navy-700 px-3 py-1 text-xs font-semibold text-slate-300">
        📌 Major Event
      </span>
      <div className="mt-3 space-y-1.5">
        {event.description && <p className="text-sm text-slate-300">{event.description}</p>}
        {event.notes && <p className="text-sm text-slate-300">{event.notes}</p>}
      </div>
    </div>
  );
}

function MonthGroupSection({
  label,
  items,
  onSelectGame,
}: {
  label: string;
  items: TimelineItem[];
  onSelectGame: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const majorItems = items.filter(isMajorItem);
  const canCollapse = majorItems.length > 0 && majorItems.length < items.length;
  const visibleItems = expanded || !canCollapse ? items : majorItems;
  const hiddenCount = items.length - visibleItems.length;

  return (
    <div>
      <div className="relative z-10 mb-6 flex justify-center sm:mb-10">
        <span className="rounded-full bg-green-400 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-navy-950">{label}</span>
      </div>

      <div className="space-y-6 sm:space-y-10">
        {visibleItems.map((item, i) => {
          const isLeft = i % 2 === 0;
          return (
            <div key={item.id} className="relative">
              <div className="sm:hidden">
                <TimelineCard item={item} onSelectGame={onSelectGame} />
              </div>
              <div className="hidden sm:grid sm:grid-cols-2 sm:gap-x-10">
                <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-950 ring-2 ring-green-400">
                    <span className="h-2 w-2 rounded-full bg-green-400" />
                  </span>
                </div>
                <div className={isLeft ? "flex justify-end pr-10" : ""}>
                  {isLeft && <TimelineCard item={item} onSelectGame={onSelectGame} />}
                </div>
                <div className={!isLeft ? "col-start-2 flex justify-start pl-10" : ""}>
                  {!isLeft && <TimelineCard item={item} onSelectGame={onSelectGame} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {canCollapse && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-green-400 hover:text-green-300"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" /> Show fewer
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" /> See {hiddenCount} more
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export function GameTimeline({ items }: { items: TimelineItem[]; leagues?: League[] }) {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const monthGroups = groupByMonth(items, (item) => item.date);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-500">
        No games or events match the current filters.
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-white/10 sm:block" />
      <div className="space-y-10">
        {monthGroups.map((group) => (
          <MonthGroupSection key={group.key} label={group.label} items={group.items} onSelectGame={setSelectedGameId} />
        ))}
      </div>

      {selectedGameId && <GameDetailModal gameId={selectedGameId} onClose={() => setSelectedGameId(null)} />}
    </div>
  );
}
