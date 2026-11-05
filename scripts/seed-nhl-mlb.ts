// One-time seed: adds NHL and MLB as leagues (missing from
// seed-reference-data.ts, which only covered NFL/CFB/NBA/CBB) with their
// real full rosters (name/abbreviation/primary_color only — no logo_url,
// since team logos aren't legally cleared for use; see README posting
// rules carried over from the sports toolkit). Conference/division
// grouping is intentionally skipped for these two leagues to keep this a
// quick, low-risk addition; teams remain fully editable afterward via the
// /teams page. Safe to re-run only once — it does not check for existing
// rows, so running it twice will duplicate leagues/teams.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

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

const NHL_TEAMS: { name: string; abbreviation: string; color: string }[] = [
  { name: "Anaheim Ducks", abbreviation: "ANA", color: "#F47A38" },
  { name: "Boston Bruins", abbreviation: "BOS", color: "#FFB81C" },
  { name: "Buffalo Sabres", abbreviation: "BUF", color: "#002654" },
  { name: "Calgary Flames", abbreviation: "CGY", color: "#C8102E" },
  { name: "Carolina Hurricanes", abbreviation: "CAR", color: "#CC0000" },
  { name: "Chicago Blackhawks", abbreviation: "CHI", color: "#CF0A2C" },
  { name: "Colorado Avalanche", abbreviation: "COL", color: "#6F263D" },
  { name: "Columbus Blue Jackets", abbreviation: "CBJ", color: "#002654" },
  { name: "Dallas Stars", abbreviation: "DAL", color: "#006847" },
  { name: "Detroit Red Wings", abbreviation: "DET", color: "#CE1126" },
  { name: "Edmonton Oilers", abbreviation: "EDM", color: "#041E42" },
  { name: "Florida Panthers", abbreviation: "FLA", color: "#C8102E" },
  { name: "Los Angeles Kings", abbreviation: "LAK", color: "#111111" },
  { name: "Minnesota Wild", abbreviation: "MIN", color: "#154734" },
  { name: "Montreal Canadiens", abbreviation: "MTL", color: "#AF1E2D" },
  { name: "Nashville Predators", abbreviation: "NSH", color: "#FFB81C" },
  { name: "New Jersey Devils", abbreviation: "NJD", color: "#CE1126" },
  { name: "New York Islanders", abbreviation: "NYI", color: "#00539B" },
  { name: "New York Rangers", abbreviation: "NYR", color: "#0038A8" },
  { name: "Ottawa Senators", abbreviation: "OTT", color: "#C52032" },
  { name: "Philadelphia Flyers", abbreviation: "PHI", color: "#F74902" },
  { name: "Pittsburgh Penguins", abbreviation: "PIT", color: "#FCB514" },
  { name: "San Jose Sharks", abbreviation: "SJS", color: "#006D75" },
  { name: "Seattle Kraken", abbreviation: "SEA", color: "#001628" },
  { name: "St. Louis Blues", abbreviation: "STL", color: "#002F87" },
  { name: "Tampa Bay Lightning", abbreviation: "TBL", color: "#002868" },
  { name: "Toronto Maple Leafs", abbreviation: "TOR", color: "#00205B" },
  { name: "Utah Mammoth", abbreviation: "UTA", color: "#71AFE5" },
  { name: "Vancouver Canucks", abbreviation: "VAN", color: "#00205B" },
  { name: "Vegas Golden Knights", abbreviation: "VGK", color: "#B4975A" },
  { name: "Washington Capitals", abbreviation: "WSH", color: "#C8102E" },
  { name: "Winnipeg Jets", abbreviation: "WPG", color: "#041E42" },
];

