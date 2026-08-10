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

const ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/log", label: "Log", icon: Dumbbell },
  { href: "/assistant", label: "AI", icon: Sparkles },
  { href: "/history", label: "History", icon: History },
  { href: "/programs", label: "Plans", icon: CalendarDays },
  { href: "/cardio", label: "Running", icon: Footprints },
  { href: "/body", label: "Body", icon: Ruler },
  { href: "/exercises", label: "Exercises", icon: ListChecks },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  // mounted/open are deliberately separate: closing needs to stay mounted
  // long enough to actually play its transition instead of vanishing
  // instantly (which is what the flat, unsmooth close was — the previous
  // version had no exit transition at all).
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  function toggle() {
    if (open) {
      setOpen(false); // panel/backdrop transition out; unmount on transition end
    } else {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)));
    }
  }

  function close() {
    setOpen(false);
  }

  return (
    <>
      {mounted && (
        <div
          className={cn("fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 md:hidden", open ? "opacity-100" : "opacity-0")}
          onClick={close}
          onTransitionEnd={() => !open && setMounted(false)}
          aria-hidden="true"
        />
      )}

      <div
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center md:hidden"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        {mounted && (
          <div
            className={cn(
              "mb-3 w-[min(88vw,320px)] origin-bottom rounded-theme border border-border bg-surface-2 p-3 shadow-2xl transition-all duration-200 ease-out",
              open ? "scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0"
            )}
          >
            <div className="grid grid-cols-3 gap-2">
              {ITEMS.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-theme py-3 text-xs transition-colors",
                      active ? "bg-accent-strength/15 text-accent-strength" : "text-text-muted hover:bg-surface hover:text-text"
                    )}
                  >
                    <Icon size={22} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={toggle}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="relative flex h-16 w-16 items-center justify-center rounded-full bg-surface transition-transform duration-200 active:scale-95"
          style={{ boxShadow: "var(--glow-soft), 0 4px 16px rgba(0,0,0,0.4)" }}
        >
          <span className={cn("absolute transition-all duration-200", open ? "scale-0 opacity-0" : "scale-100 opacity-100")}>
            <span className="relative block h-7 w-7">
              <span className="absolute inset-0 rounded-full border-2 border-accent-strength" />
              <span className="absolute inset-[5px] rounded-full border-2 border-accent-cardio" />
            </span>
          </span>
          <X size={26} className={cn("absolute text-text transition-all duration-200", open ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0")} />
        </button>
      </div>
    </>
  );
}
