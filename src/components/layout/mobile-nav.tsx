"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";

// Inner ring: the four most-reached-for destinations, closer to the thumb.
// Outer ring: everything else. Both rings sweep the same wide arc above the
// FAB but at slightly different angular offsets, so items stagger instead
// of lining up in straight spokes — closer to the loose cluster look than
// a perfectly even fan.
const INNER = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/log", label: "Log", icon: Dumbbell },
  { href: "/assistant", label: "AI", icon: Sparkles },
  { href: "/cardio", label: "Running", icon: Footprints },
];

const OUTER = [
  { href: "/history", label: "History", icon: History },
  { href: "/programs", label: "Plans", icon: CalendarDays },
  { href: "/body", label: "Body", icon: Ruler },
  { href: "/exercises", label: "Exercises", icon: ListChecks },
  { href: "/settings", label: "Settings", icon: Settings },
];

function fanPosition(index: number, total: number, radius: number, startDeg: number, endDeg: number) {
  const t = total === 1 ? 0.5 : index / (total - 1);
  const deg = startDeg + (endDeg - startDeg) * t;
  const rad = (deg * Math.PI) / 180;
  return { x: Math.cos(rad) * radius, y: -Math.sin(rad) * radius };
}

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
      )}

      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center pb-6 md:hidden" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
        <div className="relative">
          {open &&
            INNER.map((item, i) => {
              const { x, y } = fanPosition(i, INNER.length, 78, 168, 12);
              return <FanItem key={item.href} item={item} x={x} y={y} active={isActive(item.href)} onNavigate={() => setOpen(false)} />;
            })}
          {open &&
            OUTER.map((item, i) => {
              const { x, y } = fanPosition(i, OUTER.length, 132, 172, 8);
              return <FanItem key={item.href} item={item} x={x} y={y} active={isActive(item.href)} onNavigate={() => setOpen(false)} />;
            })}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="relative flex h-16 w-16 items-center justify-center rounded-full bg-surface"
            style={{ boxShadow: "var(--glow-soft), 0 4px 16px rgba(0,0,0,0.4)" }}
          >
            <span className={cn("absolute transition-all duration-200", open ? "scale-0 opacity-0" : "scale-100 opacity-100")}>
              <span className="relative block h-7 w-7">
                <span className="absolute inset-0 rounded-full border-2 border-accent-strength" />
                <span className="absolute inset-[5px] rounded-full border-2 border-accent-cardio" />
              </span>
            </span>
            <X size={26} className={cn("absolute text-text transition-all duration-200", open ? "scale-100 opacity-100" : "scale-0 opacity-0")} />
          </button>
        </div>
      </div>
    </>
  );
}

function FanItem({
  item,
  x,
  y,
  active,
  onNavigate,
}: {
  item: { href: string; label: string; icon: typeof LayoutDashboard };
  x: number;
  y: number;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className="absolute left-1/2 top-1/2 flex flex-col items-center gap-1"
      style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
    >
      <span
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full border",
          active ? "border-accent-strength bg-accent-strength/15 text-accent-strength" : "border-border bg-surface text-text"
        )}
        style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.35)" }}
      >
        <Icon size={20} />
      </span>
      <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-text-muted">{item.label}</span>
    </Link>
  );
}
