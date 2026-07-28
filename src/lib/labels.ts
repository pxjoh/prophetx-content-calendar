import type { ContentStatus, ContentType, CrmPlatform, Importance, Platform, Priority } from "@/types/domain";

export const IMPORTANCE_LABEL: Record<Importance, string> = {
  standard: "Standard",
  notable: "Notable",
  major: "Major",
  must_cover: "Must Cover",
};

export const IMPORTANCE_BADGE_CLASS: Record<Importance, string> = {
  standard: "bg-navy-700 text-slate-300 ring-1 ring-white/10",
  notable: "bg-teal-500/10 text-teal-300 ring-1 ring-teal-500/30",
  major: "bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30",
  must_cover: "bg-red-500/15 text-red-300 ring-1 ring-red-500/40",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  breaking: "Breaking",
};

export const PRIORITY_BADGE_CLASS: Record<Priority, string> = {
  low: "bg-navy-700 text-slate-300 ring-1 ring-white/10",
  normal: "bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/30",
  high: "bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30",
  breaking: "bg-red-500/15 text-red-300 ring-1 ring-red-500/40",
};

export const STATUS_LABEL: Record<ContentStatus, string> = {
  idea: "Idea",
  in_progress: "In Progress",
  ready: "Ready",
  scheduled: "Scheduled",
  posted: "Posted",
  archived: "Archived",
};

export const STATUS_BADGE_CLASS: Record<ContentStatus, string> = {
  idea: "bg-navy-700 text-slate-300 ring-1 ring-white/10",
  in_progress: "bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/30",
  ready: "bg-teal-500/10 text-teal-300 ring-1 ring-teal-500/30",
  scheduled: "bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/30",
  posted: "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30",
  archived: "bg-navy-700 text-slate-500 ring-1 ring-white/10",
};

export const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  general_social: "General Social Post",
  graphic: "Graphic",
  video: "Video",
  short_form_video: "Short-Form Video",
  long_form_video: "Long-Form Video",
  meme: "Meme",
  poll: "Poll",
  thread: "Thread",
  article: "Article",
  live_content: "Live Content",
  promotional: "Promotional Content",
  other: "Other",
};

export const PLATFORM_LABEL: Record<Platform, string> = {
  x: "X",
  instagram: "Instagram",
  instagram_story: "Instagram Story",
  tiktok: "TikTok",
  youtube: "YouTube",
  youtube_shorts: "YouTube Shorts",
  discord: "Discord",
  linkedin: "LinkedIn",
  multiple: "Multiple Platforms",
  other: "Other",
};

export function isVideoContentType(type: ContentType): boolean {
  return type === "video" || type === "short_form_video" || type === "long_form_video";
}

export const CRM_PLATFORM_LABEL: Record<CrmPlatform, string> = {
  push_notification: "Push Notification",
  email: "Email",
};
