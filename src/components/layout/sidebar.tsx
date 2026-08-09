"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Dumbbell,
  CalendarDays,
  Footprints,
  Ruler,
  ListChecks,
  Settings,
  History,
  Sparkles,
  Pin,
  PinOff,
} from "lucide-react";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/log", label: "Log Workout", icon: Dumbbell },
  { href: "/assistant", label: "AI Assistant", icon: Sparkles },
  { href: "/history", label: "History", icon: History },
  { href: "/programs", label: "Programs", icon: CalendarDays },
  { href: "/cardio", label: "Running", icon: Footprints },
  { href: "/body", label: "Body Metrics", icon: Ruler },
  { href: "/exercises", label: "Exercises", icon: ListChecks },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ displayName }: { displayName: string }) {
  const pathname = usePathname();
  const [pinned, setPinned] = useState(false);
  const [hovering, setHovering] = useState(false);

  // Reads localStorage after mount, deliberately not in a lazy useState
  // initializer: that would run during hydration too, where localStorage
  // isn't available server-side, and produce a mismatch between what the
  // server rendered (always collapsed) and the client's first paint.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read from an external store at mount, not React state sync
    setPinned(localStorage.getItem("sidebarPinned") === "true");
  }, []);

  function togglePinned() {
    const next = !pinned;
    setPinned(next);
    localStorage.setItem("sidebarPinned", String(next));
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const body = (isOverlay: boolean, isExpanded: boolean) => (
    <div
      className={cn(
        "flex h-full flex-col border-r border-border bg-surface",
        isOverlay ? "absolute left-0 top-0 z-50 w-60 shadow-2xl" : pinned ? "w-60" : "w-20"
      )}
    >
      <div className={cn("flex items-center gap-2.5 px-5 py-5", !isExpanded && "justify-center px-0")}>
        {/* The plate-rack mark: three stacked rings, echoed in the loading
            ring on the dashboard, so the mark isn't just a logo but a motif. */}
        <div className="relative h-8 w-8 shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-accent-strength" style={{ boxShadow: "var(--glow-soft)" }} />
          <div className="absolute inset-[5px] rounded-full border-2 border-accent-cardio" />
        </div>
        {isExpanded && <span className="font-display text-lg uppercase tracking-wider">Iron Ledger</span>}
      </div>

      <nav className={cn("flex-1 space-y-1", isExpanded ? "px-3" : "px-2.5")}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              title={isExpanded ? undefined : label}
              className={cn(
                "flex items-center gap-3 rounded-theme py-2.5 text-sm transition-all duration-200",
                isExpanded ? "px-3" : "justify-center px-0",
                active
                  ? "bg-gradient-to-r from-accent-strength/15 to-transparent text-text"
                  : "text-text-muted hover:bg-surface-2 hover:text-text",
                active && isExpanded && "border-l-2 border-accent-strength -ml-0.5 pl-[11px]"
              )}
            >
              <Icon size={22} strokeWidth={2} className={cn("shrink-0", active ? "text-accent-strength" : "")} />
              {isExpanded && label}
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-t border-border py-4", isExpanded ? "px-3" : "px-2.5")}>
        {isExpanded && <div className="px-3 pb-2 truncate text-xs text-text-muted">{displayName}</div>}
        <button
          type="button"
          onClick={togglePinned}
          title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
          className={cn(
            "flex w-full items-center gap-3 rounded-theme py-2.5 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text",
            isExpanded ? "px-3" : "justify-center px-0"
          )}
        >
          {pinned ? <PinOff size={20} className="shrink-0" /> : <Pin size={20} className="shrink-0" />}
          {isExpanded && (pinned ? "Unpin sidebar" : "Pin sidebar open")}
        </button>
      </div>
    </div>
  );

  return (
    <aside
      className={cn("relative hidden md:block md:shrink-0", pinned ? "md:w-60" : "md:w-20")}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {body(false, pinned)}
      {!pinned && hovering && body(true, true)}
    </aside>
  );
}
