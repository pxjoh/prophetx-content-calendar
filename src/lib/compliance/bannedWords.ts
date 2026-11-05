// Posting-rules check for user-entered headline/endline text, ported from
// the sports toolkit's README ("No betting words... Use trade, position,
// contract." / "No em dashes."). Runs both client-side (for instant
// feedback) and server-side (so the rule can't be bypassed by calling the
// API directly).
const BANNED_WORDS = ["bet", "bets", "betting", "wager", "wagers", "odds", "sportsbook", "gamble", "gambling", "stake", "stakes"];

export interface ComplianceIssue {
  text: string;
  term: string;
}

export function checkPostingCopy(text: string | null | undefined): ComplianceIssue[] {
  if (!text) return [];
  const issues: ComplianceIssue[] = [];
  for (const word of BANNED_WORDS) {
    if (new RegExp(`\\b${word}\\b`, "i").test(text)) {
      issues.push({ text, term: word });
    }
  }
  if (text.includes("—")) {
    issues.push({ text, term: "em dash (—)" });
  }
  return issues;
}

export function checkAllPostingCopy(...texts: (string | null | undefined)[]): ComplianceIssue[] {
  return texts.flatMap(checkPostingCopy);
}
