// Replaces the old 3 fake sample CFB games (and rebuilds the CFB team roster)
// with the full, real Power 4 conference membership: SEC, Big Ten, Big 12,
// ACC (67 teams). Deleting the sample games cascades to their attached
// storylines/content ideas per the schema's ON DELETE CASCADE. Notre Dame is
// intentionally excluded — it's an FBS independent, not a Power 4 conference
// member, for football.
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

const CONFERENCES = ["SEC", "Big Ten", "Big 12", "ACC"] as const;

const TEAMS: { name: string; abbreviation: string; color: string; conference: (typeof CONFERENCES)[number] }[] = [
  // SEC (16)
  { name: "Alabama Crimson Tide", abbreviation: "ALA", color: "#9E1B32", conference: "SEC" },
  { name: "Arkansas Razorbacks", abbreviation: "ARK", color: "#9D2235", conference: "SEC" },
  { name: "Auburn Tigers", abbreviation: "AUB", color: "#0C2340", conference: "SEC" },
  { name: "Florida Gators", abbreviation: "FLA", color: "#0021A5", conference: "SEC" },
  { name: "Georgia Bulldogs", abbreviation: "UGA", color: "#BA0C2F", conference: "SEC" },
  { name: "Kentucky Wildcats", abbreviation: "UK", color: "#0033A0", conference: "SEC" },
  { name: "LSU Tigers", abbreviation: "LSU", color: "#461D7C", conference: "SEC" },
  { name: "Mississippi State Bulldogs", abbreviation: "MSST", color: "#660000", conference: "SEC" },
  { name: "Missouri Tigers", abbreviation: "MIZ", color: "#F1B82D", conference: "SEC" },
  { name: "Ole Miss Rebels", abbreviation: "MISS", color: "#14213D", conference: "SEC" },
  { name: "Oklahoma Sooners", abbreviation: "OU", color: "#841617", conference: "SEC" },
  { name: "South Carolina Gamecocks", abbreviation: "SC", color: "#73000A", conference: "SEC" },
  { name: "Tennessee Volunteers", abbreviation: "TENN", color: "#FF8200", conference: "SEC" },
  { name: "Texas Longhorns", abbreviation: "TEX", color: "#BF5700", conference: "SEC" },
  { name: "Texas A&M Aggies", abbreviation: "TAMU", color: "#500000", conference: "SEC" },
  { name: "Vanderbilt Commodores", abbreviation: "VANDY", color: "#866D4B", conference: "SEC" },

  // Big Ten (18)
  { name: "Illinois Fighting Illini", abbreviation: "ILL", color: "#E84A27", conference: "Big Ten" },
  { name: "Indiana Hoosiers", abbreviation: "IU", color: "#990000", conference: "Big Ten" },
  { name: "Iowa Hawkeyes", abbreviation: "IOWA", color: "#FFCD00", conference: "Big Ten" },
  { name: "Maryland Terrapins", abbreviation: "UMD", color: "#E03A3E", conference: "Big Ten" },
  { name: "Michigan Wolverines", abbreviation: "MICH", color: "#00274C", conference: "Big Ten" },
  { name: "Michigan State Spartans", abbreviation: "MSU", color: "#18453B", conference: "Big Ten" },
  { name: "Minnesota Golden Gophers", abbreviation: "MINN", color: "#7A0019", conference: "Big Ten" },
  { name: "Nebraska Cornhuskers", abbreviation: "NEB", color: "#E41C38", conference: "Big Ten" },
  { name: "Northwestern Wildcats", abbreviation: "NW", color: "#4E2A84", conference: "Big Ten" },
  { name: "Ohio State Buckeyes", abbreviation: "OSU", color: "#BB0000", conference: "Big Ten" },
  { name: "Oregon Ducks", abbreviation: "ORE", color: "#154733", conference: "Big Ten" },
  { name: "Penn State Nittany Lions", abbreviation: "PSU", color: "#041E42", conference: "Big Ten" },
  { name: "Purdue Boilermakers", abbreviation: "PUR", color: "#CEB888", conference: "Big Ten" },
  { name: "Rutgers Scarlet Knights", abbreviation: "RUT", color: "#CC0033", conference: "Big Ten" },
  { name: "UCLA Bruins", abbreviation: "UCLA", color: "#2D68C4", conference: "Big Ten" },
  { name: "USC Trojans", abbreviation: "USC", color: "#990000", conference: "Big Ten" },
  { name: "Washington Huskies", abbreviation: "WASH", color: "#4B2E83", conference: "Big Ten" },
  { name: "Wisconsin Badgers", abbreviation: "WIS", color: "#C5050C", conference: "Big Ten" },

  // Big 12 (16)
  { name: "Arizona Wildcats", abbreviation: "ARIZ", color: "#AB0520", conference: "Big 12" },
  { name: "Arizona State Sun Devils", abbreviation: "ASU", color: "#8C1D40", conference: "Big 12" },
  { name: "Baylor Bears", abbreviation: "BAY", color: "#003015", conference: "Big 12" },
  { name: "BYU Cougars", abbreviation: "BYU", color: "#002E5D", conference: "Big 12" },
  { name: "Cincinnati Bearcats", abbreviation: "CIN", color: "#E00122", conference: "Big 12" },
  { name: "Colorado Buffaloes", abbreviation: "COLO", color: "#CFB87C", conference: "Big 12" },
  { name: "Houston Cougars", abbreviation: "HOU", color: "#C8102E", conference: "Big 12" },
  { name: "Iowa State Cyclones", abbreviation: "ISU", color: "#C8102E", conference: "Big 12" },
  { name: "Kansas Jayhawks", abbreviation: "KU", color: "#0051BA", conference: "Big 12" },
  { name: "Kansas State Wildcats", abbreviation: "KSU", color: "#512888", conference: "Big 12" },
  { name: "Oklahoma State Cowboys", abbreviation: "OKST", color: "#FF7300", conference: "Big 12" },
  { name: "TCU Horned Frogs", abbreviation: "TCU", color: "#4D1979", conference: "Big 12" },
  { name: "Texas Tech Red Raiders", abbreviation: "TTU", color: "#CC0000", conference: "Big 12" },
  { name: "UCF Knights", abbreviation: "UCF", color: "#000000", conference: "Big 12" },
  { name: "Utah Utes", abbreviation: "UTAH", color: "#CC0000", conference: "Big 12" },
  { name: "West Virginia Mountaineers", abbreviation: "WVU", color: "#EAAA00", conference: "Big 12" },

  // ACC (17)
  { name: "Boston College Eagles", abbreviation: "BC", color: "#8C2232", conference: "ACC" },
  { name: "California Golden Bears", abbreviation: "CAL", color: "#003262", conference: "ACC" },
  { name: "Clemson Tigers", abbreviation: "CLEM", color: "#F56600", conference: "ACC" },
  { name: "Duke Blue Devils", abbreviation: "DUKE", color: "#003087", conference: "ACC" },
  { name: "Florida State Seminoles", abbreviation: "FSU", color: "#782F40", conference: "ACC" },
  { name: "Georgia Tech Yellow Jackets", abbreviation: "GT", color: "#B3A369", conference: "ACC" },
  { name: "Louisville Cardinals", abbreviation: "LOU", color: "#AD0000", conference: "ACC" },
  { name: "Miami Hurricanes", abbreviation: "MIA", color: "#F47321", conference: "ACC" },
  { name: "NC State Wolfpack", abbreviation: "NCST", color: "#CC0000", conference: "ACC" },
  { name: "North Carolina Tar Heels", abbreviation: "UNC", color: "#7BAFD4", conference: "ACC" },
  { name: "Pittsburgh Panthers", abbreviation: "PITT", color: "#003594", conference: "ACC" },
  { name: "SMU Mustangs", abbreviation: "SMU", color: "#0033A0", conference: "ACC" },
  { name: "Stanford Cardinal", abbreviation: "STAN", color: "#8C1515", conference: "ACC" },
  { name: "Syracuse Orange", abbreviation: "SYR", color: "#F76900", conference: "ACC" },
  { name: "Virginia Cavaliers", abbreviation: "UVA", color: "#232D4B", conference: "ACC" },
  { name: "Virginia Tech Hokies", abbreviation: "VT", color: "#630031", conference: "ACC" },
  { name: "Wake Forest Demon Deacons", abbreviation: "WAKE", color: "#9E7E38", conference: "ACC" },
];

