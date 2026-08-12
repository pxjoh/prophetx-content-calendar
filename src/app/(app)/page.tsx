import { getDataStore } from "@/lib/data";
import { groupGamesByBucket, isDueToday, isOverdue, isWithin24Hours } from "@/lib/utils/dates";
import { FilterBar } from "@/components/schedule/FilterBar";
import { GameTimeline } from "@/components/schedule/GameTimeline";
import type { TimelineItem } from "@/components/schedule/GameTimeline";
import { SummaryCards } from "@/components/layout/SummaryCards";
import { AttentionStrip } from "@/components/layout/AttentionStrip";
import type { GameFilterParams } from "@/lib/data/types";
import type { Importance } from "@/types/domain";

function parseFilters(sp: Record<string, string | undefined>): GameFilterParams {
  const filters: GameFilterParams = {};
  if (sp.q) filters.search = sp.q;
  if (sp.league) filters.leagueSlugs = sp.league.split(",").filter(Boolean);
  if (sp.team) filters.teamId = sp.team;
  if (sp.conference) filters.conferenceId = sp.conference;
  if (sp.ranked === "1") filters.rankedOnly = true;
  if (sp.rivalry === "1") filters.rivalryOnly = true;
  if (sp.playoff === "1") filters.hasPlayoffImplications = true;
  if (sp.tournament === "1") filters.hasTournamentImplications = true;
  if (sp.importance) filters.importance = sp.importance.split(",").filter(Boolean) as Importance[];
  if (sp.tv) filters.tvNetwork = sp.tv;
  if (sp.ideas === "with") filters.hasContentIdeas = true;
  if (sp.ideas === "without") filters.hasContentIdeas = false;
  if (sp.graphic === "1") filters.hasGraphicRequest = true;
  if (sp.video === "1") filters.hasVideoRequest = true;
  if (sp.from) filters.from = new Date(`${sp.from}T00:00:00`);
  if (sp.to) filters.to = new Date(`${sp.to}T23:59:59`);
  return filters;
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const store = getDataStore();
  const filters = parseFilters(sp);
  const view = sp.view === "list" ? "list" : "timeline";
  const isCustomRange = Boolean(filters.from || filters.to);

  const [leagues, teams, filteredGames, allGames, majorEvents, contentIdeas, storylines] = await Promise.all([
    store.listLeagues(),
    store.listTeams(),
    store.listGames(filters),
    store.listGames({}),
    store.listMajorEvents({}),
    store.listContentIdeas({}),
    store.listStorylines({}),
  ]);

  const now = new Date();
  const buckets = groupGamesByBucket(filteredGames, now);

  const eventsInScope = majorEvents.filter((e) => {
    if (!e.start_time) return false;
    const t = new Date(e.start_time);
    if (isCustomRange) return t >= (filters.from ?? new Date(0)) && t <= (filters.to ?? new Date(8640000000000000));
    return t >= now;
  });

  const timelineItems: TimelineItem[] = [
    ...filteredGames.map((game) => ({ kind: "game" as const, id: `game-${game.id}`, date: new Date(game.start_time), game })),
    ...eventsInScope.map((event) => ({
      kind: "event" as const,
      id: `event-${event.id}`,
      date: new Date(event.start_time as string),
      event,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const upcomingMajorEvents = majorEvents
    .filter((e) => !e.start_time || new Date(e.start_time) >= now)
    .sort((a, b) => {
      const at = a.start_time ? new Date(a.start_time).getTime() : Infinity;
      const bt = b.start_time ? new Date(b.start_time).getTime() : Infinity;
      return at - bt;
    });

  const activeIdeas = contentIdeas.filter((i) => i.status !== "archived" && i.status !== "posted");
  const overdueIdeas = activeIdeas.filter((i) => isOverdue(i.due_date, i.due_time, now));
  const overdueIds = new Set(overdueIdeas.map((i) => i.id));
  const dueTodayIdeas = activeIdeas.filter((i) => !overdueIds.has(i.id) && isDueToday(i.due_date, now));
  const dueTodayIds = new Set(dueTodayIdeas.map((i) => i.id));
  const highPriorityIdeas = activeIdeas.filter(
    (i) => !overdueIds.has(i.id) && !dueTodayIds.has(i.id) && (i.priority === "high" || i.priority === "breaking")
  );

  const graphicsDueSoon = activeIdeas.filter(
    (i) => i.graphic_request && i.due_date && new Date(i.due_date) <= new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  );
  const videosDueSoon = activeIdeas.filter(
    (i) => i.video_concept && i.due_date && new Date(i.due_date) <= new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  );

  const gamesStartingSoon = allGames.filter((g) => isWithin24Hours(g.start_time, now));
  const mustCoverGames = allGames.filter(
    (g) => g.importance === "must_cover" && new Date(g.start_time).getTime() - now.getTime() < 14 * 24 * 60 * 60 * 1000
  );
  const breakingStorylines = storylines.filter((s) => s.priority === "breaking");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SummaryCards
        stats={{
          gamesToday: buckets.today.length,
          mustCoverGames: mustCoverGames.length,
          highPriorityIdeas: highPriorityIdeas.length + overdueIdeas.length,
          graphicRequestsDueSoon: graphicsDueSoon.length,
          videoRequestsDueSoon: videosDueSoon.length,
          upcomingMajorEvents: upcomingMajorEvents.length,
        }}
      />

      <AttentionStrip
        data={{
          gamesStartingSoon,
          mustCoverGames,
          overdueIdeas,
          dueTodayIdeas,
          highPriorityIdeas,
          breakingStorylines,
        }}
      />

      <FilterBar leagues={leagues} teams={teams} />

      <GameTimeline items={timelineItems} view={view} />
    </div>
  );
}