const MLB_TEAMS: { name: string; abbreviation: string; color: string }[] = [
  { name: "Arizona Diamondbacks", abbreviation: "ARI", color: "#A71930" },
  { name: "Atlanta Braves", abbreviation: "ATL", color: "#CE1141" },
  { name: "Baltimore Orioles", abbreviation: "BAL", color: "#DF4601" },
  { name: "Boston Red Sox", abbreviation: "BOS", color: "#BD3039" },
  { name: "Chicago Cubs", abbreviation: "CHC", color: "#0E3386" },
  { name: "Chicago White Sox", abbreviation: "CWS", color: "#27251F" },
  { name: "Cincinnati Reds", abbreviation: "CIN", color: "#C6011F" },
  { name: "Cleveland Guardians", abbreviation: "CLE", color: "#00385D" },
  { name: "Colorado Rockies", abbreviation: "COL", color: "#33006F" },
  { name: "Detroit Tigers", abbreviation: "DET", color: "#0C2340" },
  { name: "Houston Astros", abbreviation: "HOU", color: "#002D62" },
  { name: "Kansas City Royals", abbreviation: "KC", color: "#004687" },
  { name: "Los Angeles Angels", abbreviation: "LAA", color: "#BA0021" },
  { name: "Los Angeles Dodgers", abbreviation: "LAD", color: "#005A9C" },
  { name: "Miami Marlins", abbreviation: "MIA", color: "#00A3E0" },
  { name: "Milwaukee Brewers", abbreviation: "MIL", color: "#12284B" },
  { name: "Minnesota Twins", abbreviation: "MIN", color: "#002B5C" },
  { name: "New York Mets", abbreviation: "NYM", color: "#002D72" },
  { name: "New York Yankees", abbreviation: "NYY", color: "#003087" },
  { name: "Athletics", abbreviation: "ATH", color: "#003831" },
  { name: "Philadelphia Phillies", abbreviation: "PHI", color: "#E81828" },
  { name: "Pittsburgh Pirates", abbreviation: "PIT", color: "#FDB827" },
  { name: "San Diego Padres", abbreviation: "SD", color: "#2F241D" },
  { name: "San Francisco Giants", abbreviation: "SF", color: "#FD5A1E" },
  { name: "Seattle Mariners", abbreviation: "SEA", color: "#0C2C56" },
  { name: "St. Louis Cardinals", abbreviation: "STL", color: "#C41E3A" },
  { name: "Tampa Bay Rays", abbreviation: "TB", color: "#092C5C" },
  { name: "Texas Rangers", abbreviation: "TEX", color: "#003278" },
  { name: "Toronto Blue Jays", abbreviation: "TOR", color: "#134A8E" },
  { name: "Washington Nationals", abbreviation: "WSH", color: "#AB0003" },
];

async function main() {
  const { data: leagueRows, error: leagueError } = await client
    .from("leagues")
    .insert([
      { name: "NHL", slug: "nhl", sport: "Hockey", sort_order: 5 },
      { name: "MLB", slug: "mlb", sport: "Baseball", sort_order: 6 },
    ])
    .select("*");
  if (leagueError) fail("insert leagues", leagueError);
  const leagueIdBySlug = new Map(leagueRows!.map((l) => [l.slug, l.id as string]));
  console.log(`Inserted ${leagueRows!.length} leagues.`);

  const teamInserts = [
    ...NHL_TEAMS.map((t) => ({
      league_id: leagueIdBySlug.get("nhl")!,
      name: t.name,
      short_name: t.name.split(" ").slice(-1)[0],
      abbreviation: t.abbreviation,
      primary_color: t.color,
      record: "0-0",
      is_sample: false,
    })),
    ...MLB_TEAMS.map((t) => ({
      league_id: leagueIdBySlug.get("mlb")!,
      name: t.name,
      short_name: t.name.split(" ").slice(-1)[0],
      abbreviation: t.abbreviation,
      primary_color: t.color,
      record: "0-0",
      is_sample: false,
    })),
  ];

  const { data: teamRows, error: teamError } = await client.from("teams").insert(teamInserts).select("id");
  if (teamError) fail("insert teams", teamError);
  console.log(`Inserted ${teamRows!.length} teams (${NHL_TEAMS.length} NHL + ${MLB_TEAMS.length} MLB).`);
  console.log("\nDone.");
}

main().catch((err) => fail("seed script", err));
