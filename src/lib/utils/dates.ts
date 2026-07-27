import type { GameWithTeams } from "@/types/domain";

export type ScheduleBucketKey = "today" | "tomorrow" | "thisWeekend" | "thisWeek" | "nextWeek" | "later";

export const BUCKET_LABELS: Record<ScheduleBucketKey, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  thisWeekend: "This Weekend",
  thisWeek: "This Week",
  nextWeek: "Next Week",
  later: "Further Out",
};

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function getBucketRanges(now: Date = new Date()) {
  const today0 = startOfDay(now);
  const tomorrow0 = addDays(today0, 1);
  const dayAfterTomorrow0 = addDays(today0, 2);

  const dayOfWeek = today0.getDay(); // 0 = Sun ... 6 = Sat
  const mondayOffset = (dayOfWeek + 6) % 7;
  const mondayThisWeek = addDays(today0, -mondayOffset);
  const satThisWeek = addDays(mondayThisWeek, 5);
  const sunThisWeek = addDays(mondayThisWeek, 6);
  const mondayNextWeek = addDays(mondayThisWeek, 7);
  const sunNextWeek = addDays(mondayThisWeek, 13);
  const mondayAfterNext = addDays(mondayThisWeek, 14);

  return {
    today: { start: today0, end: tomorrow0 },
    tomorrow: { start: tomorrow0, end: dayAfterTomorrow0 },
    thisWeekend: { start: satThisWeek, end: addDays(sunThisWeek, 1) },
    thisWeek: { start: dayAfterTomorrow0, end: satThisWeek },
    nextWeek: { start: mondayNextWeek, end: addDays(sunNextWeek, 1) },
    later: { start: mondayAfterNext, end: null as Date | null },
  };
}

/** Assigns each game to exactly one bucket, in priority order, so a game never appears twice. */
export function groupGamesByBucket(
  games: GameWithTeams[],
  now: Date = new Date()
): Record<ScheduleBucketKey, GameWithTeams[]> {
  const ranges = getBucketRanges(now);
  const order: ScheduleBucketKey[] = ["today", "tomorrow", "thisWeekend", "thisWeek", "nextWeek", "later"];

  const buckets: Record<ScheduleBucketKey, GameWithTeams[]> = {
    today: [],
    tomorrow: [],
    thisWeekend: [],
    thisWeek: [],
    nextWeek: [],
    later: [],
  };

  for (const game of games) {
    const start = new Date(game.start_time);
    for (const key of order) {
      const range = ranges[key];
      if (start >= range.start && (range.end === null || start < range.end)) {
        buckets[key].push(game);
        break;
      }
    }
  }

  return buckets;
}

export function formatGameDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatGameTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function isWithin24Hours(iso: string, now: Date = new Date()): boolean {
  const diff = new Date(iso).getTime() - now.getTime();
  return diff >= 0 && diff <= 24 * 60 * 60 * 1000;
}

export function isOverdue(dateIso: string | null, timeIso: string | null, now: Date = new Date()): boolean {
  if (!dateIso) return false;
  const dt = new Date(`${dateIso}T${timeIso ?? "23:59"}`);
  return dt.getTime() < now.getTime();
}

export function isDueToday(dateIso: string | null, now: Date = new Date()): boolean {
  if (!dateIso) return false;
  const d = new Date(dateIso);
  return startOfDay(d).getTime() === startOfDay(now).getTime();
}

export function formatMonthLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();
}

export function formatTimelineDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
}

export interface MonthGroup<T> {
  key: string;
  label: string;
  items: T[];
}

/** Groups already-chronologically-sorted items by calendar month, preserving order. */
export function groupByMonth<T>(items: T[], getDate: (item: T) => Date): MonthGroup<T>[] {
  const groups = new Map<string, MonthGroup<T>>();
  for (const item of items) {
    const d = getDate(item);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!groups.has(key)) groups.set(key, { key, label: formatMonthLabel(d), items: [] });
    groups.get(key)!.items.push(item);
  }
  return Array.from(groups.values());
}
