// One-time seed: real leagues + real full NFL roster/divisions, plus the
// existing CFB/NBA/CBB sample teams/games/storylines/content ideas ported
// over (still flagged is_sample) so those leagues aren't empty once the app
// cuts over from the in-memory store to Supabase. NFL sample games are
// intentionally NOT carried over — they're replaced by the real schedule in
// scripts/seed-nfl-schedule.ts.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import * as sample from "../src/lib/data/sample-data";

function loadEnvLocal() {
  const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value;
  }
  return env;
}

const env = loadEnvLocal();
const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function fail(label: string, error: unknown): never {
  console.error(`Failed: ${label}`, error);
  process.exit(1);
}

const NFL_DIVISIONS = [
  "AFC East",
  "AFC North",
  "AFC South",
  "AFC West",
  "NFC East",
  "NFC North",
  "NFC South",
  "NFC West",
] as const;

const NFL_TEAMS: { name: string; abbreviation: string; color: string; division: (typeof NFL_DIVISIONS)[number] }[] = [
  { name: "Buffalo Bills", abbreviation: "BUF", color: "#00338D", division: "AFC East" },
  { name: "Miami Dolphins", abbreviation: "MIA", color: "#008E97", division: "AFC East" },
  { name: "New England Patriots", abbreviation: "NE", color: "#002244", division: "AFC East" },
  { name: "New York Jets", abbreviation: "NYJ", color: "#125740", division: "AFC East" },
  { name: "Baltimore Ravens", abbreviation: "BAL", color: "#241773", division: "AFC North" },
  { name: "Cincinnati Bengals", abbreviation: "CIN", color: "#FB4F14", division: "AFC North" },
  { name: "Cleveland Browns", abbreviation: "CLE", color: "#311D00", division: "AFC North" },
  { name: "Pittsburgh Steelers", abbreviation: "PIT", color: "#FFB612", division: "AFC North" },
  { name: "Houston Texans", abbreviation: "HOU", color: "#03202F", division: "AFC South" },
  { name: "Indianapolis Colts", abbreviation: "IND", color: "#002C5F", division: "AFC South" },
  { name: "Jacksonville Jaguars", abbreviation: "JAX", color: "#006778", division: "AFC South" },
  { name: "Tennessee Titans", abbreviation: "TEN", color: "#4B92DB", division: "AFC South" },
  { name: "Denver Broncos", abbreviation: "DEN", color: "#FB4F14", division: "AFC West" },
  { name: "Kansas City Chiefs", abbreviation: "KC", color: "#E31837", division: "AFC West" },
  { name: "Las Vegas Raiders", abbreviation: "LV", color: "#000000", division: "AFC West" },
  { name: "Los Angeles Chargers", abbreviation: "LAC", color: "#0080C6", division: "AFC West" },
  { name: "Dallas Cowboys", abbreviation: "DAL", color: "#041E42", division: "NFC East" },
  { name: "New York Giants", abbreviation: "NYG", color: "#0B2265", division: "NFC East" },
  { name: "Philadelphia Eagles", abbreviation: "PHI", color: "#004C54", division: "NFC East" },
  { name: "Washington Commanders", abbreviation: "WAS", color: "#5A1414", division: "NFC East" },
  { name: "Chicago Bears", abbreviation: "CHI", color: "#0B162A", division: "NFC North" },
  { name: "Detroit Lions", abbreviation: "DET", color: "#0076B6", division: "NFC North" },
  { name: "Green Bay Packers", abbreviation: "GB", color: "#203731", division: "NFC North" },
  { name: "Minnesota Vikings", abbreviation: "MIN", color: "#4F2683", division: "NFC North" },
  { name: "Atlanta Falcons", abbreviation: "ATL", color: "#A71930", division: "NFC South" },
  { name: "Carolina Panthers", abbreviation: "CAR", color: "#0085CA", division: "NFC South" },
  { name: "New Orleans Saints", abbreviation: "NO", color: "#D3BC8D", division: "NFC South" },
  { name: "Tampa Bay Buccaneers", abbreviation: "TB", color: "#D50A0A", division: "NFC South" },
  { name: "Arizona Cardinals", abbreviation: "ARI", color: "#97233F", division: "NFC West" },
  { name: "Los Angeles Rams", abbreviation: "LAR", color: "#003594", division: "NFC West" },
  { name: "San Francisco 49ers", abbreviation: "SF", color: "#AA0000", division: "NFC West" },
  { name: "Seattle Seahawks", abbreviation: "SEA", color: "#002244", division: "NFC West" },
];

