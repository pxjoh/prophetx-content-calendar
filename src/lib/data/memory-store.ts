// In-memory implementation of DataStore, seeded from sample-data.ts. Used
// automatically whenever Supabase env vars are not present (see index.ts),
// so the app is fully usable for local development and demos before the
// database is provisioned. State lives for the life of the Node process —
// fine for dev/demo, but it is NOT shared across team members or server
// instances. Swap to the Supabase-backed store for real team-wide persistence.
import type {
  AppNotification,
  ContentIdea,
  Game,
  GameDetail,
  GameWithTeams,
  MajorEvent,
  ReferenceLink,
  Storyline,
} from "@/types/domain";
import * as seed from "./sample-data";
import type {
  ContentIdeaFilterParams,
  ContentIdeaInput,
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

function matchesSearch(haystacks: (string | null | undefined)[], term: string) {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  return haystacks.some((h) => h && h.toLowerCase().includes(needle));
}

export const memoryStore: DataStore = {
  async listLeagues() {
    return seed.leagues.filter((l) => l.is_active).sort((a, b) => a.sort_order - b.sort_order);
  },

  async listTeams(leagueId) {
    return leagueId ? seed.teams.filter((t) => t.league_id === leagueId) : [...seed.teams];
  },

  async listGames(params: GameFilterParams) {
    let result = games.filter((g) => (params.includeArchived ? true : !g.archived_at));

    if (params.from) result = result.filter((g) => new Date(g.start_time) >= params.from!);
    if (params.to) result = result.filter((g) => new Date(g.start_time) <= params.to!);
    if (params.leagueSlugs?.length) {
      const slugs = new Set(params.leagueSlugs);
      result = result.filter((g) => slugs.has(leagueById(g.league_id).slug));
    }
    if (params.teamId) {
      result = result.filter((g) => g.home_team_id === params.teamId || g.away_team_id === params.teamId);
    }
    if (params.conferenceId) {
      result = result.filter((g) => {
        const home = teamById(g.home_team_id);
        const away = teamById(g.away_team_id);
        return home.conference_id === params.conferenceId || away.conference_id === params.conferenceId;
      });
    }
    if (params.rankedOnly) {
      result = result.filter((g) => teamById(g.home_team_id).ranking != null || teamById(g.away_team_id).ranking != null);
    }
    if (params.rivalryOnly) result = result.filter((g) => g.is_rivalry);
    if (params.hasPlayoffImplications) result = result.filter((g) => !!g.playoff_implications);
    if (params.hasTournamentImplications) result = result.filter((g) => !!g.tournament_implications);
    if (params.importance?.length) {
      const set = new Set(params.importance);
      result = result.filter((g) => set.has(g.importance));
    }
    if (params.tvNetwork) result = result.filter((g) => g.tv_network === params.tvNetwork);

    const withMeta = result.map(toGameWithTeams);

    let filtered = withMeta;
    if (params.hasContentIdeas === true) filtered = filtered.filter((g) => g.content_idea_count > 0);
    if (params.hasContentIdeas === false) filtered = filtered.filter((g) => g.content_idea_count === 0);
    if (params.hasGraphicRequest) filtered = filtered.filter((g) => g.has_graphic_request);
    if (params.hasVideoRequest) filtered = filtered.filter((g) => g.has_video_request);

    if (params.search) {
      const gameStorylineText = (gameId: string) =>
        storylines.filter((s) => s.game_id === gameId).map((s) => `${s.title} ${s.description ?? ""}`).join(" ");
      const gameIdeaText = (gameId: string) =>
        contentIdeas.filter((c) => c.game_id === gameId).map((c) => `${c.title} ${c.description ?? ""}`).join(" ");

      filtered = filtered.filter((g) =>
        matchesSearch(
          [
            g.home_team.name,
            g.away_team.name,
            g.rivalry_name,
            gameStorylineText(g.id),
            gameIdeaText(g.id),
          ],
          params.search!
        )
      );
    }

    return filtered.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
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
    let result = majorEvents.filter((e) => (params.includeArchived ? true : !e.archived_at));
    if (params.from) result = result.filter((e) => !e.start_time || new Date(e.start_time) >= params.from!);
    if (params.to) result = result.filter((e) => !e.start_time || new Date(e.start_time) <= params.to!);
    if (params.leagueId) result = result.filter((e) => e.league_id === params.leagueId);
    return result.sort((a, b) => {
      const at = a.start_time ? new Date(a.start_time).getTime() : Infinity;
      const bt = b.start_time ? new Date(b.start_time).getTime() : Infinity;
      return at - bt;
    });
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
    let result = storylines.filter((s) => (params.includeArchived ? true : !s.archived_at));
    if (params.gameId) result = result.filter((s) => s.game_id === params.gameId);
    if (params.majorEventId) result = result.filter((s) => s.major_event_id === params.majorEventId);
    if (params.leagueId) result = result.filter((s) => s.league_id === params.leagueId);
    if (params.leagueWideOnly) result = result.filter((s) => !s.game_id && !s.major_event_id && !!s.league_id);
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
    let result = contentIdeas.filter((c) => (params.includeArchived ? true : !c.archived_at));
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
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
