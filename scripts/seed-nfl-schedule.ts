// Inserts the real 2026 NFL schedule (see nfl-2026-schedule-data.ts) as real
// (is_sample: false) games, resolving each team alias against the 32 real
// NFL teams seeded by seed-reference-data.ts. Entries with no confirmed
// kickoff time (late-season flex-scheduling slots) are skipped rather than
// given a fabricated time — the schema requires start_time NOT NULL, and
// guessing would misrepresent genuinely-unknown data as confirmed.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { NFL_SCHEDULE_2026, TEAM_ALIASES, type RawScheduleGame } from "./nfl-2026-schedule-data";

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

const PRIMETIME_NETWORKS = new Set(["NBC", "ESPN", "Prime Video", "Netflix", "Peacock"]);

function computeImportance(entry: RawScheduleGame): "standard" | "notable" | "major" {
  if (entry.venue) return "major";
  if (entry.week === 1 && entry.away === "Patriots" && entry.home === "Seahawks") return "major";
  if (entry.network && PRIMETIME_NETWORKS.has(entry.network)) return "notable";
  return "standard";
}

function toStartTime(entry: RawScheduleGame): string | null {
  if (!entry.time) return null;
  const offset = entry.edt ? "-04:00" : "-05:00";
  return `${entry.date}T${entry.time}:00${offset}`;
}

async function main() {
  const { data: league, error: leagueError } = await client.from("leagues").select("id").eq("slug", "nfl").single();
  if (leagueError || !league) {
    console.error("Could not find NFL league — run seed-reference-data.ts first.", leagueError);
    process.exit(1);
  }

  const { data: teams, error: teamsError } = await client.from("teams").select("id, abbreviation").eq("league_id", league.id);
  if (teamsError || !teams) {
    console.error("Could not fetch NFL teams", teamsError);
    process.exit(1);
  }
  const teamIdByAbbr = new Map(teams.map((t) => [t.abbreviation, t.id as string]));

  const inserts: Record<string, unknown>[] = [];
  let skippedNoTime = 0;
  let skippedUnknownTeam = 0;

  for (const entry of NFL_SCHEDULE_2026) {
    const startTime = toStartTime(entry);
    if (!startTime) {
      skippedNoTime++;
      continue;
    }
    const awayAbbr = TEAM_ALIASES[entry.away];
    const homeAbbr = TEAM_ALIASES[entry.home];
    const awayId = awayAbbr ? teamIdByAbbr.get(awayAbbr) : undefined;
    const homeId = homeAbbr ? teamIdByAbbr.get(homeAbbr) : undefined;
    if (!awayId || !homeId) {
      console.warn(`Unknown team alias: ${entry.away} @ ${entry.home} (week ${entry.week})`);
      skippedUnknownTeam++;
      continue;
    }

    inserts.push({
      league_id: league.id,
      season: "2026",
      week: `Week ${entry.week}`,
      home_team_id: homeId,
      away_team_id: awayId,
      start_time: startTime,
      tv_network: entry.network,
      venue: entry.venue ?? null,
      status: "scheduled",
      importance: computeImportance(entry),
      importance_is_manual: false,
      is_sample: false,
    });
  }

  const { data: inserted, error: insertError } = await client.from("games").insert(inserts).select("id");
  if (insertError) {
    console.error("Insert failed", insertError);
    process.exit(1);
  }

  console.log(`Inserted ${inserted!.length} real NFL games.`);
  console.log(`Skipped ${skippedNoTime} games with no confirmed kickoff time yet (late-season flex scheduling).`);
  if (skippedUnknownTeam > 0) console.log(`Skipped ${skippedUnknownTeam} games due to unrecognized team alias — check TEAM_ALIASES.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
