-- Price Clips: render job history for the sports price-move animation
-- generator. Each row is one requested clip (a team matchup + market type),
-- tracking the Snowflake-resolved market identifiers and the render
-- pipeline's status/output. There is deliberately no separate price-history
-- table: unlike the election side of this app's lineage, Snowflake already
-- holds the full historical odds series for a sports game, so it's queried
-- fresh at render time instead of being accumulated locally.
create table price_clip_renders (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id) on delete cascade,
  home_team_id uuid not null references teams(id) on delete restrict,
  away_team_id uuid not null references teams(id) on delete restrict,

  market_type text not null check (market_type in ('moneyline', 'spread')),
  spread_line numeric,

  px_event_id text,
  px_market_id text,
  since timestamptz,
  until timestamptz,

  headline text,
  endline text,

  status text not null default 'pending'
    check (status in ('pending', 'rendering', 'done', 'error')),
  video_url text,
  still_url text,
  error text,

  requested_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index price_clip_renders_league_idx on price_clip_renders(league_id);
create index price_clip_renders_status_idx on price_clip_renders(status);
create index price_clip_renders_created_at_idx on price_clip_renders(created_at desc);
create trigger price_clip_renders_set_updated_at before update on price_clip_renders
  for each row execute function set_updated_at();

alter table price_clip_renders enable row level security;
