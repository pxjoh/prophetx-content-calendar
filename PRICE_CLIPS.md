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
- **Price Clips** (`/price-clips`): pick league + teams + date + market, hit **Find Game**, and it auto-resolves the
  Snowflake event/market/outcome IDs — verified live against the real schema on 2026-11-06 (via Tensor), not a
  guess. See `src/lib/snowflake/queries.ts` for the full join chain and how team↔outcome mapping works *without*
  checking the final score (the original toolkit's manual workaround): `SPORT_EVENT_COMPETITORS.SEQ` (0=home,
  1=away) lines up directly with the `{$competitor1}` / `{$competitor2}` outcome-template slots in
  `OUTCOME_DESCRIPTIONS`, confirmed across multiple real settled games. Spread markets additionally use
  `PROPHET.ANALYTICS.MARKET_LINE_MOVEMENTS` to list every historical line interval (the traded contract's outcome
  ids change whenever the main line moves), and the UI lets you pick which interval to chart.
  If auto-lookup doesn't find a match (new league, data gap, etc.), manual event/market/outcome ID entry is still
  available as a fallback in the UI.
  Uses `OPENFLOW.REPORTING.BEST_ODDS_MINUTES` (the outside feed) for the actual price history in both cases.
  `PROPHET.ORDERBOOK.SNAPSHOTS` (ProphetX's own book) is wired in `src/lib/snowflake/queries.ts` /
  `src/lib/price-clips/normalize.ts` but not surfaced in the UI yet — it stores one contract per market with no
  outcome label, so picking the right side still needs the final-score check; worth revisiting once there's time to
  find whatever maps `INSTRUMENT_ID` to an outcome.
- Rendering runs in an ephemeral **Vercel Sandbox** (`src/lib/render/sandbox.ts`), executing the trimmed renderer at
  `render/clip.py` — ffmpeg + Pillow + numpy only, no OpenCV/face-detection (sports teams don't use photos). The
  sandbox gets a plain JSON payload and the renderer script; it never sees Supabase or Snowflake credentials.
- Output MP4 + final-frame PNG are uploaded to the `price-clips` Supabase Storage bucket and linked from a
  `price_clip_renders` history row.
- Headline/endline text is checked against the same posting rules as the original toolkit (no bet/wager/odds/
  sportsbook/gamble/stake language, no em dashes) before a render is allowed to start.

## What's still open

- **Snowflake service account**: the auto-lookup queries are verified (via Tensor, inside a Claude session) but the
  deployed app still needs its own standing credentials (`SNOWFLAKE_ACCOUNT` etc.) to run them itself — Tensor only
  works inside a chat.
- **ProphetX-book route** (`PROPHET.ORDERBOOK.SNAPSHOTS`): not wired into the UI — see above.
- **Render timing**: not yet measured end-to-end against real data. If a render consistently takes too long for one
  blocking HTTP request, switch the render API route to kick off the sandbox job and poll `price_clip_renders.status`
  instead of waiting inline.
