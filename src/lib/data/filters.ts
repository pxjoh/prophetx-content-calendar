// Shared, pure filtering/sorting logic used by BOTH the in-memory store and
// the Supabase-backed store. Each backend is responsible only for fetching a
// reasonably-scoped candidate set (e.g. by date range) and enriching rows
// with joined data (teams, league, counts) — everything else funnels through
// these functions so filter behavior can never drift between the two stores.
import type {
  ContentIdea,
  CrmSubmission,
  GameWithTeams,
  MajorEvent,
  Storyline,
} from "@/types/domain";
import type {
  ContentIdeaFilterParams,
  CrmSubmissionFilterParams,
  GameFilterParams,
  MajorEventFilterParams,
  StorylineFilterParams,
} from "./types";

function matchesSearch(haystacks: (string | null | undefined)[], term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  return haystacks.some((h) => h && h.toLowerCase().includes(needle));
}

export interface GameSearchContext {
  getStorylineText(gameId: string): string;
  getContentIdeaText(gameId: string): string;
}

export function applyGameFilters(
  games: GameWithTeams[],
  params: GameFilterParams,
  searchCtx: GameSearchContext
): GameWithTeams[] {
  let result = games;

  if (params.from) result = result.filter((g) => new Date(g.start_time) >= params.from!);
  if (params.to) result = result.filter((g) => new Date(g.start_time) <= params.to!);
  if (params.leagueSlugs?.length) {
    const slugs = new Set(params.leagueSlugs);
    result = result.filter((g) => slugs.has(g.league.slug));
  }
  if (params.teamId) {
    result = result.filter((g) => g.home_team_id === params.teamId || g.away_team_id === params.teamId);
  }
  if (params.conferenceId) {
    result = result.filter(
      (g) => g.home_team.conference_id === params.conferenceId || g.away_team.conference_id === params.conferenceId
    );
  }
  if (params.rankedOnly) {
    result = result.filter((g) => g.home_team.ranking != null || g.away_team.ranking != null);
  }
  if (params.rivalryOnly) result = result.filter((g) => g.is_rivalry);
  if (params.hasPlayoffImplications) result = result.filter((g) => !!g.playoff_implications);
  if (params.hasTournamentImplications) result = result.filter((g) => !!g.tournament_implications);
  if (params.importance?.length) {
    const set = new Set(params.importance);
    result = result.filter((g) => set.has(g.importance));
  }
  if (params.tvNetwork) result = result.filter((g) => g.tv_network === params.tvNetwork);

  if (params.hasContentIdeas === true) result = result.filter((g) => g.content_idea_count > 0);
  if (params.hasContentIdeas === false) result = result.filter((g) => g.content_idea_count === 0);
  if (params.hasGraphicRequest) result = result.filter((g) => g.has_graphic_request);
  if (params.hasVideoRequest) result = result.filter((g) => g.has_video_request);

  if (params.search) {
    result = result.filter((g) =>
      matchesSearch(
        [
          g.home_team.name,
          g.away_team.name,
          g.rivalry_name,
          searchCtx.getStorylineText(g.id),
          searchCtx.getContentIdeaText(g.id),
        ],
        params.search!
      )
    );
  }

  return [...result].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
}

export function applyMajorEventFilters(events: MajorEvent[], params: MajorEventFilterParams): MajorEvent[] {
  let result = events;
  if (params.from) result = result.filter((e) => !e.start_time || new Date(e.start_time) >= params.from!);
  if (params.to) result = result.filter((e) => !e.start_time || new Date(e.start_time) <= params.to!);
  if (params.leagueId) result = result.filter((e) => e.league_id === params.leagueId);

  return [...result].sort((a, b) => {
    const at = a.start_time ? new Date(a.start_time).getTime() : Infinity;
    const bt = b.start_time ? new Date(b.start_time).getTime() : Infinity;
    return at - bt;
  });
}

export function applyStorylineFilters(storylines: Storyline[], params: StorylineFilterParams): Storyline[] {
  let result = storylines;
  if (params.gameId) result = result.filter((s) => s.game_id === params.gameId);
  if (params.majorEventId) result = result.filter((s) => s.major_event_id === params.majorEventId);
  if (params.leagueId) result = result.filter((s) => s.league_id === params.leagueId);
  if (params.leagueWideOnly) result = result.filter((s) => !s.game_id && !s.major_event_id && !!s.league_id);

  return [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function applyContentIdeaFilters(ideas: ContentIdea[], params: ContentIdeaFilterParams): ContentIdea[] {
  let result = ideas;
  if (params.gameId) result = result.filter((c) => c.game_id === params.gameId);
  if (params.majorEventId) result = result.filter((c) => c.major_event_id === params.majorEventId);
  if (params.storylineId) result = result.filter((c) => c.storyline_id === params.storylineId);
  if (params.status?.length) {
    const set = new Set(params.status);
    result = result.filter((c) => set.has(c.status));
  }
  if (params.contentType?.length) {
    const set = new Set(params.contentType);
    result = result.filter((c) => set.has(c.content_type));
  }
  if (params.platform?.length) {
    const set = new Set(params.platform);
    result = result.filter((c) => set.has(c.platform));
  }
  if (params.priority?.length) {
    const set = new Set(params.priority);
    result = result.filter((c) => set.has(c.priority));
  }
  if (params.onlyGraphicRequests) result = result.filter((c) => !!c.graphic_request);
  if (params.onlyVideoRequests) result = result.filter((c) => !!c.video_concept);
  if (params.dueOnOrBefore) {
    result = result.filter((c) => c.due_date && new Date(c.due_date) <= params.dueOnOrBefore!);
  }
  if (params.search) {
    result = result.filter((c) => matchesSearch([c.title, c.description], params.search!));
  }

  return [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function applyCrmSubmissionFilters(
  submissions: CrmSubmission[],
  params: CrmSubmissionFilterParams
): CrmSubmission[] {
  let result = submissions;
  if (params.status?.length) {
    const set = new Set(params.status);
    result = result.filter((c) => set.has(c.status));
  }
  if (params.platform?.length) {
    const set = new Set(params.platform);
    result = result.filter((c) => set.has(c.platform));
  }
  if (params.priority?.length) {
    const set = new Set(params.priority);
    result = result.filter((c) => set.has(c.priority));
  }
  if (params.dueOnOrBefore) {
    result = result.filter((c) => c.due_date && new Date(c.due_date) <= params.dueOnOrBefore!);
  }
  if (params.search) {
    result = result.filter((c) => matchesSearch([c.email_subject, c.content], params.search!));
  }

  return [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
