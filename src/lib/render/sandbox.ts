// Runs render/clip.py inside an ephemeral Vercel Sandbox (a real Linux
// microVM) and returns the rendered MP4 + still PNG as buffers. The sandbox
// gets nothing but the renderer script, its font/logo assets, and a plain
// JSON payload — no Supabase or Snowflake credentials ever reach it. This is
// the only place in the app that shells out to ffmpeg, which Vercel
// serverless functions don't bundle.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { Sandbox } from "@vercel/sandbox";

const RENDER_DIR = join(process.cwd(), "render");
const SKIP = new Set(["_smoke_test.py", "__pycache__"]);

export interface RenderTeam {
  side: "home" | "away";
  name: string;
  abbr: string;
  color: [number, number, number];
  role?: string;
}

export interface RenderPoint {
  t: string; // ISO 8601
  mid: number; // cents
}

export interface RenderPayload {
  label: string;
  sub: string;
  size?: 720 | 1080;
  decimals?: 0 | 1;
  headline?: string | null;
  endline?: string | null;
  since?: string | null;
  until?: string | null;
  bucket_minutes?: number | null;
  teams: [RenderTeam, RenderTeam];
  points: { home: RenderPoint[]; away: RenderPoint[] };
}

export interface RenderResult {
  video: Buffer;
  still: Buffer;
  meta: { out: string; still: string; window: [string, string]; final: Record<string, number> };
}

function getSandboxCredentials() {
  if (process.env.VERCEL_TOKEN && process.env.VERCEL_TEAM_ID && process.env.VERCEL_PROJECT_ID) {
    return {
      token: process.env.VERCEL_TOKEN,
      teamId: process.env.VERCEL_TEAM_ID,
      projectId: process.env.VERCEL_PROJECT_ID,
    };
  }
  return {}; // falls back to automatic OIDC auth when actually running on Vercel
}

function collectRenderFiles(): { path: string; content: Buffer }[] {
  const files: { path: string; content: Buffer }[] = [];
  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      if (SKIP.has(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else {
        files.push({ path: relative(RENDER_DIR, full).split("\\").join("/"), content: readFileSync(full) });
      }
    }
  }
  walk(RENDER_DIR);
  return files;
}

export async function renderPriceClip(payload: RenderPayload): Promise<RenderResult> {
  const sandbox = await Sandbox.create({
    runtime: "python3.13",
    timeout: 10 * 60 * 1000,
    ...getSandboxCredentials(),
  });

  try {
    const install = await sandbox.runCommand("sh", [
      "-c",
      "sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg && pip install --quiet -r requirements.txt",
    ]);
    if (install.exitCode !== 0) {
      throw new Error(`sandbox setup failed (exit ${install.exitCode}): ${await install.stderr()}`);
    }

    await sandbox.writeFiles(collectRenderFiles());

    const outMp4 = "out.mp4";
    const outPng = "out_final.png";
    const cfg = { ...payload, out_mp4: outMp4, out_png: outPng };
    await sandbox.fs.writeFile("config.json", JSON.stringify(cfg));

    const run = await sandbox.runCommand("python3", ["clip.py", "config.json"], { timeoutMs: 8 * 60 * 1000 });
    if (run.exitCode !== 0) {
      throw new Error(`render failed (exit ${run.exitCode}): ${await run.stderr()}`);
    }
    const stdout = await run.stdout();
    const lastLine = stdout.trim().split("\n").pop();
    const meta = JSON.parse(lastLine || "{}");

    const [video, still] = await Promise.all([
      sandbox.readFileToBuffer({ path: outMp4 }),
      sandbox.readFileToBuffer({ path: outPng }),
    ]);
    if (!video || !still) throw new Error("render completed but did not produce an output file");

    return { video, still, meta };
  } finally {
    await sandbox.stop();
  }
}
