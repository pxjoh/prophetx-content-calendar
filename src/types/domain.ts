// Shared domain types for the whole app. These mirror the Supabase schema in
// supabase/migrations/20260724120000_init_schema.sql — keep them in sync.

export type Importance = "standard" | "notable" | "major" | "must_cover";
export type Priority = "low" | "normal" | "high" | "breaking";
export type GameStatus = "scheduled" | "in_progress" | "final" | "postponed" | "cancelled";

export type ContentType =
  | "general_social"
  | "graphic"
  | "video"
  | "short_form_video"
  | "long_form_video"
  | "meme"
  | "poll"
  | "thread"
  | "article"
  | "live_content"
  | "promotional"
  | "other";

export type Platform =
  | "x"
  | "instagram"
  | "instagram_story"
  | "tiktok"
  | "youtube"
  | "youtube_shorts"
  | "discord"
  | "linkedin"
  | "multiple"
  | "other";

export type ContentStatus = "idea" | "in_progress" | "ready" | "scheduled" | "posted" | "archived";

export type MajorEventType =
  | "nfl_draft"
  | "nba_draft"
  | "trade_deadline"
  | "free_agency"
  | "schedule_release"
  | "selection_sunday"
  | "tournament"
  | "cfp_rankings"
  | "award_announcement"
  | "hall_of_fame"
  | "playoff_series"
  | "championship"
  | "media_day"
  | "combine"
  | "prophetx_campaign"
  | "custom_deadline"
  | "other";

export type NotificationType =
  | "content_idea_added"
  | "storyline_added"
  | "game_approaching"
  | "major_event_approaching"
  | "content_due_soon"
  | "content_overdue"
  | "graphic_due_soon"
  | "video_due_soon"
  | "storyline_breaking"
  | "status_changed"
  | "crm_submission_added";

export type RelatedTable =
  | "games"
  | "major_events"
  | "storylines"
  | "content_ideas"
  | "graphic_requests"
  | "video_concepts"
  | "crm_submissions";

export type CrmPlatform = "push_notification" | "email";

export type MarketType = "moneyline" | "spread";
export type RenderStatus = "pending" | "rendering" | "done" | "error";

export interface League {
  id: string;
  name: string;
  slug: string;
  sport: string;
  is_active: boolean;
  sort_order: number;
}

export interface Conference {
  id: string;
  league_id: string;
  name: string;
  short_name: string | null;
}

export interface Team {
  id: string;
  league_id: string;
  conference_id: string | null;
  name: string;
  short_name: string | null;
  abbreviation: string | null;
  logo_url: string | null;
  primary_color: string | null;
  record: string | null;
  conference_record: string | null;
  ranking: number | null;
  ranking_source: string | null;
  is_sample: boolean;
}

export interface ReferenceLink {
  id: string;
  url: string;
  label: string | null;
  related_table: RelatedTable;
  related_id: string;
}

export interface Game {
  id: string;
  league_id: string;
  season: string | null;
  week: string | null;
  home_team_id: string;
  away_team_id: string;
  start_time: string; // ISO — real date always; time-of-day is a placeholder when start_time_tbd is true
  start_time_tbd: boolean;
  tv_network: string | null;
  venue: string | null;
  status: GameStatus;
  home_score: number | null;
  away_score: number | null;

  odds_spread: string | null;
  odds_moneyline_home: string | null;
  odds_moneyline_away: string | null;
  odds_total: string | null;
  odds_updated_at: string | null;
  prophetx_market_url: string | null;

  importance: Importance;
  importance_is_manual: boolean;

  is_rivalry: boolean;
  rivalry_name: string | null;
  playoff_implications: string | null;
  tournament_implications: string | null;
  conference_implications: string | null;
  game_importance_notes: string | null;

  notes: string | null;
  is_sample: boolean;
  archived_at: string | null;
}

export interface MajorEvent {
  id: string;
  title: string;
  event_type: MajorEventType;
  league_id: string | null;
  start_time: string | null;
  end_time: string | null;
  description: string | null;
  importance: Importance;
  importance_is_manual: boolean;
  prophetx_market_url: string | null;
  notes: string | null;
  is_sample: boolean;
  archived_at: string | null;
}

export interface Storyline {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  game_id: string | null;
  major_event_id: string | null;
  league_id: string | null;
  relevant_players: string[];
  relevant_team_ids: string[];
  notes: string | null;
  is_sample: boolean;
  archived_at: string | null;
  created_at: string;
}

export interface GraphicRequest {
  id: string;
  content_idea_id: string;
  headline: string | null;
  supporting_copy: string | null;
  required_statistics: string | null;
  required_images: string | null;
  design_instructions: string | null;
  dimensions: string | null;
  platform_destination: string | null;
  due_date: string | null;
  priority: Priority;
}

export interface VideoConcept {
  id: string;
  content_idea_id: string;
  concept: string | null;
  hook: string | null;
  talking_points: string | null;
  required_footage: string | null;
  on_camera_requirements: string | null;
  editing_instructions: string | null;
  desired_length: string | null;
  platform_destination: string | null;
  due_date: string | null;
  priority: Priority;
}

export interface ContentIdea {
  id: string;
  title: string;
  description: string | null;
  content_type: ContentType;
  platform: Platform;
  priority: Priority;
  status: ContentStatus;
  due_date: string | null;
  due_time: string | null;
  game_id: string | null;
  major_event_id: string | null;
  storyline_id: string | null;
  graphic_instructions: string | null;
  video_instructions: string | null;
  internal_notes: string | null;
  is_sample: boolean;
  archived_at: string | null;
  created_at: string;
  graphic_request: GraphicRequest | null;
  video_concept: VideoConcept | null;
}

export interface CrmSubmission {
  id: string;
  email_subject: string;
  content: string | null;
  platform: CrmPlatform;
  priority: Priority;
  status: ContentStatus;
  due_date: string | null;
  due_time: string | null;
  internal_notes: string | null;
  is_sample: boolean;
  archived_at: string | null;
  created_at: string;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  related_table: RelatedTable | null;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

// Enriched shapes returned by the data layer for UI consumption -------------

export interface GameWithTeams extends Game {
  home_team: Team;
  away_team: Team;
  league: League;
  storyline_count: number;
  content_idea_count: number;
  has_graphic_request: boolean;
  has_video_request: boolean;
  reference_links: ReferenceLink[];
}

export interface GameDetail extends GameWithTeams {
  storylines: Storyline[];
  content_ideas: ContentIdea[];
}

export interface PriceClipRender {
  id: string;
  league_id: string;
  home_team_id: string;
  away_team_id: string;
  market_type: MarketType;
  spread_line: number | null;
  px_event_id: string | null;
  px_market_id: string | null;
  since: string | null;
  until: string | null;
  headline: string | null;
  endline: string | null;
  status: RenderStatus;
  video_url: string | null;
  still_url: string | null;
  error: string | null;
  requested_by: string | null;
  created_at: string;
}

export interface PriceClipRenderWithTeams extends PriceClipRender {
  league: League;
  home_team: Team;
  away_team: Team;
}
