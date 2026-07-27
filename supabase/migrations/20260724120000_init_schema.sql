-- ProphetX Content Command Center — initial schema
-- Soft-delete (archive) is modeled as a nullable `archived_at` timestamp on
-- every archivable entity rather than a separate "archived" table: it keeps
-- foreign keys intact, is trivially restorable/searchable, and needs no sync.
-- Every enumerated field (priority, status, importance, ...) is a plain text
-- column with a CHECK constraint rather than a Postgres ENUM type, so new
-- options can be added later with a simple constraint migration instead of
-- ALTER TYPE.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- leagues / conferences / teams
-- ---------------------------------------------------------------------------
create table leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sport text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table conferences (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id) on delete cascade,
  name text not null,
  short_name text,
  created_at timestamptz not null default now(),
  unique (league_id, name)
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id) on delete cascade,
  conference_id uuid references conferences(id) on delete set null,
  name text not null,
  short_name text,
  abbreviation text,
  logo_url text,
  primary_color text,
  record text,
  conference_record text,
  ranking int,
  ranking_source text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index teams_league_idx on teams(league_id);
create index teams_conference_idx on teams(conference_id);
create trigger teams_set_updated_at before update on teams
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- games
-- ---------------------------------------------------------------------------
create table games (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id) on delete cascade,
  season text,
  week text,
  home_team_id uuid not null references teams(id) on delete restrict,
  away_team_id uuid not null references teams(id) on delete restrict,
  start_time timestamptz not null,
  tv_network text,
  venue text,
  status text not null default 'scheduled'
    check (status in ('scheduled','in_progress','final','postponed','cancelled')),
  home_score int,
  away_score int,

  odds_spread text,
  odds_moneyline_home text,
  odds_moneyline_away text,
  odds_total text,
  odds_updated_at timestamptz,
  prophetx_market_url text,

  importance text not null default 'standard'
    check (importance in ('standard','notable','major','must_cover')),
  importance_is_manual boolean not null default false,

  is_rivalry boolean not null default false,
  rivalry_name text,
  playoff_implications text,
  tournament_implications text,
  conference_implications text,
  game_importance_notes text,

  notes text,
  is_sample boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index games_league_idx on games(league_id);
create index games_start_time_idx on games(start_time);
create index games_archived_idx on games(archived_at);
create index games_home_team_idx on games(home_team_id);
create index games_away_team_idx on games(away_team_id);
create trigger games_set_updated_at before update on games
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- major_events (draft, deadlines, championships, custom internal deadlines, ...)
-- ---------------------------------------------------------------------------
create table major_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type text not null default 'other'
    check (event_type in (
      'nfl_draft','nba_draft','trade_deadline','free_agency','schedule_release',
      'selection_sunday','tournament','cfp_rankings','award_announcement',
      'hall_of_fame','playoff_series','championship','media_day','combine',
      'prophetx_campaign','custom_deadline','other'
    )),
  league_id uuid references leagues(id) on delete set null,
  start_time timestamptz,
  end_time timestamptz,
  description text,

  importance text not null default 'standard'
    check (importance in ('standard','notable','major','must_cover')),
  importance_is_manual boolean not null default false,

  prophetx_market_url text,
  notes text,
  is_sample boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index major_events_league_idx on major_events(league_id);
create index major_events_start_time_idx on major_events(start_time);
create index major_events_archived_idx on major_events(archived_at);
create trigger major_events_set_updated_at before update on major_events
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- storylines (game-scoped, major-event-scoped, or league-wide)
-- ---------------------------------------------------------------------------
create table storylines (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  priority text not null default 'normal'
    check (priority in ('low','normal','high','breaking')),

  game_id uuid references games(id) on delete cascade,
  major_event_id uuid references major_events(id) on delete cascade,
  league_id uuid references leagues(id) on delete cascade,

  relevant_players text[] not null default '{}',
  notes text,
  is_sample boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint storylines_has_context check (
    game_id is not null or major_event_id is not null or league_id is not null
  )
);
create index storylines_game_idx on storylines(game_id);
create index storylines_major_event_idx on storylines(major_event_id);
create index storylines_league_idx on storylines(league_id);
create index storylines_priority_idx on storylines(priority);
create index storylines_archived_idx on storylines(archived_at);
create trigger storylines_set_updated_at before update on storylines
  for each row execute function set_updated_at();

