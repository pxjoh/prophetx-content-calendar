// Adapter interface for pulling schedule data (games, teams, rankings, odds)
// from an external sports-data provider. No provider is wired up in v1 — the
// app runs on manual entry and sample data instead — but every provider that
// gets added later (an ESPN-style API, a stats vendor, ProphetX's own feed)
// implements this same shape, so the rest of the app never needs to change.
import type { Game, Team } from "@/types/domain";

export interface RawScheduleGame {
  externalId: string;
  leagueSlug: string;
  homeTeamExternalId: string;
  awayTeamExternalId: string;
  startTime: string;
  tvNetwork?: string | null;
  venue?: string | null;
  status?: Game["status"];
  homeScore?: number | null;
  awayScore?: number | null;
  oddsSpread?: string | null;
  oddsMoneylineHome?: string | null;
  oddsMoneylineAway?: string | null;
  oddsTotal?: string | null;
}

export interface RawTeam {
  externalId: string;
  leagueSlug: string;
  name: string;
  shortName?: string | null;
  abbreviation?: string | null;
  logoUrl?: string | null;
  record?: string | null;
  ranking?: number | null;
}

export interface SportsDataProvider {
  /** Stable identifier for this provider, e.g. "manual", "espn", "prophetx". */
  readonly id: string;
  fetchTeams(leagueSlug: string): Promise<RawTeam[]>;
  fetchSchedule(leagueSlug: string, from: Date, to: Date): Promise<RawScheduleGame[]>;
}

/**
 * The only provider wired up in v1. It intentionally returns nothing —
 * schedule data comes from manual entry / sample data instead — so the rest
 * of the app can depend on `SportsDataProvider` without caring whether a real
 * feed is connected yet.
 */
export const manualProvider: SportsDataProvider = {
  id: "manual",
  async fetchTeams() {
    return [];
  },
  async fetchSchedule() {
    return [];
  },
};

export function getActiveProvider(): SportsDataProvider {
  return manualProvider;
}

export type { Team };