async function main() {
  const { data: league, error: leagueError } = await client.from("leagues").select("id").eq("slug", "cfb").single();
  if (leagueError || !league) fail("find cfb league", leagueError);

  // 1. Clean up the old placeholder CFB games (cascades to their storylines/content ideas).
  const { data: oldGames } = await client.from("games").select("id").eq("league_id", league!.id).eq("is_sample", true);
  if (oldGames?.length) {
    const { error } = await client
      .from("games")
      .delete()
      .in("id", oldGames.map((g) => g.id));
    if (error) fail("delete old sample cfb games", error);
    console.log(`Deleted ${oldGames.length} old placeholder CFB games (and their storylines/content ideas via cascade).`);
  }

  // 2. Remove the old 3-conference/8-team CFB reference data so we start clean.
  const { data: oldTeams } = await client.from("teams").select("id").eq("league_id", league!.id);
  if (oldTeams?.length) {
    const { error } = await client
      .from("teams")
      .delete()
      .in("id", oldTeams.map((t) => t.id));
    if (error) fail("delete old cfb teams", error);
  }
  const { error: delConfError } = await client.from("conferences").delete().eq("league_id", league!.id);
  if (delConfError) fail("delete old cfb conferences", delConfError);

  // 3. Insert the real Power 4 conferences.
  const { data: conferenceRows, error: confError } = await client
    .from("conferences")
    .insert(CONFERENCES.map((name) => ({ league_id: league!.id, name, short_name: name })))
    .select("*");
  if (confError) fail("insert conferences", confError);
  const conferenceIdByName = new Map(conferenceRows!.map((c) => [c.name, c.id as string]));

  // 4. Insert the real 67-team Power 4 roster.
  const { data: teamRows, error: teamError } = await client
    .from("teams")
    .insert(
      TEAMS.map((t) => ({
        league_id: league!.id,
        conference_id: conferenceIdByName.get(t.conference)!,
        name: t.name,
        short_name: t.name.split(" ").pop()!,
        abbreviation: t.abbreviation,
        primary_color: t.color,
        record: "0-0",
        conference_record: "0-0",
        is_sample: false,
      }))
    )
    .select("id");
  if (teamError) fail("insert teams", teamError);

  console.log(`Inserted ${conferenceRows!.length} conferences and ${teamRows!.length} real Power 4 CFB teams.`);
}

main().catch((err) => fail("seed script", err));
