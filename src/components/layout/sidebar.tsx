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

// Shared timing for every width/opacity/label transition below, so the
// rail and its contents always animate in lockstep instead of the width
// settling before (or after) the labels finish fading.
const TRANSITION = "duration-300 ease-in-out";

/** A label that's always mounted (so it can actually transition instead of
 * popping in/out) but collapses to nothing when the sidebar is unpinned.
 * max-width (rather than width) transitions cleanly without knowing the
 * text's real width up front — overflow-hidden clips it at every step. */
function Label({ expanded, children, className }: { expanded: boolean; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "overflow-hidden whitespace-nowrap transition-[max-width,opacity]",
        TRANSITION,
        expanded ? "max-w-[180px] opacity-100" : "max-w-0 opacity-0",
        className
      )}
    >
      {children}
    </span>
  );
}

export function Sidebar({ displayName }: { displayName: string }) {
  const pathname = usePathname();
  const [pinned, setPinned] = useState(false);

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

  // Pinned is the only thing that ever decides expanded vs. rail on
  // desktop now — no hover-expand. Hovering while unpinned does nothing;
  // the only way back to the full sidebar is re-pinning it.
  // sticky + h-screen (not h-full) is deliberate: the parent flex row is
  // only min-h-screen, so on any page taller than one viewport it used to
  // stretch this aside to match — pushing the pin button, way down in the
  // footer, off past whatever the page's actual content height was. h-screen
  // pins the sidebar's own height to the viewport regardless of how long the
  // page is, and sticky keeps it in view as that page scrolls underneath it.
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 overflow-y-auto border-r border-border bg-surface transition-[width] md:block",
        TRANSITION,
        pinned ? "md:w-60" : "md:w-20"
      )}
    >
      <div className="flex h-full flex-col">
        <div className={cn("flex items-center gap-2.5 px-5 py-5", !pinned && "justify-center px-0")}>
          {/* The plate-rack mark: three stacked rings, echoed in the loading
              ring on the dashboard, so the mark isn't just a logo but a motif. */}
          <div className="relative h-8 w-8 shrink-0">
            <div className="absolute inset-0 rounded-full border-2 border-accent-strength" style={{ boxShadow: "var(--glow-soft)" }} />
            <div className="absolute inset-[5px] rounded-full border-2 border-accent-cardio" />
          </div>
          <Label expanded={pinned} className="font-display text-lg uppercase tracking-wider">
            Iron Ledger
          </Label>
        </div>

        <nav className={cn("flex-1 space-y-1 transition-[padding]", TRANSITION, pinned ? "px-3" : "px-2.5")}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                title={pinned ? undefined : label}
                className={cn(
                  "flex items-center gap-3 rounded-theme py-2.5 text-sm transition-all duration-200",
                  pinned ? "px-3" : "justify-center px-0",
                  active
                    ? "bg-gradient-to-r from-accent-strength/15 to-transparent text-text"
                    : "text-text-muted hover:bg-surface-2 hover:text-text",
                  active && pinned && "border-l-2 border-accent-strength -ml-0.5 pl-[11px]"
                )}
              >
                <Icon size={22} strokeWidth={2} className={cn("shrink-0", active ? "text-accent-strength" : "")} />
                <Label expanded={pinned}>{label}</Label>
              </Link>
            );
          })}
        </nav>

        <div className={cn("border-t border-border py-4 transition-[padding]", TRANSITION, pinned ? "px-3" : "px-2.5")}>
          <Label expanded={pinned} className="block px-3 pb-2 text-xs text-text-muted">
            {displayName}
          </Label>
          <button
            type="button"
            onClick={togglePinned}
            title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
            className={cn(
              "flex w-full items-center gap-3 rounded-theme py-2.5 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text",
              pinned ? "px-3" : "justify-center px-0"
            )}
          >
            <span className="relative shrink-0" style={{ width: 20, height: 20 }}>
              {/* Both icons stay mounted and cross-fade/rotate into each
                  other, rather than swapping instantly — matches the pin
                  button being the one place this state change is most
                  directly the user's own action. */}
              <PinOff
                size={20}
                className={cn(
                  "absolute inset-0 transition-all duration-200",
                  pinned ? "rotate-0 scale-100 opacity-100" : "rotate-45 scale-75 opacity-0"
                )}
              />
              <Pin
                size={20}
                className={cn(
                  "absolute inset-0 transition-all duration-200",
                  pinned ? "-rotate-45 scale-75 opacity-0" : "rotate-0 scale-100 opacity-100"
                )}
              />
            </span>
            <Label expanded={pinned}>{pinned ? "Unpin sidebar" : "Pin sidebar open"}</Label>
          </button>
        </div>
      </div>
    </aside>
  );
}
