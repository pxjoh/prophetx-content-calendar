// One-off runner for applying raw SQL files (migrations/seeds) directly to the
// Supabase Postgres instance. Reads the connection string straight out of
// .env.local instead of relying on a global dotenv loader, since this is a
// plain Node script (only Next.js auto-loads .env.local).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

function loadEnvLocal() {
  const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value;
  }
  return env;
}

async function main() {
  const sqlPath = process.argv[2];
  if (!sqlPath) {
    console.error("Usage: node scripts/run-sql.mjs <path-to-sql-file>");
    process.exit(1);
  }

  const env = loadEnvLocal();
  const rawConnectionString = env.POSTGRES_URL_NON_POOLING;
  if (!rawConnectionString) {
    console.error("POSTGRES_URL_NON_POOLING not found in .env.local");
    process.exit(1);
  }
  // Strip sslmode from the URL so it can't override the explicit ssl config below.
  const connectionString = rawConnectionString.replace(/([?&])sslmode=[^&]*&?/, "$1").replace(/[?&]$/, "");

  const sql = readFileSync(resolve(process.cwd(), sqlPath), "utf8");

  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
    console.log(`Applied ${sqlPath} successfully.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
