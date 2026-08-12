// In-memory implementation of DataStore, seeded from sample-data.ts. Used
// automatically whenever Supabase env vars are not present (see index.ts),
// so the app is fully usable for local development and demos before the
// database is provisioned. State lives for the life of the Node process —
// fine for dev/demo, but it is NOT shared across team members or server
// instances. Swap to the Supabase-backed store for real team-wide persistence.
import type {
  AppNotification,
  ContentIdea,
  CrmSubmission,
  Game,
  GameDetail,
  GameWithTeams,
  MajorEvent,
  ReferenceLink,
  Storyline,
} from "@/types/domain";
import * as seed from "./sample-data";
import {
  applyContentIdeaFilters,
  applyCrmSubmissionFilters,
  applyGameFilters,
  applyMajorEventFilters,
  applyStorylineFilters,
} from "./filters";
import type {
  ContentIdeaFilterParams,
  ContentIdeaInput,
  CrmSubmissionFilterParams,
  CrmSubmissionInput,
  DataStore,
  GameFilterParams,
  MajorEventFilterParams,
  MajorEventInput,
  StorylineFilterParams,
  StorylineInput,
} from "./types";

let games: Game[] = seed.games.map((g) => ({ ...g }));
let majorEvents: MajorEvent[] = seed.majorEvents.map((e) => ({ ...e }));
let storylines: Storyline[] = seed.storylines.map((s) => ({ ...s }));
let contentIdeas: ContentIdea[] = seed.contentIdeas.map((c) => ({ ...c }));
let crmSubmissions: CrmSubmission[] = [];
let referenceLinks: ReferenceLink[] = [];
let notifications: AppNotification[] = seed.notifications.map((n) => ({ ...n }));

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

/** Shallow-merges `patch` onto `base`, ignoring any `undefined` values in `patch` so they don't clobber existing data. */
function mergeDefined<T extends object>(base: T, patch: Partial<T>): T {
  const result = { ...base };
  for (const key of Object.keys(patch) as (keyof T)[]) {
    if (patch[key] !== undefined) result[key] = patch[key] as T[typeof key];
  }
  return result;
}

function pushNotification(input: Omit<AppNotification, "id" | "created_at" | "is_read">) {
  notifications = [
    { ...input, id: uid("notif"), is_read: false, created_at: new Date().toISOString() },
    ...notifications,
  ];
}

function teamById(id: string) {
  const team = seed.teams.find((t) => t.id === id);
  if (!team) throw new Error(`Unknown team id: ${id}`);
  return team;
}

function leagueById(id: string) {
  const league = seed.leagues.find((l) => l.id === id);
  if (!league) throw new Error(`Unknown league id: ${id}`);
  return league;
}

function toGameWithTeams(game: Game): GameWithTeams {
  const ideas = contentIdeas.filter((c) => c.game_id === game.id && !c.archived_at);
  return {
    ...game,
    home_team: teamById(game.home_team_id),
    away_team: teamById(game.away_team_id),
    league: leagueById(game.league_id),
    storyline_count: storylines.filter((s) => s.game_id === game.id && !s.archived_at).length,
    content_idea_count: ideas.length,
    has_graphic_request: ideas.some((c) => !!c.graphic_request),
    has_video_request: ideas.some((c) => !!c.video_concept),
    reference_links: referenceLinks.filter((r) => r.related_table === "games" && r.related_id === game.id),
  };
}

