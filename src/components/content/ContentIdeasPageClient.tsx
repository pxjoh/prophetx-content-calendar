"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ImageIcon, Plus, Video } from "lucide-react";
import { ContentIdeaForm } from "./ContentIdeaForm";
import { Badge } from "@/components/ui/Badge";
import {
  CONTENT_TYPE_LABEL,
  PLATFORM_LABEL,
  PRIORITY_BADGE_CLASS,
  PRIORITY_LABEL,
  STATUS_BADGE_CLASS,
  STATUS_LABEL,
} from "@/lib/labels";
import { archiveContentIdeaAction, updateContentIdeaAction } from "@/lib/data/actions";
import type { ContentIdea, ContentStatus } from "@/types/domain";

const STATUS_OPTIONS: ContentStatus[] = ["idea", "in_progress", "ready", "scheduled", "posted", "archived"];

export function ContentIdeasPageClient({
  ideas,
  title,
  allowCreate = true,
  emptyMessage = "No content ideas yet.",
}: {
  ideas: ContentIdea[];
  title: string;
  allowCreate?: boolean;
  emptyMessage?: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">{title}</h1>
        {allowCreate && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-teal-500 px-3.5 py-2 text-xs font-semibold text-navy-950 hover:bg-teal-400"
          >
            <Plus className="h-3.5 w-3.5" /> Add Content Idea
          </button>
        )}
        {!allowCreate && (
          <Link href="/content-ideas" className="text-xs font-medium text-teal-400 hover:text-teal-300">
            Add a content idea →
          </Link>
        )}
      </div>

      {showForm && <ContentIdeaForm onDone={() => setShowForm(false)} onCancel={() => setShowForm(false)} />}

      <div className="space-y-3">
        {ideas.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-500">
            {emptyMessage}
          </div>
        )}
        {ideas.map((idea) => (
          <div key={idea.id} className="rounded-2xl border border-white/10 bg-navy-900 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <Badge className={PRIORITY_BADGE_CLASS[idea.priority]}>{PRIORITY_LABEL[idea.priority]}</Badge>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${STATUS_BADGE_CLASS[idea.status]}`}>
                    {STATUS_LABEL[idea.status]}
                  </span>
                  {idea.graphic_request && (
                    <span className="text-teal-400">
                      <ImageIcon className="h-3.5 w-3.5" />
                    </span>
                  )}
                  {idea.video_concept && (
                    <span className="text-teal-400">
                      <Video className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-white">{idea.title}</h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  {CONTENT_TYPE_LABEL[idea.content_type]} · {PLATFORM_LABEL[idea.platform]}
                  {idea.due_date && ` · Due ${idea.due_date}${idea.due_time ? ` ${idea.due_time}` : ""}`}
                </p>
                {idea.description && <p className="mt-1 text-xs text-slate-400">{idea.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Archive "${idea.title}"?`)) startTransition(() => void archiveContentIdeaAction(idea.id));
                }}
                className="shrink-0 rounded-lg px-2.5 py-1 text-xs text-slate-500 hover:text-red-300"
              >
                Archive
              </button>
            </div>
            <div className="mt-2">
              <select
                value={idea.status}
                onChange={(e) =>
                  startTransition(() => void updateContentIdeaAction(idea.id, { status: e.target.value as ContentStatus }))
                }
                className="rounded-lg border border-white/10 bg-navy-950 px-2 py-1 text-[11px] text-slate-300"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    Move to: {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
