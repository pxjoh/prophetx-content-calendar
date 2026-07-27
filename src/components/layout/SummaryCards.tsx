import type { ReactNode } from "react";
import { AlertTriangle, CalendarDays, Flame, ImageIcon, Sparkles, Video } from "lucide-react";

export interface SummaryStats {
  gamesToday: number;
  mustCoverGames: number;
  highPriorityIdeas: number;
  graphicRequestsDueSoon: number;
  videoRequestsDueSoon: number;
  upcomingMajorEvents: number;
}

function Card({ icon, label, value, accent }: { icon: ReactNode; label: string; value: number; accent?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-navy-900 p-3.5">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent ?? "bg-teal-500/10 text-teal-400"}`}>
        {icon}
      </span>
      <div>
        <div className="text-xl font-bold leading-tight text-white">{value}</div>
        <div className="text-xs text-slate-400">{label}</div>
      </div>
    </div>
  );
}

export function SummaryCards({ stats }: { stats: SummaryStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Card icon={<CalendarDays className="h-4.5 w-4.5" />} label="Games Today" value={stats.gamesToday} />
      <Card
        icon={<Flame className="h-4.5 w-4.5" />}
        label="Must-Cover Games"
        value={stats.mustCoverGames}
        accent="bg-red-500/10 text-red-300"
      />
      <Card
        icon={<Sparkles className="h-4.5 w-4.5" />}
        label="High-Priority Ideas"
        value={stats.highPriorityIdeas}
        accent="bg-amber-500/10 text-amber-300"
      />
      <Card
        icon={<ImageIcon className="h-4.5 w-4.5" />}
        label="Graphics Due Soon"
        value={stats.graphicRequestsDueSoon}
      />
      <Card icon={<Video className="h-4.5 w-4.5" />} label="Videos Due Soon" value={stats.videoRequestsDueSoon} />
      <Card
        icon={<AlertTriangle className="h-4.5 w-4.5" />}
        label="Major Events Upcoming"
        value={stats.upcomingMajorEvents}
        accent="bg-violet-500/10 text-violet-300"
      />
    </div>
  );
}