async function main() {
  // 1. Leagues -----------------------------------------------------------
  const { data: leagueRows, error: leagueError } = await client
    .from("leagues")
    .insert([
      { name: "NFL", slug: "nfl", sport: "Football", sort_order: 1 },
      { name: "College Football", slug: "cfb", sport: "Football", sort_order: 2 },
      { name: "NBA", slug: "nba", sport: "Basketball", sort_order: 3 },
      { name: "College Basketball", slug: "cbb", sport: "Basketball", sort_order: 4 },
    ])
    .select("*");
  if (leagueError) fail("insert leagues", leagueError);
  const leagueIdBySlug = new Map(leagueRows!.map((l) => [l.slug, l.id as string]));
  const oldLeagueIdToNew = new Map(sample.leagues.map((l) => [l.id, leagueIdBySlug.get(l.slug)!]));
  console.log(`Inserted ${leagueRows!.length} leagues.`);

  // 2. Conferences ---------------------------------------------------------
  const nflConferenceInserts = NFL_DIVISIONS.map((name) => ({
    league_id: leagueIdBySlug.get("nfl")!,
    name,
    short_name: name,
  }));
  const sampleConferenceInserts = sample.conferences
    .filter((c) => oldLeagueIdToNew.get(c.league_id) !== leagueIdBySlug.get("nfl"))
    .map((c) => ({ league_id: oldLeagueIdToNew.get(c.league_id)!, name: c.name, short_name: c.short_name }));

  const { data: conferenceRows, error: conferenceError } = await client
    .from("conferences")
    .insert([...nflConferenceInserts, ...sampleConferenceInserts])
    .select("*");
  if (conferenceError) fail("insert conferences", conferenceError);

  const nflConferenceIdByDivision = new Map(conferenceRows!.filter((c) => c.league_id === leagueIdBySlug.get("nfl")).map((c) => [c.name, c.id as string]));
  const oldConferenceIdToNew = new Map<string, string>();
  for (const c of sample.conferences) {
    const newLeagueId = oldLeagueIdToNew.get(c.league_id);
    if (newLeagueId === leagueIdBySlug.get("nfl")) continue;
    const match = conferenceRows!.find((r) => r.league_id === newLeagueId && r.name === c.name);
    if (match) oldConferenceIdToNew.set(c.id, match.id);
  }
  console.log(`Inserted ${conferenceRows!.length} conferences.`);

  // 3. Teams -----------------------------------------------------------------
  const nflTeamInserts = NFL_TEAMS.map((t) => ({
    league_id: leagueIdBySlug.get("nfl")!,
    conference_id: nflConferenceIdByDivision.get(t.division)!,
    name: t.name,
    short_name: t.name.split(" ").slice(-1)[0],
    abbreviation: t.abbreviation,
    primary_color: t.color,
    record: "0-0",
    is_sample: false,
  }));
  const sampleTeamInserts = sample.teams
    .filter((t) => oldLeagueIdToNew.get(t.league_id) !== leagueIdBySlug.get("nfl"))
    .map((t) => ({
      league_id: oldLeagueIdToNew.get(t.league_id)!,
      conference_id: t.conference_id ? (oldConferenceIdToNew.get(t.conference_id) ?? null) : null,
      name: t.name,
      short_name: t.short_name,
      abbreviation: t.abbreviation,
      primary_color: t.primary_color,
      record: t.record,
      conference_record: t.conference_record,
      ranking: t.ranking,
      ranking_source: t.ranking_source,
      is_sample: true,
    }));

  const { data: teamRows, error: teamError } = await client
    .from("teams")
    .insert([...nflTeamInserts, ...sampleTeamInserts])
    .select("*");
  if (teamError) fail("insert teams", teamError);

  const oldTeamIdToNew = new Map<string, string>();
  for (const t of sample.teams) {
    if (oldLeagueIdToNew.get(t.league_id) === leagueIdBySlug.get("nfl")) continue;
    const newLeagueId = oldLeagueIdToNew.get(t.league_id);
    const match = teamRows!.find((r) => r.league_id === newLeagueId && r.name === t.name);
    if (match) oldTeamIdToNew.set(t.id, match.id);
  }
  console.log(`Inserted ${teamRows!.length} teams (32 real NFL + ${sampleTeamInserts.length} sample CFB/NBA/CBB).`);

  // 4. Sample games for CFB/NBA/CBB only (NFL sample games intentionally skipped) ---
  const nonNflSampleGames = sample.games.filter((g) => oldLeagueIdToNew.get(g.league_id) !== leagueIdBySlug.get("nfl"));
  const gameInserts = nonNflSampleGames.map((g) => ({
    league_id: oldLeagueIdToNew.get(g.league_id)!,
    season: g.season,
    week: g.week,
    home_team_id: oldTeamIdToNew.get(g.home_team_id)!,
    away_team_id: oldTeamIdToNew.get(g.away_team_id)!,
    start_time: g.start_time,
    tv_network: g.tv_network,
    venue: g.venue,
    status: g.status,
    odds_spread: g.odds_spread,
    odds_moneyline_home: g.odds_moneyline_home,
    odds_moneyline_away: g.odds_moneyline_away,
    odds_total: g.odds_total,
    prophetx_market_url: g.prophetx_market_url,
    importance: g.importance,
    importance_is_manual: g.importance_is_manual,
    is_rivalry: g.is_rivalry,
    rivalry_name: g.rivalry_name,
    playoff_implications: g.playoff_implications,
    tournament_implications: g.tournament_implications,
    conference_implications: g.conference_implications,
    game_importance_notes: g.game_importance_notes,
    notes: g.notes,
    is_sample: true,
  }));
  // A single batch insert returns rows in the same order they were given
  // (relied upon here instead of matching on e.g. start_time, since Postgres
  // round-trips timestamptz in a different string format than JS's
  // toISOString() and a strict string match would silently fail).
  const { data: gameRows, error: gameError } = await client.from("games").insert(gameInserts).select("id");
  if (gameError) fail("insert games", gameError);
  const oldGameIdToNew = new Map<string, string>();
  nonNflSampleGames.forEach((g, i) => oldGameIdToNew.set(g.id, gameRows![i].id));
  console.log(`Inserted ${gameRows!.length} sample CFB/NBA/CBB games.`);

  // 5. Major events (all leagues; dates/details are illustrative, kept as sample) ---
  const eventInserts = sample.majorEvents.map((e) => ({
    title: e.title,
    event_type: e.event_type,
    league_id: e.league_id ? (oldLeagueIdToNew.get(e.league_id) ?? null) : null,
    start_time: e.start_time,
    end_time: e.end_time,
    description: e.description,
    importance: e.importance,
    importance_is_manual: e.importance_is_manual,
    prophetx_market_url: e.prophetx_market_url,
    notes: e.notes,
    is_sample: true,
  }));
  const { data: eventRows, error: eventError } = await client.from("major_events").insert(eventInserts).select("id, title");
  if (eventError) fail("insert major_events", eventError);
  console.log(`Inserted ${eventRows!.length} major events.`);

  // 6. Storylines — only those tied to a carried-over game, or league-wide for non-NFL,
  //    or league-wide for NFL (no game reference needed) ------------------------------
  const storylineInserts = sample.storylines
    .filter((s) => !s.game_id || oldGameIdToNew.has(s.game_id))
    .map((s) => ({
      title: s.title,
      description: s.description,
      priority: s.priority,
      game_id: s.game_id ? oldGameIdToNew.get(s.game_id)! : null,
      major_event_id: null,
      league_id: s.league_id ? (oldLeagueIdToNew.get(s.league_id) ?? null) : null,
      relevant_players: s.relevant_players,
      notes: s.notes,
      is_sample: true,
    }));
  const eligibleStorylines = sample.storylines.filter((s) => !s.game_id || oldGameIdToNew.has(s.game_id));
  const { data: storylineRows, error: storylineError } = await client.from("storylines").insert(storylineInserts).select("id");
  if (storylineError) fail("insert storylines", storylineError);
  const oldStorylineIdToNew = new Map<string, string>();
  eligibleStorylines.forEach((s, i) => oldStorylineIdToNew.set(s.id, storylineRows![i].id));
  console.log(`Inserted ${storylineRows!.length} storylines.`);

  // 7. Content ideas (+ graphic/video detail rows) — only those tied to a carried-over game,
  //    or standalone (no game reference) ----------------------------------------------------
  const eligibleIdeas = sample.contentIdeas.filter((c) => !c.game_id || oldGameIdToNew.has(c.game_id));
  let insertedIdeaCount = 0;
  for (const idea of eligibleIdeas) {
    const { data: ideaRow, error: ideaError } = await client
      .from("content_ideas")
      .insert({
        title: idea.title,
        description: idea.description,
        content_type: idea.content_type,
        platform: idea.platform,
        priority: idea.priority,
        status: idea.status,
        due_date: idea.due_date,
        due_time: idea.due_time,
        game_id: idea.game_id ? oldGameIdToNew.get(idea.game_id)! : null,
        storyline_id: idea.storyline_id ? (oldStorylineIdToNew.get(idea.storyline_id) ?? null) : null,
        graphic_instructions: idea.graphic_instructions,
        video_instructions: idea.video_instructions,
        internal_notes: idea.internal_notes,
        is_sample: true,
      })
      .select("id")
      .single();
    if (ideaError) fail(`insert content idea "${idea.title}"`, ideaError);
    insertedIdeaCount++;

    if (idea.graphic_request) {
      const { id: _omit, content_idea_id: _omit2, ...gr } = idea.graphic_request;
      const { error } = await client.from("graphic_requests").insert({ content_idea_id: ideaRow!.id, ...gr });
      if (error) fail(`insert graphic_request for "${idea.title}"`, error);
    }
    if (idea.video_concept) {
      const { id: _omit, content_idea_id: _omit2, ...vc } = idea.video_concept;
      const { error } = await client.from("video_concepts").insert({ content_idea_id: ideaRow!.id, ...vc });
      if (error) fail(`insert video_concept for "${idea.title}"`, error);
    }
  }
  console.log(`Inserted ${insertedIdeaCount} content ideas.`);

  console.log("\nDone. Reference data + non-NFL sample content seeded.");
}

main().catch((err) => fail("seed script", err));
