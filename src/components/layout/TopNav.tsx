"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity } from "lucide-react";
import { logout } from "@/lib/auth/actions";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import type { AppNotification } from "@/types/domain";

const NAV_ITEMS = [
  { href: "/", label: "Schedule" },
  { href: "/leagues", label: "Leagues" },
  { href: "/teams", label: "Teams" },
  { href: "/price-clips", label: "Price Clips" },
  { href: "/major-events", label: "Major Events" },
  { href: "/content-ideas", label: "Content Ideas" },
  { href: "/graphic-requests", label: "Graphic Requests" },
  { href: "/video-requests", label: "Video Requests" },
  { href: "/crm-submissions", label: "CRM Submissions" },
  { href: "/archived", label: "Archived" },
];

export function TopNav({ notifications }: { notifications: AppNotification[] }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-950/95 backdrop-blur">
      <div className="flex items-center gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2 text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400 ring-1 ring-teal-500/30">
            <Activity className="h-4 w-4" strokeWidth={2} />
          </span>
          <span className="hidden text-sm font-semibold tracking-tight sm:block">ProphetX Command Center</span>
        </div>

        <nav className="scrollbar-none flex flex-1 items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${
                  active ? "bg-teal-500/10 text-teal-300" : "text-slate-400 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <NotificationBell notifications={notifications} />
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-red-500/30 hover:text-red-300"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
