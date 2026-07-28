// Supabase-backed implementation of DataStore. Each list method fetches a
// reasonably-scoped candidate set (small reference tables in full, games/
// events/ideas with a cheap date-range push-down where useful) and enriches
// it with joined data, then funnels through the SAME filter functions the
// in-memory store uses (see ./filters.ts) so behavior can never drift
// between the two backends.
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { applyContentIdeaFilters, applyGameFilters, applyMajorEventFilters, applyStorylineFilters } from "./filters";
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
import type {
  ContentIdea,
  Game,
  GameDetail,
  GameWithTeams,
  GraphicRequest,
  League,
  MajorEvent,
  NotificationType,
  ReferenceLink,
  RelatedTable,
  Storyline,
  Team,
  VideoConcept,
} from "@/types/domain";

function db() {
  return getSupabaseServerClient();
}

// Without generated Database types, supabase-js infers embed shapes from the
// select() string alone and (wrongly, for our unique-FK 1:1 embeds) defaults
// to arrays — so callers assert the real shape via <T> rather than relying
// on the client's inference.
function unwrap<T>(result: { data: unknown; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error("Expected data but got null");
  return result.data as T;
}

async function fetchLeagues(): Promise<League[]> {
  return unwrap(await db().from("leagues").select("*"));
}

async function fetchTeams(): Promise<Team[]> {
  return unwrap(await db().from("teams").select("*"));
}

async function pushNotification(input: {
  type: NotificationType;
  title: string;
  body?: string | null;
  related_table?: RelatedTable | null;
  related_id?: string | null;
}) {
  const { error } = await db().from("notifications").insert({
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    related_table: input.related_table ?? null,
    related_id: input.related_id ?? null,
    is_read: false,
  });
  if (error) throw new Error(error.message);
}

async function buildGamesWithTeams(games: Game[]): Promise<GameWithTeams[]> {
  if (games.length === 0) return [];

  // Fetch storylines/content_ideas/reference_links unfiltered-by-game-id and
  // group client-side instead of `.in("game_id", gameIds)` — with hundreds of
  // games that ID list becomes a multi-KB query string that can exceed URL
  // length limits (this broke prerendering once real NFL + CFB data landed).
  // These tables stay small regardless of how many games exist, so fetching
  // them in full is cheap and avoids the scaling trap entirely.
  const [leagues, teams, storylineRows, ideaRows, linkRows] = await Promise.all([
    fetchLeagues(),
    fetchTeams(),
    unwrap<{ id: string; game_id: string | null; title: string; description: string | null }[]>(
      await db().from("storylines").select("id, game_id, title, description").not("game_id", "is", null).is("archived_at", null)
    ),
    unwrap<
      {
        id: string;
        game_id: string | null;
        title: string;
        description: string | null;
        graphic_requests: { id: string } | null;
        video_concepts: { id: string } | null;
      }[]
    >(
      await db()
        .from("content_ideas")
        .select("id, game_id, title, description, graphic_requests(id), video_concepts(id)")
        .not("game_id", "is", null)
        .is("archived_at", null)
    ),
    unwrap<ReferenceLink[]>(await db().from("reference_links").select("*").eq("related_table", "games")),
  ]);

  const leagueById = new Map(leagues.map((l) => [l.id, l]));
  const teamById = new Map(teams.map((t) => [t.id, t]));

  return games.map((game) => {
    const storylinesForGame = storylineRows.filter((s) => s.game_id === game.id);
    const ideasForGame = ideaRows.filter((c) => c.game_id === game.id);
    const league = leagueById.get(game.league_id);
    const homeTeam = teamById.get(game.home_team_id);
    const awayTeam = teamById.get(game.away_team_id);
    if (!league || !homeTeam || !awayTeam) {
      throw new Error(`Game ${game.id} references a missing league or team`);
    }
    return {
      ...game,
      league,
      home_team: homeTeam,
      away_team: awayTeam,
      storyline_count: storylinesForGame.length,
      content_idea_count: ideasForGame.length,
      has_graphic_request: ideasForGame.some((c) => c.graphic_requests !== null),
      has_video_request: ideasForGame.some((c) => c.video_concepts !== null),
      reference_links: linkRows.filter((r) => r.related_id === game.id),
      __searchText: {
        storylines: storylinesForGame.map((s) => `${s.title} ${s.description ?? ""}`).join(" "),
        ideas: ideasForGame.map((c) => `${c.title} ${c.description ?? ""}`).join(" "),
      },
    } as GameWithTeams & { __searchText: { storylines: string; ideas: string } };
  });
}

function normalizeContentIdea(
  row: ContentIdea & { graphic_requests?: GraphicRequest | null; video_concepts?: VideoConcept | null }
): ContentIdea {
  const { graphic_requests, video_concepts, ...rest } = row;
  return {
    ...rest,
    graphic_request: graphic_requests ?? null,
    video_concept: video_concepts ?? null,
  };
}

async function attachRelevantTeamIds(storylines: Storyline[]): Promise<Storyline[]> {
  if (storylines.length === 0) return storylines;
  const rows = unwrap<{ storyline_id: string; team_id: string }[]>(
    await db().from("storyline_teams").select("storyline_id, team_id").in(
      "storyline_id",
      storylines.map((s) => s.id)
    )
  );
  return storylines.map((s) => ({
    ...s,
    relevant_team_ids: rows.filter((r) => r.storyline_id === s.id).map((r) => r.team_id),
  }));
}

export const supabaseStore: DataStore = {
  async listLeagues() {
    const leagues = await fetchLeagues();
    return leagues.filter((l) => l.is_active).sort((a, b) => a.sort_order - b.sort_order);
  },

  async listTeams(leagueId) {
    let query = db().from("teams").select("*");
    if (leagueId) query = query.eq("league_id", leagueId);
    return unwrap(await query);
  },

  async listGames(params: GameFilterParams) {
    let query = db().from("games").select("*");
    if (!params.includeArchived) query = query.is("archived_at", null);
    const rows = unwrap<Game[]>(await query);
    const withMeta = (await buildGamesWithTeams(rows)) as (GameWithTeams & {
      __searchText: { storylines: string; ideas: string };
    })[];

    return applyGameFilters(withMeta, params, {
      getStorylineText: (gameId) => withMeta.find((g) => g.id === gameId)?.__searchText.storylines ?? "",
      getContentIdeaText: (gameId) => withMeta.find((g) => g.id === gameId)?.__searchText.ideas ?? "",
    });
  },

  async getGameDetail(id) {
    const { data: game, error } = await db().from("games").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!game) return null;

    const [[withMeta], storylinesRaw, ideasRaw] = await Promise.all([
      buildGamesWithTeams([game as Game]),
      unwrap<Storyline[]>(await db().from("storylines").select("*").eq("game_id", id).is("archived_at", null)),
      unwrap<(ContentIdea & { graphic_requests: GraphicRequest | null; video_concepts: VideoConcept | null })[]>(
        await db()
          .from("content_ideas")
          .select("*, graphic_requests(*), video_concepts(*)")
          .eq("game_id", id)
          .is("archived_at", null)
      ),
    ]);

    const storylines = await attachRelevantTeamIds(storylinesRaw);

    const detail: GameDetail = {
      ...withMeta,
      storylines,
      content_ideas: ideasRaw.map(normalizeContentIdea),
    };
    return detail;
  },

  async setGameImportance(id, importance, manual) {
    const { error } = await db().from("games").update({ importance, importance_is_manual: manual }).eq("id", id);
    if (error) throw new Error(error.message);
  },

  async archiveGame(id) {
    const { error } = await db().from("games").update({ archived_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error(error.message);
  },
  async restoreGame(id) {
    const { error } = await db().from("games").update({ archived_at: null }).eq("id", id);
    if (error) throw new Error(error.message);
  },

  async listMajorEvents(params: MajorEventFilterParams) {
    let query = db().from("major_events").select("*");
    if (!params.includeArchived) query = query.is("archived_at", null);
    const rows = unwrap<MajorEvent[]>(await query);
    return applyMajorEventFilters(rows, params);
  },

  async createMajorEvent(input: MajorEventInput) {
    const row = unwrap<MajorEvent>(
      await db()
        .from("major_events")
        .insert({
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
        })
        .select("*")
        .single()
    );
    await pushNotification({
      type: "major_event_approaching",
      title: "New major event added",
      body: row.title,
      related_table: "major_events",
      related_id: row.id,
    });
    return row;
  },

  async updateMajorEvent(id, input) {
    return unwrap<MajorEvent>(await db().from("major_events").update(input).eq("id", id).select("*").single());
  },

  async archiveMajorEvent(id) {
    const { error } = await db().from("major_events").update({ archived_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error(error.message);
  },
  async restoreMajorEvent(id) {
    const { error } = await db().from("major_events").update({ archived_at: null }).eq("id", id);
    if (error) throw new Error(error.message);
  },

  async listStorylines(params: StorylineFilterParams) {
    let query = db().from("storylines").select("*");
    if (!params.includeArchived) query = query.is("archived_at", null);
    const rows = unwrap<Storyline[]>(await query);
    const filtered = applyStorylineFilters(rows, params);
    return attachRelevantTeamIds(filtered);
  },

  async createStoryline(input: StorylineInput) {
    const row = unwrap<Storyline>(
      await db()
        .from("storylines")
        .insert({
          title: input.title,
          description: input.description ?? null,
          priority: input.priority,
          game_id: input.game_id ?? null,
          major_event_id: input.major_event_id ?? null,
          league_id: input.league_id ?? null,
          relevant_players: input.relevant_players ?? [],
          notes: input.notes ?? null,
        })
        .select("*")
        .single()
    );

    if (input.relevant_team_ids?.length) {
      const { error } = await db()
        .from("storyline_teams")
        .insert(input.relevant_team_ids.map((team_id) => ({ storyline_id: row.id, team_id })));
      if (error) throw new Error(error.message);
    }

    await pushNotification({
      type: row.priority === "breaking" ? "storyline_breaking" : "storyline_added",
      title: row.priority === "breaking" ? "Breaking storyline added" : "New storyline added",
      body: row.title,
      related_table: "storylines",
      related_id: row.id,
    });

    return { ...row, relevant_team_ids: input.relevant_team_ids ?? [] };
  },

  async updateStoryline(id, input) {
    const { relevant_team_ids, ...rest } = input;
    const row = unwrap<Storyline>(await db().from("storylines").update(rest).eq("id", id).select("*").single());

    if (relevant_team_ids !== undefined) {
      const { error: deleteError } = await db().from("storyline_teams").delete().eq("storyline_id", id);
      if (deleteError) throw new Error(deleteError.message);
      if (relevant_team_ids.length) {
        const { error: insertError } = await db()
          .from("storyline_teams")
          .insert(relevant_team_ids.map((team_id) => ({ storyline_id: id, team_id })));
        if (insertError) throw new Error(insertError.message);
      }
    }

    if (input.priority === "breaking") {
      await pushNotification({
        type: "storyline_breaking",
        title: "Storyline marked Breaking",
        body: row.title,
        related_table: "storylines",
        related_id: row.id,
      });
    }

    const [withTeams] = await attachRelevantTeamIds([row]);
    return withTeams;
  },

  async archiveStoryline(id) {
    const { error } = await db().from("storylines").update({ archived_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error(error.message);
  },
  async restoreStoryline(id) {
    const { error } = await db().from("storylines").update({ archived_at: null }).eq("id", id);
    if (error) throw new Error(error.message);
  },

  async listContentIdeas(params: ContentIdeaFilterParams) {
    let query = db().from("content_ideas").select("*, graphic_requests(*), video_concepts(*)");
    if (!params.includeArchived) query = query.is("archived_at", null);
    const rows = unwrap<(ContentIdea & { graphic_requests: GraphicRequest | null; video_concepts: VideoConcept | null })[]>(await query);
    return applyContentIdeaFilters(rows.map(normalizeContentIdea), params);
  },

  async createContentIdea(input: ContentIdeaInput) {
    const row = unwrap<ContentIdea>(
      await db()
        .from("content_ideas")
        .insert({
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
        })
        .select("*")
        .single()
    );

    let graphicRequest: GraphicRequest | null = null;
    let videoConcept: VideoConcept | null = null;

    if (input.graphic_request) {
      graphicRequest = unwrap<GraphicRequest>(
        await db()
          .from("graphic_requests")
          .insert({ content_idea_id: row.id, priority: input.priority, ...input.graphic_request })
          .select("*")
          .single()
      );
    }
    if (input.video_concept) {
      videoConcept = unwrap<VideoConcept>(
        await db()
          .from("video_concepts")
          .insert({ content_idea_id: row.id, priority: input.priority, ...input.video_concept })
          .select("*")
          .single()
      );
    }

    await pushNotification({
      type: "content_idea_added",
      title: "New content idea added",
      body: row.title,
      related_table: "content_ideas",
      related_id: row.id,
    });

    return { ...row, graphic_request: graphicRequest, video_concept: videoConcept };
  },

  async updateContentIdea(id, input) {
    const { graphic_request, video_concept, ...rest } = input;
    const row = unwrap<ContentIdea>(await db().from("content_ideas").update(rest).eq("id", id).select("*").single());

    let graphicRequest: GraphicRequest | null = null;
    if (graphic_request !== undefined) {
      if (graphic_request === null) {
        await db().from("graphic_requests").delete().eq("content_idea_id", id);
      } else {
        graphicRequest = unwrap<GraphicRequest>(
          await db()
            .from("graphic_requests")
            .upsert({ content_idea_id: id, priority: row.priority, ...graphic_request }, { onConflict: "content_idea_id" })
            .select("*")
            .single()
        );
      }
    } else {
      const { data } = await db().from("graphic_requests").select("*").eq("content_idea_id", id).maybeSingle();
      graphicRequest = data ?? null;
    }

    let videoConcept: VideoConcept | null = null;
    if (video_concept !== undefined) {
      if (video_concept === null) {
        await db().from("video_concepts").delete().eq("content_idea_id", id);
      } else {
        videoConcept = unwrap<VideoConcept>(
          await db()
            .from("video_concepts")
            .upsert({ content_idea_id: id, priority: row.priority, ...video_concept }, { onConflict: "content_idea_id" })
            .select("*")
            .single()
        );
      }
    } else {
      const { data } = await db().from("video_concepts").select("*").eq("content_idea_id", id).maybeSingle();
      videoConcept = data ?? null;
    }

    if (input.status) {
      await pushNotification({
        type: "status_changed",
        title: "Content idea status changed",
        body: `${row.title} → ${input.status}`,
        related_table: "content_ideas",
        related_id: row.id,
      });
    }

    return { ...row, graphic_request: graphicRequest, video_concept: videoConcept };
  },

  async archiveContentIdea(id) {
    const { error } = await db().from("content_ideas").update({ archived_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error(error.message);
  },
  async restoreContentIdea(id) {
    const { error } = await db().from("content_ideas").update({ archived_at: null }).eq("id", id);
    if (error) throw new Error(error.message);
  },

  async listReferenceLinks(table, id) {
    return unwrap(await db().from("reference_links").select("*").eq("related_table", table).eq("related_id", id));
  },
  async addReferenceLink(table, id, url, label) {
    return unwrap(
      await db()
        .from("reference_links")
        .insert({ related_table: table, related_id: id, url, label: label ?? null })
        .select("*")
        .single()
    );
  },
  async removeReferenceLink(id) {
    const { error } = await db().from("reference_links").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async listNotifications() {
    return unwrap(await db().from("notifications").select("*").order("created_at", { ascending: false }));
  },
  async markNotificationRead(id) {
    const { error } = await db().from("notifications").update({ is_read: true }).eq("id", id);
    if (error) throw new Error(error.message);
  },
  async markAllNotificationsRead() {
    const { error } = await db().from("notifications").update({ is_read: true }).eq("is_read", false);
    if (error) throw new Error(error.message);
  },
};
