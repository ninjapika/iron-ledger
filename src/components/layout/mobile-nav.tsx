"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Dumbbell, CalendarDays, Footprints, MoreHorizontal, Ruler, ListChecks, Settings, LogOut, X, History } from "lucide-react";
import { cn } from "@/lib/cn";
import { logOut } from "@/lib/actions/auth";

const PRIMARY = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/log", label: "Log", icon: Dumbbell },
  { href: "/programs", label: "Plans", icon: CalendarDays },
  { href: "/cardio", label: "Running", icon: Footprints },
];

const MORE = [
  { href: "/history", label: "History", icon: History },
  { href: "/body", label: "Body Metrics", icon: Ruler },
  { href: "/exercises", label: "Exercises", icon: ListChecks },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-40 flex border-t border-border bg-surface md:hidden">
        {PRIMARY.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px]",
                active ? "text-accent-strength" : "text-text-muted"
              )}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
        <button
          onClick={() => setOpen(true)}
          className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] text-text-muted"
        >
          <MoreHorizontal size={20} />
          More
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative w-full rounded-t-xl border-t border-border bg-surface p-4 pb-8">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display uppercase tracking-wide text-text">More</span>
              <button onClick={() => setOpen(false)} aria-label="Close">
                <X size={20} className="text-text-muted" />
              </button>
            </div>
            <div className="space-y-1">
              {MORE.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-text hover:bg-surface-2"
                >
                  <Icon size={18} />
                  {label}
                </Link>
              ))}
              <form action={logOut}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-accent-danger hover:bg-surface-2"
                >
                  <LogOut size={18} />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
