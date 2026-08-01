"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Dumbbell,
  CalendarDays,
  Footprints,
  Ruler,
  ListChecks,
  Settings,
  LogOut,
  History,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { logOut } from "@/lib/actions/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/log", label: "Log Workout", icon: Dumbbell },
  { href: "/history", label: "History", icon: History },
  { href: "/programs", label: "Programs", icon: CalendarDays },
  { href: "/cardio", label: "Running", icon: Footprints },
  { href: "/body", label: "Body Metrics", icon: Ruler },
  { href: "/exercises", label: "Exercises", icon: ListChecks },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ displayName }: { displayName: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-border md:bg-surface">
      <div className="flex items-center gap-2 px-5 py-5">
        {/* The plate-rack mark: three stacked rings, echoed in the loading
            ring on the dashboard, so the mark isn't just a logo but a motif. */}
        <div className="relative h-7 w-7">
          <div className="absolute inset-0 rounded-full border-2 border-accent-strength" style={{ boxShadow: "var(--glow-soft)" }} />
          <div className="absolute inset-[5px] rounded-full border-2 border-accent-cardio" />
        </div>
        <span className="font-display text-lg uppercase tracking-wider">Iron Ledger</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-theme px-3 py-2 text-sm transition-all duration-200",
                active
                  ? "bg-gradient-to-r from-accent-strength/15 to-transparent text-text border-l-2 border-accent-strength -ml-0.5 pl-[11px]"
                  : "text-text-muted hover:bg-surface-2 hover:text-text hover:translate-x-0.5"
              )}
            >
              <Icon size={17} strokeWidth={2} className={active ? "text-accent-strength" : ""} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-3 py-4">
        <div className="px-3 pb-2 text-xs text-text-muted truncate">{displayName}</div>
        <form action={logOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-theme px-3 py-2 text-sm text-text-muted hover:bg-surface-2 hover:text-accent-danger transition-colors"
          >
            <LogOut size={17} />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
