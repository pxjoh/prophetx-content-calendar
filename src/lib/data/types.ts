import type {
  ContentIdea,
  ContentStatus,
  ContentType,
  Game,
  GameDetail,
  GameWithTeams,
  Importance,
  League,
  MajorEvent,
  MajorEventType,
  Platform,
  Priority,
  ReferenceLink,
  RelatedTable,
  AppNotification,
  Storyline,
  Team,
} from "@/types/domain";

export interface GameFilterParams {
  from?: Date;
  to?: Date;
  leagueSlugs?: string[];
  teamId?: string;
  conferenceId?: string;
  rankedOnly?: boolean;
  rivalryOnly?: boolean;
  hasPlayoffImplications?: boolean;
  hasTournamentImplications?: boolean;
  importance?: Importance[];
  tvNetwork?: string;
  hasContentIdeas?: boolean; // true = only games w/ ideas, false = only games w/o
  hasGraphicRequest?: boolean;
  hasVideoRequest?: boolean;
  search?: string;
  includeArchived?: boolean;
}

export interface StorylineFilterParams {
  gameId?: string;
  majorEventId?: string;
  leagueId?: string;
  leagueWideOnly?: boolean;
  includeArchived?: boolean;
}

export interface ContentIdeaFilterParams {
  gameId?: string;
  majorEventId?: string;
  storylineId?: string;
  status?: ContentStatus[];
  contentType?: ContentType[];
  platform?: Platform[];
  priority?: Priority[];
  onlyGraphicRequests?: boolean;
  onlyVideoRequests?: boolean;
  dueOnOrBefore?: Date;
  includeArchived?: boolean;
  search?: string;
}

export interface MajorEventFilterParams {
  from?: Date;
  to?: Date;
  leagueId?: string;
  includeArchived?: boolean;
}

export type StorylineInput = {
  title: string;
  description?: string | null;
  priority: Priority;
  game_id?: string | null;
  major_event_id?: string | null;
  league_id?: string | null;
  relevant_players?: string[];
  relevant_team_ids?: string[];
  notes?: string | null;
};

export type ContentIdeaInput = {
  title: string;
  description?: string | null;
  content_type: ContentType;
  platform: Platform;
  priority: Priority;
  status: ContentStatus;
  due_date?: string | null;
  due_time?: string | null;
  game_id?: string | null;
  major_event_id?: string | null;
  storyline_id?: string | null;
  graphic_instructions?: string | null;
  video_instructions?: string | null;
  internal_notes?: string | null;
  graphic_request?: {
    headline?: string | null;
    supporting_copy?: string | null;
    required_statistics?: string | null;
    required_images?: string | null;
    design_instructions?: string | null;
    dimensions?: string | null;
    platform_destination?: string | null;
    due_date?: string | null;
    priority?: Priority;
  } | null;
  video_concept?: {
    concept?: string | null;
    hook?: string | null;
    talking_points?: string | null;
    required_footage?: string | null;
    on_camera_requirements?: string | null;
    editing_instructions?: string | null;
    desired_length?: string | null;
    platform_destination?: string | null;
    due_date?: string | null;
    priority?: Priority;
  } | null;
};

export type MajorEventInput = {
  title: string;
  event_type: MajorEventType;
  league_id?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  description?: string | null;
  importance: Importance;
  importance_is_manual: boolean;
  prophetx_market_url?: string | null;
  notes?: string | null;
};

export interface DataStore {
  listLeagues(): Promise<League[]>;
  listTeams(leagueId?: string): Promise<Team[]>;

  listGames(params: GameFilterParams): Promise<GameWithTeams[]>;
  getGameDetail(id: string): Promise<GameDetail | null>;
  setGameImportance(id: string, importance: Importance, manual: boolean): Promise<void>;
  archiveGame(id: string): Promise<void>;
  restoreGame(id: string): Promise<void>;

  listMajorEvents(params: MajorEventFilterParams): Promise<MajorEvent[]>;
  createMajorEvent(input: MajorEventInput): Promise<MajorEvent>;
  updateMajorEvent(id: string, input: Partial<MajorEventInput>): Promise<MajorEvent>;
  archiveMajorEvent(id: string): Promise<void>;
  restoreMajorEvent(id: string): Promise<void>;

  listStorylines(params: StorylineFilterParams): Promise<Storyline[]>;
  createStoryline(input: StorylineInput): Promise<Storyline>;
  updateStoryline(id: string, input: Partial<StorylineInput>): Promise<Storyline>;
  archiveStoryline(id: string): Promise<void>;
  restoreStoryline(id: string): Promise<void>;

  listContentIdeas(params: ContentIdeaFilterParams): Promise<ContentIdea[]>;
  createContentIdea(input: ContentIdeaInput): Promise<ContentIdea>;
  updateContentIdea(id: string, input: Partial<ContentIdeaInput>): Promise<ContentIdea>;
  archiveContentIdea(id: string): Promise<void>;
  restoreContentIdea(id: string): Promise<void>;

  listReferenceLinks(table: RelatedTable, id: string): Promise<ReferenceLink[]>;
  addReferenceLink(table: RelatedTable, id: string, url: string, label?: string | null): Promise<ReferenceLink>;
  removeReferenceLink(id: string): Promise<void>;

  listNotifications(): Promise<AppNotification[]>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;
}

export type { Game };
