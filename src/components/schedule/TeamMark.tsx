import type { Team } from "@/types/domain";

/** Renders the team logo when available, otherwise a colored initials mark — the app should
 * never break or show a broken image icon just because live logo data isn't wired up yet.
 * Plain <img> on purpose: logos will come from arbitrary future provider domains that can't
 * be known ahead of time for next/image's remotePatterns allowlist. */
export function TeamMark({ team, size = 32 }: { team: Team; size?: number }) {
  if (team.logo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={team.logo_url}
        alt={`${team.name} logo`}
        width={size}
        height={size}
        className="shrink-0 rounded-full object-contain"
      />
    );
  }

  const initials = (team.abbreviation ?? team.short_name ?? team.name).slice(0, 3).toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ring-1 ring-white/10"
      style={{ width: size, height: size, backgroundColor: team.primary_color ?? "#182236" }}
    >
      {initials}
    </div>
  );
}
