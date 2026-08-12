"use client";

import { useTransition } from "react";
import { setLeagueActiveAction } from "@/lib/data/actions";
import type { League } from "@/types/domain";

export function LeagueToggleRow({ league }: { league: League }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-navy-900 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-white">{league.name}</p>
        <p className="text-xs text-slate-500">{league.sport}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={league.is_active}
        disabled={isPending}
        onClick={() => startTransition(() => void setLeagueActiveAction(league.id, !league.is_active))}
        className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${
          league.is_active ? "bg-teal-500" : "bg-navy-700"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            league.is_active ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
