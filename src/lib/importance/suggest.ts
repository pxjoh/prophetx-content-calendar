import type { Importance } from "@/types/domain";

export interface ImportanceSignals {
  hasRankedTeam: boolean;
  isRivalry: boolean;
  isNationalTv: boolean;
  hasPlayoffImplications: boolean;
  hasTournamentImplications: boolean;
  isChampionship: boolean;
}

const NATIONAL_NETWORKS = new Set(["NBC", "CBS", "FOX", "ABC", "ESPN", "TNT", "Prime Video", "Peacock"]);

export function isNationalNetwork(network: string | null | undefined): boolean {
  return !!network && NATIONAL_NETWORKS.has(network);
}

/**
 * Suggests an importance tier from objective signals. This is only ever a
 * suggestion — `importance_is_manual` on the record tracks whether a person
 * has since overridden it, and the suggestion never silently overwrites a
 * manual choice.
 */
export function suggestImportance(signals: ImportanceSignals): Importance {
  if (signals.isChampionship) return "must_cover";

  const score =
    (signals.hasRankedTeam ? 1 : 0) +
    (signals.isRivalry ? 1 : 0) +
    (signals.isNationalTv ? 1 : 0) +
    (signals.hasPlayoffImplications ? 1 : 0) +
    (signals.hasTournamentImplications ? 1 : 0);

  if (score >= 3) return "must_cover";
  if (score === 2) return "major";
  if (score === 1) return "notable";
  return "standard";
}
