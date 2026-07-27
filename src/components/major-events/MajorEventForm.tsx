"use client";

import { useState, useTransition } from "react";
import { createMajorEventAction } from "@/lib/data/actions";
import { IMPORTANCE_LABEL } from "@/lib/labels";
import type { Importance, League, MajorEventType } from "@/types/domain";

const EVENT_TYPE_LABEL: Record<MajorEventType, string> = {
  nfl_draft: "NFL Draft",
  nba_draft: "NBA Draft",
  trade_deadline: "Trade Deadline",
  free_agency: "Free Agency Period",
  schedule_release: "Schedule Release",
  selection_sunday: "Selection Sunday",
  tournament: "Tournament",
  cfp_rankings: "CFP Rankings Reveal",
  award_announcement: "Award Announcement",
  hall_of_fame: "Hall of Fame Announcement",
  playoff_series: "Playoff Series",
  championship: "Championship Game",
  media_day: "Media Day",
  combine: "Combine",
  prophetx_campaign: "ProphetX Campaign",
  custom_deadline: "Custom Internal Deadline",
  other: "Other",
};
const EVENT_TYPES = Object.keys(EVENT_TYPE_LABEL) as MajorEventType[];
const IMPORTANCE_OPTIONS: Importance[] = ["standard", "notable", "major", "must_cover"];

const inputClass =
  "w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white placeholder:text-slate-500";

export function MajorEventForm({
  leagues,
  onDone,
  onCancel,
}: {
  leagues: League[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<MajorEventType>("custom_deadline");
  const [leagueId, setLeagueId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [description, setDescription] = useState("");
  const [importance, setImportance] = useState<Importance>("notable");
  const [marketUrl, setMarketUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      await createMajorEventAction({
        title: title.trim(),
        event_type: eventType,
        league_id: leagueId || null,
        start_time: startDate ? new Date(`${startDate}T${startTime || "09:00"}`).toISOString() : null,
        end_time: null,
        description: description.trim() || null,
        importance,
        importance_is_manual: true,
        prophetx_market_url: marketUrl.trim() || null,
        notes: notes.trim() || null,
      });
      onDone();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-navy-850 p-4">
      <h4 className="text-sm font-semibold text-white">New Major Event</h4>

      <div>
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Title *</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Q3 Content Calendar Lock" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Event Type</label>
          <select value={eventType} onChange={(e) => setEventType(e.target.value as MajorEventType)} className={inputClass}>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {EVENT_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">League</label>
          <select value={leagueId} onChange={(e) => setLeagueId(e.target.value)} className={inputClass}>
            <option value="">All / Cross-league</option>
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Time</label>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Importance</label>
          <select value={importance} onChange={(e) => setImportance(e.target.value as Importance)} className={inputClass}>
            {IMPORTANCE_OPTIONS.map((i) => (
              <option key={i} value={i}>
                {IMPORTANCE_LABEL[i]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} />
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">ProphetX Market URL</label>
        <input value={marketUrl} onChange={(e) => setMarketUrl(e.target.value)} placeholder="https://prophetx.co/..." className={inputClass} />
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} />
      </div>

      {error && <p className="text-xs text-red-300">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white">
          Cancel
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="rounded-lg bg-teal-500 px-3.5 py-1.5 text-xs font-semibold text-navy-950 hover:bg-teal-400 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Add Major Event"}
        </button>
      </div>
    </div>
  );
}
