"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { CrmSubmissionForm } from "./CrmSubmissionForm";
import { Badge } from "@/components/ui/Badge";
import {
  CRM_PLATFORM_LABEL,
  PRIORITY_BADGE_CLASS,
  PRIORITY_LABEL,
  STATUS_BADGE_CLASS,
  STATUS_LABEL,
} from "@/lib/labels";
import { archiveCrmSubmissionAction, updateCrmSubmissionAction } from "@/lib/data/actions";
import type { ContentStatus, CrmSubmission } from "@/types/domain";

const STATUS_OPTIONS: ContentStatus[] = ["idea", "in_progress", "ready", "scheduled", "posted", "archived"];

export function CrmPageClient({ submissions }: { submissions: CrmSubmission[] }) {
  const [showForm, setShowForm] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">CRM Submissions</h1>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-teal-500 px-3.5 py-2 text-xs font-semibold text-navy-950 hover:bg-teal-400"
          >
            <Plus className="h-3.5 w-3.5" /> Add CRM Submission
          </button>
        )}
      </div>

      {showForm && <CrmSubmissionForm onDone={() => setShowForm(false)} onCancel={() => setShowForm(false)} />}

      <div className="space-y-3">
        {submissions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-500">
            No CRM submissions yet.
          </div>
        )}
        {submissions.map((submission) => (
          <div key={submission.id} className="rounded-2xl border border-white/10 bg-navy-900 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <Badge className={PRIORITY_BADGE_CLASS[submission.priority]}>{PRIORITY_LABEL[submission.priority]}</Badge>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${STATUS_BADGE_CLASS[submission.status]}`}
                  >
                    {STATUS_LABEL[submission.status]}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white">{submission.email_subject}</h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  {CRM_PLATFORM_LABEL[submission.platform]}
                  {submission.due_date && ` · Due ${submission.due_date}${submission.due_time ? ` ${submission.due_time}` : ""}`}
                </p>
                {submission.content && <p className="mt-1 text-xs text-slate-400">{submission.content}</p>}
                {submission.internal_notes && (
                  <p className="mt-1 text-xs text-slate-500">Notes: {submission.internal_notes}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Archive "${submission.email_subject}"?`))
                    startTransition(() => void archiveCrmSubmissionAction(submission.id));
                }}
                className="shrink-0 rounded-lg px-2.5 py-1 text-xs text-slate-500 hover:text-red-300"
              >
                Archive
              </button>
            </div>
            <div className="mt-2">
              <select
                value={submission.status}
                onChange={(e) =>
                  startTransition(() => void updateCrmSubmissionAction(submission.id, { status: e.target.value as ContentStatus }))
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
