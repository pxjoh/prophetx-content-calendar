"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CalendarPlus, ExternalLink, ImageIcon, Plus, Video, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { TeamMark } from "./TeamMark";
import { StorylineForm } from "@/components/storylines/StorylineForm";
import { ContentIdeaForm } from "@/components/content/ContentIdeaForm";
import { archiveGameAction, updateContentIdeaAction } from "@/lib/data/actions";
import { IMPORTANCE_BADGE_CLASS, IMPORTANCE_LABEL, PRIORITY_BADGE_CLASS, PRIORITY_LABEL, STATUS_BADGE_CLASS, STATUS_LABEL, CONTENT_TYPE_LABEL, PLATFORM_LABEL } from "@/lib/labels";
import { formatGameDate, formatGameTime } from "@/lib/utils/dates";
import type { ContentStatus, GameDetail } from "@/types/domain";

const STATUS_OPTIONS: ContentStatus[] = ["idea", "in_progress", "ready", "scheduled", "posted", "archived"];

export function GameDetailContent({
  detail,
  onClose,
  showFullPageLink = true,
  onChanged,
}: {
  detail: GameDetail;
  onClose?: () => void;
  showFullPageLink?: boolean;
  onChanged?: () => void;
}) {
  const [showStorylineForm, setShowStorylineForm] = useState(false);
  const [showIdeaForm, setShowIdeaForm] = useState(false);
  const [, startTransition] = useTransition();

  const implications = [
    detail.playoff_implications,
    detail.tournament_implications,
    detail.conference_implications,
  ].filter(Boolean);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className="bg-navy-700 text-slate-300 ring-1 ring-white/10">{detail.league.name}</Badge>
          <Badge className={IMPORTANCE_BADGE_CLASS[detail.importance]}>
            {IMPORTANCE_LABEL[detail.importance]} {!detail.importance_is_manual && <span className="opacity-70">(auto)</span>}
          </Badge>
          {detail.is_rivalry && <Badge className="bg-orange-500/10 text-orange-300 ring-1 ring-orange-500/30">Rivalry</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {showFullPageLink && (
            <Link href={`/games/${detail.id}`} className="text-xs font-medium text-slate-400 hover:text-teal-300">
              Open full page ↗
            </Link>
          )}
          {onClose && (
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-navy-800 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6 p-5">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-navy-950/60 p-4">
          <div className="space-y-3">
            {[detail.away_team, detail.home_team].map((team, i) => (
              <div key={team.id} className="flex items-center gap-2.5">
                <TeamMark team={team} size={36} />
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                    {team.name} {team.ranking != null && <span className="text-teal-400">#{team.ranking}</span>}
                    {i === 1 && <span className="text-[10px] font-medium uppercase text-slate-500">Home</span>}
                  </div>
                  <div className="text-xs text-slate-400">{team.record ?? "—"}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-right text-sm text-slate-300">
            <div className="font-semibold text-white">{formatGameDate(detail.start_time)}</div>
            <div>{detail.start_time_tbd ? "Time TBD" : formatGameTime(detail.start_time)}</div>
            {detail.tv_network && <div className="mt-1 text-slate-400">{detail.tv_network}</div>}
            {detail.venue && <div className="text-slate-500">{detail.venue}</div>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Spread", detail.odds_spread],
            ["Moneyline", detail.odds_moneyline_away && detail.odds_moneyline_home ? `${detail.odds_moneyline_away} / ${detail.odds_moneyline_home}` : null],
            ["Total", detail.odds_total],
            ["Status", detail.status.replace("_", " ")],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-white/5 bg-navy-950/60 p-2.5 text-center">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
              <div className="text-sm font-semibold text-white capitalize">{value ?? "—"}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {detail.prophetx_market_url && (
            <a
              href={detail.prophetx_market_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg bg-teal-500 px-3.5 py-2 text-xs font-semibold text-navy-950 hover:bg-teal-400"
            >
              View on ProphetX <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <a
            href={`/api/ics/games/${detail.id}`}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-teal-500/30 hover:text-teal-300"
          >
            <CalendarPlus className="h-3.5 w-3.5" /> Add to Calendar
          </a>
          <button
            type="button"
            onClick={() => {
              if (confirm("Archive this game? You can restore it later from Archived.")) {
                startTransition(async () => {
                  await archiveGameAction(detail.id);
                  onClose?.();
                  onChanged?.();
                });
              }
            }}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-white/10 px-3.5 py-2 text-xs font-semibold text-slate-400 hover:border-red-500/30 hover:text-red-300"
          >
            Archive Game
          </button>
        </div>

        {implications.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-navy-950/60 p-3.5 text-sm text-slate-300">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Implications</p>
            <ul className="list-inside list-disc space-y-1">
              {implications.map((imp, i) => (
                <li key={i}>{imp}</li>
              ))}
            </ul>
          </div>
        )}

        {detail.rivalry_name && <p className="text-sm text-orange-300">🔥 {detail.rivalry_name}</p>}

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Storylines ({detail.storylines.length})</h3>
            {!showStorylineForm && (
              <button
                type="button"
                onClick={() => setShowStorylineForm(true)}
                className="flex items-center gap-1 text-xs font-medium text-teal-400 hover:text-teal-300"
              >
                <Plus className="h-3.5 w-3.5" /> Add Storyline
              </button>
            )}
          </div>
          {showStorylineForm && (
            <div className="mb-3">
              <StorylineForm
                gameId={detail.id}
                availableTeams={[detail.away_team, detail.home_team]}
                onDone={() => {
                  setShowStorylineForm(false);
                  onChanged?.();
                }}
                onCancel={() => setShowStorylineForm(false)}
              />
            </div>
          )}
          <div className="space-y-2">
            {detail.storylines.length === 0 && !showStorylineForm && (
              <p className="text-sm text-slate-500">No storylines yet.</p>
            )}
            {detail.storylines.map((s) => (
              <div key={s.id} className="rounded-lg border border-white/10 bg-navy-950/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white">{s.title}</p>
                  <Badge className={PRIORITY_BADGE_CLASS[s.priority]}>{PRIORITY_LABEL[s.priority]}</Badge>
                </div>
                {s.description && <p className="mt-1 text-xs text-slate-400">{s.description}</p>}
                {s.relevant_players.length > 0 && (
                  <p className="mt-1 text-xs text-slate-500">Players: {s.relevant_players.join(", ")}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Content Ideas ({detail.content_ideas.length})</h3>
            {!showIdeaForm && (
              <button
                type="button"
                onClick={() => setShowIdeaForm(true)}
                className="flex items-center gap-1 text-xs font-medium text-teal-400 hover:text-teal-300"
              >
                <Plus className="h-3.5 w-3.5" /> Add Content Idea
              </button>
            )}
          </div>
          {showIdeaForm && (
            <div className="mb-3">
              <ContentIdeaForm
                gameId={detail.id}
                onDone={() => {
                  setShowIdeaForm(false);
                  onChanged?.();
                }}
                onCancel={() => setShowIdeaForm(false)}
              />
            </div>
          )}
          <div className="space-y-2">
            {detail.content_ideas.length === 0 && !showIdeaForm && (
              <p className="text-sm text-slate-500">No content ideas yet.</p>
            )}
            {detail.content_ideas.map((idea) => (
              <div key={idea.id} className="rounded-lg border border-white/10 bg-navy-950/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white">{idea.title}</p>
                  <div className="flex items-center gap-1.5">
                    <Badge className={PRIORITY_BADGE_CLASS[idea.priority]}>{PRIORITY_LABEL[idea.priority]}</Badge>
                    {idea.graphic_request && (
                      <span className="text-teal-400">
                        <ImageIcon className="h-3.5 w-3.5" />
                      </span>
                    )}
                    {idea.video_concept && (
                      <span className="text-teal-400">
                        <Video className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span>{CONTENT_TYPE_LABEL[idea.content_type]}</span>
                  <span>·</span>
                  <span>{PLATFORM_LABEL[idea.platform]}</span>
                  {idea.due_date && (
                    <>
                      <span>·</span>
                      <span>
                        Due {idea.due_date} {idea.due_time ?? ""}
                      </span>
                    </>
                  )}
                </div>
                {idea.description && <p className="mt-1.5 text-xs text-slate-400">{idea.description}</p>}
                <div className="mt-2 flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_BADGE_CLASS[idea.status]}`}>
                    {STATUS_LABEL[idea.status]}
                  </span>
                  <select
                    value={idea.status}
                    onChange={(e) =>
                      startTransition(async () => {
                        await updateContentIdeaAction(idea.id, { status: e.target.value as ContentStatus });
                        onChanged?.();
                      })
                    }
                    className="rounded-lg border border-white/10 bg-navy-900 px-2 py-1 text-[11px] text-slate-300"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        Move to: {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