create table storyline_teams (
  storyline_id uuid not null references storylines(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  primary key (storyline_id, team_id)
);
create index storyline_teams_team_idx on storyline_teams(team_id);

-- ---------------------------------------------------------------------------
-- content_ideas (attach to a game, major event, storyline, or stand alone)
-- ---------------------------------------------------------------------------
create table content_ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,

  content_type text not null
    check (content_type in (
      'general_social','graphic','video','short_form_video','long_form_video',
      'meme','poll','thread','article','live_content','promotional','other'
    )),
  platform text not null default 'other'
    check (platform in (
      'x','instagram','instagram_story','tiktok','youtube','youtube_shorts',
      'discord','linkedin','multiple','other'
    )),
  priority text not null default 'normal'
    check (priority in ('low','normal','high','breaking')),
  status text not null default 'idea'
    check (status in ('idea','in_progress','ready','scheduled','posted','archived')),

  due_date date,
  due_time time,

  game_id uuid references games(id) on delete cascade,
  major_event_id uuid references major_events(id) on delete cascade,
  storyline_id uuid references storylines(id) on delete cascade,

  graphic_instructions text,
  video_instructions text,
  internal_notes text,

  is_sample boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index content_ideas_game_idx on content_ideas(game_id);
create index content_ideas_major_event_idx on content_ideas(major_event_id);
create index content_ideas_storyline_idx on content_ideas(storyline_id);
create index content_ideas_status_idx on content_ideas(status);
create index content_ideas_due_date_idx on content_ideas(due_date);
create index content_ideas_content_type_idx on content_ideas(content_type);
create index content_ideas_archived_idx on content_ideas(archived_at);
create trigger content_ideas_set_updated_at before update on content_ideas
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- graphic_requests / video_concepts — 1:1 detail tables for content_ideas
-- ---------------------------------------------------------------------------
create table graphic_requests (
  id uuid primary key default gen_random_uuid(),
  content_idea_id uuid not null unique references content_ideas(id) on delete cascade,
  headline text,
  supporting_copy text,
  required_statistics text,
  required_images text,
  design_instructions text,
  dimensions text,
  platform_destination text,
  due_date date,
  priority text not null default 'normal'
    check (priority in ('low','normal','high','breaking')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger graphic_requests_set_updated_at before update on graphic_requests
  for each row execute function set_updated_at();

create table video_concepts (
  id uuid primary key default gen_random_uuid(),
  content_idea_id uuid not null unique references content_ideas(id) on delete cascade,
  concept text,
  hook text,
  talking_points text,
  required_footage text,
  on_camera_requirements text,
  editing_instructions text,
  desired_length text,
  platform_destination text,
  due_date date,
  priority text not null default 'normal'
    check (priority in ('low','normal','high','breaking')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger video_concepts_set_updated_at before update on video_concepts
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- reference_links — polymorphic, reused by games/events/storylines/ideas
-- ---------------------------------------------------------------------------
create table reference_links (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  label text,
  related_table text not null
    check (related_table in (
      'games','major_events','storylines','content_ideas',
      'graphic_requests','video_concepts'
    )),
  related_id uuid not null,
  created_at timestamptz not null default now()
);
create index reference_links_related_idx on reference_links(related_table, related_id);

-- ---------------------------------------------------------------------------
-- notifications — shared, team-wide (no per-user identity)
-- ---------------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null
    check (type in (
      'content_idea_added','storyline_added','game_approaching',
      'major_event_approaching','content_due_soon','content_overdue',
      'graphic_due_soon','video_due_soon','storyline_breaking','status_changed'
    )),
  title text not null,
  body text,
  related_table text
    check (related_table is null or related_table in (
      'games','major_events','storylines','content_ideas',
      'graphic_requests','video_concepts'
    )),
  related_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_is_read_idx on notifications(is_read);
create index notifications_created_at_idx on notifications(created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- All application access runs server-side with the Supabase service role key
-- (which bypasses RLS), because access control for this internal tool is
-- handled entirely by the shared-password gate in front of the Next.js app,
-- not by Supabase Auth. RLS is enabled with no policies so the anon/
-- authenticated roles have zero access if a client-side key were ever used.
-- ---------------------------------------------------------------------------
alter table leagues enable row level security;
alter table conferences enable row level security;
alter table teams enable row level security;
alter table games enable row level security;
alter table major_events enable row level security;
alter table storylines enable row level security;
alter table storyline_teams enable row level security;
alter table content_ideas enable row level security;
alter table graphic_requests enable row level security;
alter table video_concepts enable row level security;
alter table reference_links enable row level security;
alter table notifications enable row level security;
