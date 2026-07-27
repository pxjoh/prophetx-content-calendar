"use client";

import { useState, useTransition } from "react";
import { addReferenceLinkAction, createContentIdeaAction } from "@/lib/data/actions";
import { CONTENT_TYPE_LABEL, PLATFORM_LABEL, isVideoContentType } from "@/lib/labels";
import type { ContentType, Platform, Priority, ContentStatus } from "@/types/domain";

const CONTENT_TYPES = Object.keys(CONTENT_TYPE_LABEL) as ContentType[];
const PLATFORMS = Object.keys(PLATFORM_LABEL) as Platform[];
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

export function ContentIdeaForm({
  gameId,
  majorEventId,
  storylineId,
  onDone,
  onCancel,
}: {
  gameId?: string | null;
  majorEventId?: string | null;
  storylineId?: string | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentType, setContentType] = useState<ContentType>("general_social");
  const [platform, setPlatform] = useState<Platform>("x");
  const [priority, setPriority] = useState<Priority>("normal");
  const [status, setStatus] = useState<ContentStatus>("idea");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [referenceLink, setReferenceLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Graphic fields
  const [gHeadline, setGHeadline] = useState("");
  const [gCopy, setGCopy] = useState("");
  const [gStats, setGStats] = useState("");
  const [gImages, setGImages] = useState("");
  const [gDesign, setGDesign] = useState("");
  const [gDimensions, setGDimensions] = useState("");
  const [gPlatformDest, setGPlatformDest] = useState("");

  // Video fields
  const [vConcept, setVConcept] = useState("");
  const [vHook, setVHook] = useState("");
  const [vTalkingPoints, setVTalkingPoints] = useState("");
  const [vFootage, setVFootage] = useState("");
  const [vOnCamera, setVOnCamera] = useState("");
  const [vEditing, setVEditing] = useState("");
  const [vLength, setVLength] = useState("");
  const [vPlatformDest, setVPlatformDest] = useState("");

  const showGraphicFields = contentType === "graphic";
  const showVideoFields = isVideoContentType(contentType);

  function submit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const idea = await createContentIdeaAction({
        title: title.trim(),
        description: description.trim() || null,
        content_type: contentType,
        platform,
        priority,
        status,
        due_date: dueDate || null,
        due_time: dueTime || null,
        game_id: gameId ?? null,
        major_event_id: majorEventId ?? null,
        storyline_id: storylineId ?? null,
        internal_notes: internalNotes.trim() || null,
        graphic_request: showGraphicFields
          ? {
              headline: gHeadline.trim() || null,
              supporting_copy: gCopy.trim() || null,
              required_statistics: gStats.trim() || null,
              required_images: gImages.trim() || null,
              design_instructions: gDesign.trim() || null,
              dimensions: gDimensions.trim() || null,
              platform_destination: gPlatformDest.trim() || null,
              due_date: dueDate || null,
              priority,
            }
          : null,
        video_concept: showVideoFields
          ? {
              concept: vConcept.trim() || null,
              hook: vHook.trim() || null,
              talking_points: vTalkingPoints.trim() || null,
              required_footage: vFootage.trim() || null,
              on_camera_requirements: vOnCamera.trim() || null,
              editing_instructions: vEditing.trim() || null,
              desired_length: vLength.trim() || null,
              platform_destination: vPlatformDest.trim() || null,
              due_date: dueDate || null,
              priority,
            }
          : null,
      });
      if (referenceLink.trim()) {
        await addReferenceLinkAction("content_ideas", idea.id, referenceLink.trim());
      }
      onDone();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-navy-850 p-4">
      <h4 className="text-sm font-semibold text-white">New Content Idea</h4>

      <Field label="Title *">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Odds + storylines graphic" />
      </Field>

      <Field label="Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} />
      </Field>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Content Type">
          <select value={contentType} onChange={(e) => setContentType(e.target.value as ContentType)} className={inputClass}>
            {CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {CONTENT_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Platform">
          <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)} className={inputClass}>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABEL[p]}
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

      {showGraphicFields && (
        <div className="space-y-3 rounded-lg border border-teal-500/20 bg-teal-500/5 p-3">
          <p className="text-xs font-semibold text-teal-300">Graphic Request Details</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Headline">
              <input value={gHeadline} onChange={(e) => setGHeadline(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Dimensions / Aspect Ratio">
              <input value={gDimensions} onChange={(e) => setGDimensions(e.target.value)} placeholder="e.g. 1080x1350" className={inputClass} />
            </Field>
          </div>
          <Field label="Supporting Copy">
            <textarea value={gCopy} onChange={(e) => setGCopy(e.target.value)} rows={2} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Required Statistics">
              <textarea value={gStats} onChange={(e) => setGStats(e.target.value)} rows={2} className={inputClass} />
            </Field>
            <Field label="Required Player/Team Images">
              <textarea value={gImages} onChange={(e) => setGImages(e.target.value)} rows={2} className={inputClass} />
            </Field>
          </div>
          <Field label="Design Instructions">
            <textarea value={gDesign} onChange={(e) => setGDesign(e.target.value)} rows={2} className={inputClass} />
          </Field>
          <Field label="Platform Destination">
            <input value={gPlatformDest} onChange={(e) => setGPlatformDest(e.target.value)} className={inputClass} />
          </Field>
        </div>
      )}

      {showVideoFields && (
        <div className="space-y-3 rounded-lg border border-teal-500/20 bg-teal-500/5 p-3">
          <p className="text-xs font-semibold text-teal-300">Video Concept Details</p>
          <Field label="Concept">
            <textarea value={vConcept} onChange={(e) => setVConcept(e.target.value)} rows={2} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hook">
              <input value={vHook} onChange={(e) => setVHook(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Desired Length">
              <input value={vLength} onChange={(e) => setVLength(e.target.value)} placeholder="e.g. 15-20 seconds" className={inputClass} />
            </Field>
          </div>
          <Field label="Talking Points">
            <textarea value={vTalkingPoints} onChange={(e) => setVTalkingPoints(e.target.value)} rows={2} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Required Footage">
              <textarea value={vFootage} onChange={(e) => setVFootage(e.target.value)} rows={2} className={inputClass} />
            </Field>
            <Field label="On-Camera Requirements">
              <textarea value={vOnCamera} onChange={(e) => setVOnCamera(e.target.value)} rows={2} className={inputClass} />
            </Field>
          </div>
          <Field label="Editing Instructions">
            <textarea value={vEditing} onChange={(e) => setVEditing(e.target.value)} rows={2} className={inputClass} />
          </Field>
          <Field label="Platform Destination">
            <input value={vPlatformDest} onChange={(e) => setVPlatformDest(e.target.value)} className={inputClass} />
          </Field>
        </div>
      )}

      <Field label="Reference Link">
        <input value={referenceLink} onChange={(e) => setReferenceLink(e.target.value)} placeholder="https://..." className={inputClass} />
      </Field>

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
          {pending ? "Saving…" : "Add Content Idea"}
        </button>
      </div>
    </div>
  );
}
