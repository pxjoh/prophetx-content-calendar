"use client";

import { useState, useTransition } from "react";
import { createCrmSubmissionAction } from "@/lib/data/actions";
import { CRM_PLATFORM_LABEL } from "@/lib/labels";
import type { ContentStatus, CrmPlatform, Priority } from "@/types/domain";

const PLATFORMS = Object.keys(CRM_PLATFORM_LABEL) as CrmPlatform[];
const PRIORITIES: Priority[] = ["low", "normal", "high", "breaking"];
const STATUSES: ContentStatus[] = ["idea", "in_progress", "ready", "scheduled", "posted", "archived"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white placeholder:text-slate-500";

export function CrmSubmissionForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [emailSubject, setEmailSubject] = useState("");
  const [content, setContent] = useState("");
  const [platform, setPlatform] = useState<CrmPlatform>("email");
  const [priority, setPriority] = useState<Priority>("normal");
  const [status, setStatus] = useState<ContentStatus>("idea");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!emailSubject.trim()) {
      setError("Email subject is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      await createCrmSubmissionAction({
        email_subject: emailSubject.trim(),
        content: content.trim() || null,
        platform,
        priority,
        status,
        due_date: dueDate || null,
        due_time: dueTime || null,
        internal_notes: internalNotes.trim() || null,
      });
      onDone();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-navy-850 p-4">
      <h4 className="text-sm font-semibold text-white">New CRM Submission</h4>

      <Field label="Email Subject *">
        <input
          value={emailSubject}
          onChange={(e) => setEmailSubject(e.target.value)}
          className={inputClass}
          placeholder="e.g. Don't miss tonight's Chiefs @ Bills odds"
        />
      </Field>

      <Field label="Content">
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} className={inputClass} />
      </Field>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Platform">
          <select value={platform} onChange={(e) => setPlatform(e.target.value as CrmPlatform)} className={inputClass}>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {CRM_PLATFORM_LABEL[p]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className={inputClass}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p[0].toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value as ContentStatus)} className={inputClass}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Due Date">
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Due Time">
          <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className={inputClass} />
        </Field>
      </div>

      <Field label="Internal Notes">
        <textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={2} className={inputClass} />
      </Field>

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
          {pending ? "Saving…" : "Add CRM Submission"}
        </button>
      </div>
    </div>
  );
}
