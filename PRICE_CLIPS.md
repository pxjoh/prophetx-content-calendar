# Price Clips

Self-serve web version of the `prophetx_sports_toolkit` race animation: pick a league, two teams, and a market
(moneyline or spread), and render a branded price-move MP4 — no local Python, no manual Tensor queries, no hand-run
CLI scripts. Election features from the original toolkit were intentionally left out; this only covers sports.

## Setup (one-time, before this works end to end)

1. **Apply the migration**: `node scripts/run-sql.mjs supabase/migrations/20260730000000_add_price_clip_renders.sql`
2. **Seed NHL + MLB leagues/teams**: `npx tsx scripts/seed-nhl-mlb.ts` (NFL/NBA/CFB/CBB already existed)
3. **Create the storage bucket**: `npx tsx scripts/create-price-clips-bucket.ts`
4. **Snowflake service account**: get `SNOWFLAKE_ACCOUNT` / `SNOWFLAKE_USER` / `SNOWFLAKE_PRIVATE_KEY` /
   `SNOWFLAKE_WAREHOUSE` / `SNOWFLAKE_ROLE` from DevOps/Engineering — read-only, scoped to the OPENFLOW/PROPHET
   schemas. Add them to `.env.local` (see `.env.example`). This is a different thing from Tensor: Tensor only works
   inside a Claude/MCP session, not this deployed app's backend.
5. **Vercel Sandbox credentials** (local dev only — automatic via OIDC once deployed on Vercel): `VERCEL_TOKEN`,
   `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID`.

## How it works

- **Teams** (`/teams`): fully editable roster — name, abbreviation, color. No logos (not legally cleared); teams
  render as color tiles with the abbreviation, same as the original kit's sports mode.
- **Price Clips** (`/price-clips`): pick league + teams + market, then either:
  - **Outside feed** route — `OPENFLOW.REPORTING.BEST_ODDS_MINUTES`, needs event/market/outcome IDs + tipoff time.
  - **ProphetX book** route — `PROPHET.ORDERBOOK.SNAPSHOTS`, needs event/market IDs + a time window, and you confirm
    which side the stored contract belongs to (the data doesn't label it — check the final score, same as the
    original toolkit's documented process).
  - Finding those IDs today is still manual (see `src/lib/snowflake/queries.ts` header) — `resolveGameAuto()` is an
    unverified first attempt at automating it, and will need its table/column names corrected once
    Engineering/Analytics confirms the real schema.
- Rendering runs in an ephemeral **Vercel Sandbox** (`src/lib/render/sandbox.ts`), executing the trimmed renderer at
  `render/clip.py` — ffmpeg + Pillow + numpy only, no OpenCV/face-detection (sports teams don't use photos). The
  sandbox gets a plain JSON payload and the renderer script; it never sees Supabase or Snowflake credentials.
- Output MP4 + final-frame PNG are uploaded to the `price-clips` Supabase Storage bucket and linked from a
  `price_clip_renders` history row.
- Headline/endline text is checked against the same posting rules as the original toolkit (no bet/wager/odds/
  sportsbook/gamble/stake language, no em dashes) before a render is allowed to start.

## What's still manual / unverified

- **Auto game lookup** (`resolveGameAuto`): written against a guessed `SPORT_EVENT`-style table, not a confirmed
  one. Expect it to fail until Engineering/Analytics confirms the real schema — manual event/market ID entry in the
  UI always works in the meantime.
- **Render timing**: not yet measured end-to-end against real data. If a render consistently takes too long for one
  blocking HTTP request, switch the render API route to kick off the sandbox job and poll `price_clip_renders.status`
  instead of waiting inline.
