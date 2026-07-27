"use client";

import { useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/data/actions";
import type { AppNotification } from "@/types/domain";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationBell({ notifications }: { notifications: AppNotification[] }) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:border-teal-500/30 hover:text-teal-300"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" strokeWidth={2} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-white/10 bg-navy-900 shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => startTransition(() => void markAllNotificationsReadAction())}
                  className="text-xs font-medium text-teal-400 hover:text-teal-300"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-slate-500">You&apos;re all caught up.</p>
              )}
              {notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => startTransition(() => void markNotificationReadAction(n.id))}
                  className={`block w-full border-b border-white/5 px-4 py-3 text-left text-sm transition last:border-0 hover:bg-navy-800 ${
                    n.is_read ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.is_read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />}
                    <div className={n.is_read ? "pl-3.5" : ""}>
                      <p className="font-medium text-white">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-xs text-slate-400">{n.body}</p>}
                      <p className="mt-1 text-[11px] text-slate-500">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
