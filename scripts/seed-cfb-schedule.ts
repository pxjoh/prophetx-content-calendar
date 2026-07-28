// Inserts the real 2026 Power 4 conference-game schedule (see
// cfb-2026-schedule-data.ts). Every game is date-confirmed with kickoff time
// marked TBD (start_time_tbd: true, placeholder noon ET) since real TV/time
// designations aren't set this far out. Dedupes any accidental reverse-order
// repeats (same two teams, same date) before inserting.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { CFB_SCHEDULE_2026, CFB_TEAM_ALIASES } from "./cfb-2026-schedule-data";

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

async function main() {
  const { data: league, error: leagueError } = await client.from("leagues").select("id").eq("slug", "cfb").single();
  if (leagueError || !league) {
    console.error("Could not find CFB league — run seed-cfb-power4.ts first.", leagueError);
    process.exit(1);
  }

  const { data: teams, error: teamsError } = await client.from("teams").select("id, abbreviation").eq("league_id", league.id);
  if (teamsError || !teams) {
    console.error("Could not fetch CFB teams", teamsError);
    process.exit(1);
  }
  const teamIdByAbbr = new Map(teams.map((t) => [t.abbreviation, t.id as string]));

  const seenPairs = new Set<string>();
  const inserts: Record<string, unknown>[] = [];
  let skippedUnknownTeam = 0;
  let skippedDuplicate = 0;

  for (const entry of CFB_SCHEDULE_2026) {
    const homeAbbr = CFB_TEAM_ALIASES[entry.home];
    const awayAbbr = CFB_TEAM_ALIASES[entry.away];
    const homeId = homeAbbr ? teamIdByAbbr.get(homeAbbr) : undefined;
    const awayId = awayAbbr ? teamIdByAbbr.get(awayAbbr) : undefined;
    if (!homeId || !awayId) {
      console.warn(`Unknown team alias: ${entry.away} @ ${entry.home} (${entry.date})`);
      skippedUnknownTeam++;
      continue;
    }

    const pairKey = [entry.date, [homeId, awayId].sort().join("-")].join("|");
    if (seenPairs.has(pairKey)) {
      skippedDuplicate++;
      continue;
    }
    seenPairs.add(pairKey);

    inserts.push({
      league_id: league.id,
      season: "2026",
      week: null,
      home_team_id: homeId,
      away_team_id: awayId,
      start_time: `${entry.date}T12:00:00-04:00`,
      start_time_tbd: true,
      tv_network: null,
      status: "scheduled",
      importance: "standard",
      importance_is_manual: false,
      is_sample: false,
    });
  }

  const { data: inserted, error: insertError } = await client.from("games").insert(inserts).select("id");
  if (insertError) {
    console.error("Insert failed", insertError);
    process.exit(1);
  }

  console.log(`Inserted ${inserted!.length} real CFB conference games.`);
  if (skippedDuplicate > 0) console.log(`Skipped ${skippedDuplicate} accidental duplicate entries.`);
  if (skippedUnknownTeam > 0) console.log(`Skipped ${skippedUnknownTeam} games due to unrecognized team alias.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