export const memoryStore: DataStore = {
  async listLeagues() {
    return seed.leagues.filter((l) => l.is_active).sort((a, b) => a.sort_order - b.sort_order);
  },

  async listTeams(leagueId) {
    const inactiveLeagueIds = new Set(seed.leagues.filter((l) => !l.is_active).map((l) => l.id));
    const scoped = seed.teams.filter((t) => !inactiveLeagueIds.has(t.league_id));
    return leagueId ? scoped.filter((t) => t.league_id === leagueId) : scoped;
  },

  async listGames(params: GameFilterParams) {
    const result = games.filter((g) => (params.includeArchived ? true : !g.archived_at));
    const withMeta = result.map(toGameWithTeams);
    return applyGameFilters(withMeta, params, {
      getStorylineText: (gameId) =>
        storylines.filter((s) => s.game_id === gameId).map((s) => `${s.title} ${s.description ?? ""}`).join(" "),
      getContentIdeaText: (gameId) =>
        contentIdeas.filter((c) => c.game_id === gameId).map((c) => `${c.title} ${c.description ?? ""}`).join(" "),
    });
  },

  async getGameDetail(id) {
    const game = games.find((g) => g.id === id);
    if (!game) return null;
    const withTeams = toGameWithTeams(game);
    const detail: GameDetail = {
      ...withTeams,
      storylines: storylines.filter((s) => s.game_id === id && !s.archived_at),
      content_ideas: contentIdeas.filter((c) => c.game_id === id && !c.archived_at),
    };
    return detail;
  },

  async setGameImportance(id, importance, manual) {
    games = games.map((g) => (g.id === id ? { ...g, importance, importance_is_manual: manual } : g));
  },

  async archiveGame(id) {
    games = games.map((g) => (g.id === id ? { ...g, archived_at: new Date().toISOString() } : g));
  },
  async restoreGame(id) {
    games = games.map((g) => (g.id === id ? { ...g, archived_at: null } : g));
  },

  async listMajorEvents(params: MajorEventFilterParams) {
    const inactiveLeagueIds = new Set(seed.leagues.filter((l) => !l.is_active).map((l) => l.id));
    const result = majorEvents.filter(
      (e) => (params.includeArchived ? true : !e.archived_at) && !(e.league_id && inactiveLeagueIds.has(e.league_id))
    );
    return applyMajorEventFilters(result, params);
  },

  async createMajorEvent(input: MajorEventInput) {
    const event: MajorEvent = {
      id: uid("event"),
      title: input.title,
      event_type: input.event_type,
      league_id: input.league_id ?? null,
      start_time: input.start_time ?? null,
      end_time: input.end_time ?? null,
      description: input.description ?? null,
      importance: input.importance,
      importance_is_manual: input.importance_is_manual,
      prophetx_market_url: input.prophetx_market_url ?? null,
      notes: input.notes ?? null,
      is_sample: false,
      archived_at: null,
    };
    majorEvents = [event, ...majorEvents];
    pushNotification({
      type: "major_event_approaching",
      title: "New major event added",
      body: event.title,
      related_table: "major_events",
      related_id: event.id,
    });
    return event;
  },

  async updateMajorEvent(id, input) {
    let updated: MajorEvent | undefined;
    majorEvents = majorEvents.map((e) => {
      if (e.id !== id) return e;
      updated = { ...e, ...input };
      return updated;
    });
    if (!updated) throw new Error(`Major event not found: ${id}`);
    return updated;
  },

  async archiveMajorEvent(id) {
    majorEvents = majorEvents.map((e) => (e.id === id ? { ...e, archived_at: new Date().toISOString() } : e));
  },
  async restoreMajorEvent(id) {
    majorEvents = majorEvents.map((e) => (e.id === id ? { ...e, archived_at: null } : e));
  },

  async listStorylines(params: StorylineFilterParams) {
    const inactiveLeagueIds = new Set(seed.leagues.filter((l) => !l.is_active).map((l) => l.id));
    const result = storylines.filter(
      (s) => (params.includeArchived ? true : !s.archived_at) && !(s.league_id && inactiveLeagueIds.has(s.league_id))
    );
    return applyStorylineFilters(result, params);
  },

  async createStoryline(input: StorylineInput) {
    const storyline: Storyline = {
      id: uid("storyline"),
      title: input.title,
      description: input.description ?? null,
      priority: input.priority,
      game_id: input.game_id ?? null,
      major_event_id: input.major_event_id ?? null,
      league_id: input.league_id ?? null,
      relevant_players: input.relevant_players ?? [],
      relevant_team_ids: input.relevant_team_ids ?? [],
      notes: input.notes ?? null,
      is_sample: false,
      archived_at: null,
      created_at: new Date().toISOString(),
    };
    storylines = [storyline, ...storylines];
    pushNotification({
      type: storyline.priority === "breaking" ? "storyline_breaking" : "storyline_added",
      title: storyline.priority === "breaking" ? "Breaking storyline added" : "New storyline added",
      body: storyline.title,
      related_table: "storylines",
      related_id: storyline.id,
    });
    return storyline;
  },

  async updateStoryline(id, input) {
    let updated: Storyline | undefined;
    storylines = storylines.map((s) => {
      if (s.id !== id) return s;
      updated = { ...s, ...input };
      return updated;
    });
    if (!updated) throw new Error(`Storyline not found: ${id}`);
    if (input.priority === "breaking") {
      pushNotification({
        type: "storyline_breaking",
        title: "Storyline marked Breaking",
        body: updated.title,
        related_table: "storylines",
        related_id: updated.id,
      });
    }
    return updated;
  },

  async archiveStoryline(id) {
    storylines = storylines.map((s) => (s.id === id ? { ...s, archived_at: new Date().toISOString() } : s));
  },
  async restoreStoryline(id) {
    storylines = storylines.map((s) => (s.id === id ? { ...s, archived_at: null } : s));
  },

  async listContentIdeas(params: ContentIdeaFilterParams) {
    const result = contentIdeas.filter((c) => (params.includeArchived ? true : !c.archived_at));
    return applyContentIdeaFilters(result, params);
  },

  async createContentIdea(input: ContentIdeaInput) {
    const id = uid("idea");
    const idea: ContentIdea = {
      id,
      title: input.title,
      description: input.description ?? null,
      content_type: input.content_type,
      platform: input.platform,
      priority: input.priority,
      status: input.status,
      due_date: input.due_date ?? null,
      due_time: input.due_time ?? null,
      game_id: input.game_id ?? null,
      major_event_id: input.major_event_id ?? null,
      storyline_id: input.storyline_id ?? null,
      graphic_instructions: input.graphic_instructions ?? null,
      video_instructions: input.video_instructions ?? null,
      internal_notes: input.internal_notes ?? null,
      is_sample: false,
      archived_at: null,
      created_at: new Date().toISOString(),
      graphic_request: input.graphic_request
        ? {
            id: uid("graphic"),
            content_idea_id: id,
            headline: input.graphic_request.headline ?? null,
            supporting_copy: input.graphic_request.supporting_copy ?? null,
            required_statistics: input.graphic_request.required_statistics ?? null,
            required_images: input.graphic_request.required_images ?? null,
            design_instructions: input.graphic_request.design_instructions ?? null,
            dimensions: input.graphic_request.dimensions ?? null,
            platform_destination: input.graphic_request.platform_destination ?? null,
            due_date: input.graphic_request.due_date ?? null,
            priority: input.graphic_request.priority ?? input.priority,
          }
        : null,
      video_concept: input.video_concept
        ? {
            id: uid("video"),
            content_idea_id: id,
            concept: input.video_concept.concept ?? null,
            hook: input.video_concept.hook ?? null,
            talking_points: input.video_concept.talking_points ?? null,
            required_footage: input.video_concept.required_footage ?? null,
            on_camera_requirements: input.video_concept.on_camera_requirements ?? null,
            editing_instructions: input.video_concept.editing_instructions ?? null,
            desired_length: input.video_concept.desired_length ?? null,
            platform_destination: input.video_concept.platform_destination ?? null,
            due_date: input.video_concept.due_date ?? null,
            priority: input.video_concept.priority ?? input.priority,
          }
        : null,
    };
    contentIdeas = [idea, ...contentIdeas];
    pushNotification({
      type: "content_idea_added",
      title: "New content idea added",
      body: idea.title,
      related_table: "content_ideas",
      related_id: idea.id,
    });
    return idea;
  },

  async updateContentIdea(id, input) {
    const { graphic_request, video_concept, ...rest } = input;
    let updated: ContentIdea | undefined;
    contentIdeas = contentIdeas.map((c) => {
      if (c.id !== id) return c;
      const graphicBase = c.graphic_request ?? {
        id: uid("graphic"),
        content_idea_id: id,
        headline: null,
        supporting_copy: null,
        required_statistics: null,
        required_images: null,
        design_instructions: null,
        dimensions: null,
        platform_destination: null,
        due_date: null,
        priority: c.priority,
      };
      const videoBase = c.video_concept ?? {
        id: uid("video"),
        content_idea_id: id,
        concept: null,
        hook: null,
        talking_points: null,
        required_footage: null,
        on_camera_requirements: null,
        editing_instructions: null,
        desired_length: null,
        platform_destination: null,
        due_date: null,
        priority: c.priority,
      };

      const merged: ContentIdea = {
        ...mergeDefined(c, rest),
        graphic_request:
          graphic_request === undefined
            ? c.graphic_request
            : graphic_request === null
              ? null
              : mergeDefined(graphicBase, graphic_request),
        video_concept:
          video_concept === undefined
            ? c.video_concept
            : video_concept === null
              ? null
              : mergeDefined(videoBase, video_concept),
      };
      updated = merged;
      return merged;
    });
    if (!updated) throw new Error(`Content idea not found: ${id}`);
    if (input.status) {
      pushNotification({
        type: "status_changed",
        title: "Content idea status changed",
        body: `${updated.title} → ${input.status}`,
        related_table: "content_ideas",
        related_id: updated.id,
      });
    }
    return updated;
  },

  async archiveContentIdea(id) {
    contentIdeas = contentIdeas.map((c) => (c.id === id ? { ...c, archived_at: new Date().toISOString() } : c));
  },
  async restoreContentIdea(id) {
    contentIdeas = contentIdeas.map((c) => (c.id === id ? { ...c, archived_at: null } : c));
  },

  async listCrmSubmissions(params: CrmSubmissionFilterParams) {
    const result = crmSubmissions.filter((c) => (params.includeArchived ? true : !c.archived_at));
    return applyCrmSubmissionFilters(result, params);
  },

  async createCrmSubmission(input: CrmSubmissionInput) {
    const submission: CrmSubmission = {
      id: uid("crm"),
      email_subject: input.email_subject,
      content: input.content ?? null,
      platform: input.platform,
      priority: input.priority,
      status: input.status,
      due_date: input.due_date ?? null,
      due_time: input.due_time ?? null,
      internal_notes: input.internal_notes ?? null,
      is_sample: false,
      archived_at: null,
      created_at: new Date().toISOString(),
    };
    crmSubmissions = [submission, ...crmSubmissions];
    pushNotification({
      type: "crm_submission_added",
      title: "New CRM submission added",
      body: submission.email_subject,
      related_table: "crm_submissions",
      related_id: submission.id,
    });
    return submission;
  },

  async updateCrmSubmission(id, input) {
    let updated: CrmSubmission | undefined;
    crmSubmissions = crmSubmissions.map((c) => {
      if (c.id !== id) return c;
      updated = mergeDefined<CrmSubmission>(c, input);
      return updated;
    });
    if (!updated) throw new Error(`CRM submission not found: ${id}`);
    return updated;
  },

  async archiveCrmSubmission(id) {
    crmSubmissions = crmSubmissions.map((c) => (c.id === id ? { ...c, archived_at: new Date().toISOString() } : c));
  },
  async restoreCrmSubmission(id) {
    crmSubmissions = crmSubmissions.map((c) => (c.id === id ? { ...c, archived_at: null } : c));
  },

  async listReferenceLinks(table, id) {
    return referenceLinks.filter((r) => r.related_table === table && r.related_id === id);
  },
  async addReferenceLink(table, id, url, label) {
    const link: ReferenceLink = { id: uid("link"), url, label: label ?? null, related_table: table, related_id: id };
    referenceLinks = [link, ...referenceLinks];
    return link;
  },
  async removeReferenceLink(id) {
    referenceLinks = referenceLinks.filter((r) => r.id !== id);
  },

  async listNotifications() {
    return [...notifications].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  async markNotificationRead(id) {
    notifications = notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n));
  },
  async markAllNotificationsRead() {
    notifications = notifications.map((n) => ({ ...n, is_read: true }));
  },
};
