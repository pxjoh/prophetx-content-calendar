"use client";

import { useCallback, useEffect, useState } from "react";
import { GameDetailContent } from "./GameDetailContent";
import type { GameDetail } from "@/types/domain";

export function GameDetailModal({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<GameDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${gameId}`);
      if (!res.ok) throw new Error("Failed to load game");
      setDetail(await res.json());
    } catch {
      setError("Couldn't load this game's details. Try again.");
    }
  }, [gameId]);

  useEffect(() => {
    // Fetching on mount and setting state from the response is the standard
    // pattern for a client-fetched modal; it's a single one-shot load, not a
    // cascading-render loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 py-10 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-navy-900 shadow-2xl shadow-black/60" onClick={(e) => e.stopPropagation()}>
        {error && <p className="p-6 text-sm text-red-300">{error}</p>}
        {!error && !detail && (
          <div className="space-y-4 p-6">
            <div className="h-6 w-1/3 animate-pulse rounded bg-navy-800" />
            <div className="h-24 animate-pulse rounded-xl bg-navy-800" />
            <div className="h-24 animate-pulse rounded-xl bg-navy-800" />
          </div>
        )}
        {detail && <GameDetailContent detail={detail} onClose={onClose} onChanged={load} />}
      </div>
    </div>
  );
}
