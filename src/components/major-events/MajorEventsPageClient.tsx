"use client";

import { useState, useTransition } from "react";
import { CalendarPlus, ExternalLink, Plus } from "lucide-react";
import { MajorEventForm } from "./MajorEventForm";
import { Badge } from "@/components/ui/Badge";
import { IMPORTANCE_BADGE_CLASS, IMPORTANCE_LABEL } from "@/lib/labels";
import { archiveMajorEventAction } from "@/lib/data/actions";
import type { League, MajorEvent } from "@/types/domain";

export function MajorEventsPageClient({ events, leagues }: { events: MajorEvent[]; leagues: League[] }) {
  const [showForm, setShowForm] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">Major Events</h1>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-teal-500 px-3.5 py-2 text-xs font-semibold text-navy-950 hover:bg-teal-400"
          >
            <Plus className="h-3.5 w-3.5" /> Add Major Event
          </button>
        )}
      </div>

      {showForm && <MajorEventForm leagues={leagues} onDone={() => setShowForm(false)} onCancel={() => setShowForm(false)} />}

      <div className="space-y-3">
        {events.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-500">
            No major events yet.
          </div>
        )}
        {events.map((event) => (
          <div key={event.id} className="rounded-2xl border border-white/10 bg-navy-900 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <Badge className={IMPORTANCE_BADGE_CLASS[event.importance]}>{IMPORTANCE_LABEL[event.importance]}</Badge>
                  {event.is_sample && <Badge className="bg-navy-800 text-slate-500 ring-1 ring-white/10">Sample</Badge>}
                </div>
                <h3 className="text-sm font-semibold text-white">{event.title}</h3>
                {event.description && <p className="mt-1 text-xs text-slate-400">{event.description}</p>}
              </div>
              <div className="text-right text-xs text-slate-400">
                {event.start_time
                  ? new Date(event.start_time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "No date set"}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {event.prophetx_market_url && (
                <a
                  href={event.prophetx_market_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-teal-300 hover:border-teal-500/30"
                >
                  ProphetX <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {event.start_time && (
                <a
                  href={`/api/ics/major-events/${event.id}`}
                  className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-300 hover:border-teal-500/30 hover:text-teal-300"
                >
                  <CalendarPlus className="h-3 w-3" /> Add to Calendar
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Archive "${event.title}"? You can restore it later from Archived.`)) {
                    startTransition(() => void archiveMajorEventAction(event.id));
                  }
                }}
                className="ml-auto rounded-lg px-2.5 py-1 text-xs text-slate-500 hover:text-red-300"
              >
                Archive
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
