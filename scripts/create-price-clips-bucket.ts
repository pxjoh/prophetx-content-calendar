// One-time setup: creates the public Supabase Storage bucket Price Clips
// uploads rendered MP4s/PNGs into. Safe to re-run (createBucket is a no-op
// error if it already exists, which this script treats as success).
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

async function main() {
  const env = loadEnvLocal();
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await client.storage.createBucket("price-clips", {
    public: true,
    fileSizeLimit: "50MB",
    allowedMimeTypes: ["video/mp4", "image/png"],
  });
  if (error && !/already exists/i.test(error.message)) {
    console.error("Failed to create bucket:", error);
    process.exit(1);
  }
  console.log(error ? "Bucket already exists." : "Created price-clips bucket.");
}

main();
