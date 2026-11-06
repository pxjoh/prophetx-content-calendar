# Price Clips

Web version of the `prophetx_sports_toolkit` race animation: pick a league, two teams, and a market (moneyline or
spread), and render a branded price-move MP4. Election features from the original toolkit were intentionally left
out; this only covers sports.

**Decision (2026-11-06): no Snowflake service account for this app.** The data-pull step stays human-in-the-loop —
ask Claude (with Tensor connected) for the price history, upload the JSON it gives back. This isn't a workaround
for a missing credential; it's the intended design going forward. The code for the app to query Snowflake itself
(`src/lib/snowflake/queries.ts`, the **Find Game** button) is still there and verified correct, in case that
changes someday, but it's not the supported path.

## Setup (one-time, before this works end to end)

1. **Apply the migration**: `node scripts/run-sql.mjs supabase/migrations/20260730000000_add_price_clip_renders.sql`
2. **Seed NHL + MLB leagues/teams**: `npx tsx scripts/seed-nhl-mlb.ts` (NFL/NBA/CFB/CBB already existed)
3. **Create the storage bucket**: `npx tsx scripts/create-price-clips-bucket.ts`
4. **Vercel Sandbox credentials** (local dev only — automatic via OIDC once deployed on Vercel): `VERCEL_TOKEN`,
   `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID`.

## The supported workflow

1. On `/price-clips`, pick league, teams, date, and market, then click **Copy Prompt for Claude** — it builds a
   ready-to-paste request (the exact join chain, market resolution, and output format) from whatever you've already
   selected. No need to know any Snowflake schema.
2. Paste that prompt into a Claude chat with Tensor connected. It comes back with the event/market/outcome IDs and
   a downloadable JSON file of price rows.
3. Fill in the IDs (the "Enter event/market IDs manually instead" fields, shown by default) and either **Upload
   JSON file** or paste the rows into the **Price data** box.
4. Hit **Generate Clip**. The render route uses the uploaded/pasted rows directly — it never touches Snowflake.

Verified for real on 2026-11-06 against two games: Atlanta Hawks @ Washington Wizards (event 1704707869, 3,450 real
rows) and Jacksonville Jaguars @ Baltimore Ravens (event 1700008919). Both produced correct clips matching the real
final scores, with zero Snowflake credentials anywhere in the deployed app.

## How it works

- **Teams** (`/teams`): fully editable roster — name, abbreviation, color. No logos (not legally cleared); teams
  render as color tiles with the abbreviation, same as the original kit's sports mode.
- **Price Clips** (`/price-clips`): pick league + teams + date + market, click **Copy Prompt for Claude**, run that
  in a Claude+Tensor chat, then fill in the IDs it returns and upload/paste the price rows. The join chain the
  prompt tells Claude to use (and how team↔outcome mapping works *without* checking the final score, the original
  toolkit's manual workaround) is in `src/lib/snowflake/queries.ts`: `SPORT_EVENT_COMPETITORS.SEQ` (0=home, 1=away)
  lines up directly with the `{$competitor1}` / `{$competitor2}` outcome-template slots in `OUTCOME_DESCRIPTIONS`,
  confirmed across multiple real settled games. Spread markets additionally use
  `PROPHET.ANALYTICS.MARKET_LINE_MOVEMENTS` to list every historical line interval (the traded contract's outcome
  ids change whenever the main line moves) — ask Claude for a specific interval if you need one.
  There's also a **Find Game (needs Snowflake)** button that calls this same logic from the app's own backend —
  verified correct, but not the supported path (see the decision note above).
  `PROPHET.ORDERBOOK.SNAPSHOTS` (ProphetX's own book) is wired in `src/lib/snowflake/queries.ts` /
  `src/lib/price-clips/normalize.ts` but not surfaced anywhere — it stores one contract per market with no outcome
  label, so picking the right side still needs the final-score check.
- Rendering runs in an ephemeral **Vercel Sandbox** (`src/lib/render/sandbox.ts`), executing the trimmed renderer at
  `render/clip.py` — ffmpeg + Pillow + numpy only, no OpenCV/face-detection (sports teams don't use photos). The
  sandbox gets a plain JSON payload and the renderer script; it never sees Supabase or Snowflake credentials.
- Output MP4 + final-frame PNG are uploaded to the `price-clips` Supabase Storage bucket and linked from a
  `price_clip_renders` history row.
- Headline/endline text is checked against the same posting rules as the original toolkit (no bet/wager/odds/
  sportsbook/gamble/stake language, no em dashes) before a render is allowed to start.

## What's still open

- **ProphetX-book route** (`PROPHET.ORDERBOOK.SNAPSHOTS`): not wired into the UI, and not needed for the supported
  Claude+Tensor workflow above (it uses the outside feed, `BEST_ODDS_MINUTES`, exclusively).
- **Render timing**: not yet measured end-to-end through the actual deployed Vercel Sandbox with real pasted data
  (only validated locally with ffmpeg faked out). If a render consistently takes too long for one blocking HTTP
  request, switch the render API route to kick off the sandbox job and poll `price_clip_renders.status` instead of
  waiting inline.
