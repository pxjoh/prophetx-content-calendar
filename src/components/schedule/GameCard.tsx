import { ExternalLink, Flame, ImageIcon, Lightbulb, MessagesSquare, Trophy, Tv, Video } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { TeamMark } from "./TeamMark";
import { IMPORTANCE_BADGE_CLASS, IMPORTANCE_LABEL } from "@/lib/labels";
import { formatGameDate, formatGameTime } from "@/lib/utils/dates";
import type { GameWithTeams } from "@/types/domain";

function TeamRow({ team, score, isHome }: { team: GameWithTeams["home_team"]; score: number | null; isHome: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <TeamMark team={team} size={34} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="truncate text-sm font-semibold text-white">{team.name}</span>
          {team.ranking != null && (
            <span className="shrink-0 text-xs font-bold text-teal-400">#{team.ranking}</span>
          )}
          {isHome && <span className="shrink-0 text-[10px] font-medium uppercase text-slate-500">Home</span>}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {team.record && <span>{team.record}</span>}
          {team.conference_record && <span className="text-slate-500">· {team.conference_record} conf</span>}
        </div>
      </div>
      {score != null && <span className="text-lg font-bold text-white">{score}</span>}
    </div>
  );
}

export function GameCard({ game, onClick }: { game: GameWithTeams; onClick?: () => void }) {
  const implications = [game.playoff_implications, game.tournament_implications, game.conference_implications].filter(
    Boolean
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-2xl border border-white/10 bg-navy-900 p-4 text-left transition hover:border-teal-500/30 hover:bg-navy-850 sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className="bg-navy-700 text-slate-300 ring-1 ring-white/10">{game.league.name}</Badge>
          <Badge className={IMPORTANCE_BADGE_CLASS[game.importance]}>
            {IMPORTANCE_LABEL[game.importance]}
            {!game.importance_is_manual && <span className="normal-case opacity-70"> · auto</span>}
          </Badge>
          {game.is_rivalry && (
            <Badge className="bg-orange-500/10 text-orange-300 ring-1 ring-orange-500/30">
              <Flame className="h-3 w-3" /> Rivalry
            </Badge>
          )}
          {game.is_sample && (
            <Badge className="bg-navy-800 text-slate-500 ring-1 ring-white/10">Sample</Badge>
          )}
        </div>
        <div className="text-right text-xs text-slate-400">
          <div className="font-medium text-slate-300">{formatGameDate(game.start_time)}</div>
          <div>{game.start_time_tbd ? "Time TBD" : formatGameTime(game.start_time)}</div>
        </div>
      </div>

      <div className="space-y-2.5">
        <TeamRow team={game.away_team} score={game.away_score} isHome={false} />
        <TeamRow team={game.home_team} score={game.home_score} isHome />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
        {game.tv_network && (
          <span className="flex items-center gap-1">
            <Tv className="h-3.5 w-3.5" /> {game.tv_network}
          </span>
        )}
        {game.venue && <span>{game.venue}</span>}
      </div>

      {(game.odds_spread || game.odds_moneyline_home || game.odds_total) && (
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-white/5 bg-navy-950/60 p-2 text-center">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Spread</div>
            <div className="text-sm font-semibold text-white">{game.odds_spread ?? "—"}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Moneyline</div>
            <div className="text-sm font-semibold text-white">
              {game.odds_moneyline_away ?? "—"} / {game.odds_moneyline_home ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Total</div>
            <div className="text-sm font-semibold text-white">{game.odds_total ?? "—"}</div>
          </div>
        </div>
      )}

      {implications.length > 0 && (
        <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-teal-500/5 p-2 text-xs text-teal-200">
          <Trophy className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{implications.join(" · ")}</span>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <MessagesSquare className="h-3.5 w-3.5" /> {game.storyline_count}
          </span>
          <span className="flex items-center gap-1">
            <Lightbulb className="h-3.5 w-3.5" /> {game.content_idea_count}
          </span>
          {game.has_graphic_request && (
            <span className="flex items-center gap-1 text-teal-300">
              <ImageIcon className="h-3.5 w-3.5" /> Graphic
            </span>
          )}
          {game.has_video_request && (
            <span className="flex items-center gap-1 text-teal-300">
              <Video className="h-3.5 w-3.5" /> Video
            </span>
          )}
        </div>
        {game.prophetx_market_url && (
          <span className="flex items-center gap-1 text-xs font-medium text-teal-400 group-hover:text-teal-300">
            View on ProphetX <ExternalLink className="h-3 w-3" />
          </span>
        )}
      </div>
    </button>
  );
}
