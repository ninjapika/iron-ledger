"use client";

import { useMemo } from "react";
import { Dumbbell, Footprints, Sparkles } from "lucide-react";
import type { MonthActivity } from "@/lib/data/dashboard";
import { dominantWorkoutType } from "@/lib/data/workout-types";
import { cn } from "@/lib/cn";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function intensity(load: number, max: number): 0 | 1 | 2 | 3 {
  if (load <= 0) return 0;
  const ratio = load / max;
  if (ratio > 0.66) return 3;
  if (ratio > 0.33) return 2;
  return 1;
}

const OPACITY = [1, 0.35, 0.65, 1];

const TYPE_VAR: Record<"strength" | "cardio" | "skill", string> = {
  strength: "var(--type-strength)",
  cardio: "var(--type-cardio)",
  skill: "var(--type-skill)",
};

const LEGEND = [
  { type: "strength" as const, icon: Dumbbell, label: "Strength" },
  { type: "cardio" as const, icon: Footprints, label: "Cardio" },
  { type: "skill" as const, icon: Sparkles, label: "Skill" },
];

const COLS = 7;

/**
 * A compact, fixed-column grid of day cells — day 1 through the end of the
 * month, left to right then wrapping every 7 (a plain `display: grid` with
 * `repeat(7, ...)` columns and no explicit placement, so the browser
 * auto-wraps every item deterministically). Deliberately NOT aligned to
 * actual weekdays — this is a fixed grid, not a real calendar, so it always
 * reads as a small squarish block regardless of container width instead of
 * stretching into one long row.
 *
 * Each cell is colored by whichever workout type contributed the most that
 * day (strength/cardio/skill — see dominantWorkoutType), shaded by relative
 * intensity; an empty day is just the flat surface color. Only a sparse
 * handful of days ever print a number, directly under their own cell (never
 * a full weekday-style header) — `variant="mini"` (dashboard) keeps just
 * the first/last day, `variant="labeled"` (the full history gallery) adds a
 * couple more and shows the type legend underneath.
 */
export function CalendarHeatmap({
  data,
  variant = "labeled",
}: {
  data: MonthActivity;
  variant?: "mini" | "labeled";
}) {
  const max = useMemo(() => Math.max(1, ...data.days.map((d) => d.load)), [data]);
  const todayKey = new Date().toISOString().slice(0, 10);
  const totalDays = data.days.length;

  const labeledDays = useMemo(() => {
    // Every 7th day lines up with the start of a new row in the grid
    // (day 1, 8, 15, 22, 29 all land in column 1), so these read as
    // natural row markers rather than looking randomly placed.
    const marks = new Set<number>();
    for (let d = 1; d <= totalDays; d += 7) marks.add(d);
    marks.add(totalDays);
    return marks;
  }, [totalDays]);

  const cellSize = variant === "mini" ? 8 : 11;
  const gap = variant === "mini" ? 3 : 4;

  return (
    <div>
      {variant === "labeled" && (
        <p className="mb-2 font-display text-sm uppercase tracking-wide text-text-muted">
          {MONTH_NAMES[data.month]} {data.year}
        </p>
      )}

      <div
        className="inline-grid"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(${cellSize}px, auto))`, gap }}
      >
        {data.days.map((day, i) => {
          const dayNum = i + 1;
          const lvl = intensity(day.load, max);
          const isToday = day.date === todayKey;
          const dominant = dominantWorkoutType(day);
          const bg = lvl === 0 ? "var(--surface-2)" : dominant ? TYPE_VAR[dominant] : "var(--type-manual)";
          const showLabel = labeledDays.has(dayNum);
          return (
            <div key={day.date} className="flex flex-col items-center gap-0.5">
              <div
                title={day.date + (day.load > 0 ? ` — ${dominant ?? "logged"}` : "")}
                style={{ width: cellSize, height: cellSize, backgroundColor: bg, opacity: OPACITY[lvl] }}
                className={cn("rounded-[3px]", isToday && "ring-1 ring-accent-highlight ring-offset-1 ring-offset-bg")}
              />
              <span
                className="text-[8px] leading-none text-text-muted"
                style={{ visibility: showLabel ? "visible" : "hidden" }}
              >
                {dayNum}
              </span>
            </div>
          );
        })}
      </div>

      {variant === "labeled" && (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-text-muted">
          {LEGEND.map(({ type, icon: Icon, label }) => (
            <span key={type} className="flex items-center gap-1">
              <Icon size={11} style={{ color: TYPE_VAR[type] }} />
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
