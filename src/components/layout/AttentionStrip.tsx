import Link from "next/link";
import { AlertTriangle, Clock, Flame, Sparkles, Zap } from "lucide-react";
import type { ContentIdea, GameWithTeams, Storyline } from "@/types/domain";

export interface AttentionData {
  gamesStartingSoon: GameWithTeams[];
  mustCoverGames: GameWithTeams[];
  overdueIdeas: ContentIdea[];
  dueTodayIdeas: ContentIdea[];
  highPriorityIdeas: ContentIdea[];
  breakingStorylines: Storyline[];
}

function Chip({
  icon,
  label,
  tone,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "red" | "amber" | "teal";
  href?: string;
}) {
  const toneClass =
    tone === "red"
      ? "border-red-500/30 bg-red-500/10 text-red-200"
      : tone === "amber"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
        : "border-teal-500/30 bg-teal-500/10 text-teal-200";

  const content = (
    <span className={`inline-flex max-w-[240px] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${toneClass}`}>
      {icon}
      <span className="truncate">{label}</span>
    </span>
  );

  return href ? (
    <Link href={href} className="transition hover:opacity-80">
      {content}
    </Link>
  ) : (
    content
  );
}

export function AttentionStrip({ data }: { data: AttentionData }) {
  const total =
    data.gamesStartingSoon.length +
    data.mustCoverGames.length +
    data.overdueIdeas.length +
    data.dueTodayIdeas.length +
    data.highPriorityIdeas.length +
    data.breakingStorylines.length;

  if (total === 0) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-navy-900 p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">What Needs Attention</h2>
      <div className="flex flex-wrap gap-2">
        {data.breakingStorylines.map((s) => (
          <Chip key={s.id} tone="red" icon={<Zap className="h-3.5 w-3.5 shrink-0" />} label={s.title} />
        ))}
        {data.mustCoverGames.map((g) => (
          <Chip
            key={g.id}
            tone="red"
            icon={<Flame className="h-3.5 w-3.5 shrink-0" />}
            label={`Must cover: ${g.away_team.short_name ?? g.away_team.name} @ ${g.home_team.short_name ?? g.home_team.name}`}
            href={`/games/${g.id}`}
          />
        ))}
        {data.overdueIdeas.map((idea) => (
          <Chip key={idea.id} tone="red" icon={<AlertTriangle className="h-3.5 w-3.5 shrink-0" />} label={`Overdue: ${idea.title}`} />
        ))}
        {data.gamesStartingSoon.map((g) => (
          <Chip
            key={g.id}
            tone="teal"
            icon={<Clock className="h-3.5 w-3.5 shrink-0" />}
            label={`Starting soon: ${g.away_team.short_name ?? g.away_team.name} @ ${g.home_team.short_name ?? g.home_team.name}`}
            href={`/games/${g.id}`}
          />
        ))}
        {data.dueTodayIdeas.map((idea) => (
          <Chip key={idea.id} tone="amber" icon={<Clock className="h-3.5 w-3.5 shrink-0" />} label={`Due today: ${idea.title}`} />
        ))}
        {data.highPriorityIdeas.map((idea) => (
          <Chip key={idea.id} tone="amber" icon={<Sparkles className="h-3.5 w-3.5 shrink-0" />} label={idea.title} />
        ))}
      </div>
    </section>
  );
}
