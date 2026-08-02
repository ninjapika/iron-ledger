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

function DayCell({
  dayNum,
  lvl,
  bg,
  isToday,
  showLabel,
  title,
  cellSize,
}: {
  dayNum: number;
  lvl: 0 | 1 | 2 | 3;
  bg: string;
  isToday: boolean;
  showLabel: boolean;
  title: string;
  cellSize: number;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        title={title}
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
}

/**
 * Two rendering strategies depending on `variant`, both built from the same
 * per-day DayCell:
 *
 * - `variant="labeled"` (the full history/calendar page): a fixed 7-column
 *   grid, day 1 through the end of the month, left to right then wrapping
 *   every 7 (`display: grid` with `repeat(7, ...)` and no explicit
 *   placement). Deliberately NOT aligned to actual weekdays — always a
 *   small squarish block regardless of container width.
 *
 * - `variant="mini"` (the dashboard card): fills whatever width its parent
 *   actually gives it instead of shrinking to that same fixed block — a
 *   `flex-wrap` row of fixed-size cells with `justify-content: space-between`.
 *   The browser fits as many cells as the real available width allows per
 *   line (no JS measurement, fully responsive) and spreads whatever ends up
 *   on each line edge-to-edge, so every row — including a ragged last one —
 *   uses the full width with no dead trailing space, and cell size stays
 *   consistent across rows instead of one sparse row ballooning to fill
 *   itself alone.
 *
 * Each cell is colored by whichever workout type contributed the most that
 * day (strength/cardio/skill — see dominantWorkoutType), shaded by relative
 * intensity; an empty day is just the flat surface color. Only a sparse
 * handful of days ever print a number, directly under their own cell (never
 * a full weekday-style header).
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
    // Every 7th day (1, 8, 15, 22, 29) plus the last day of the month —
    // under `variant="labeled"`'s fixed 7-column grid these line up with
    // the start of each row; under `variant="mini"`'s flexible wrap they no
    // longer necessarily do, but they're still a reasonable, evenly-spaced
    // set of reference points either way.
    const marks = new Set<number>();
    for (let d = 1; d <= totalDays; d += 7) marks.add(d);
    marks.add(totalDays);
    return marks;
  }, [totalDays]);

  const cellSize = variant === "mini" ? 12 : 11;
  const gap = 4;

  const cells = data.days.map((day, i) => {
    const dayNum = i + 1;
    const lvl = intensity(day.load, max);
    const isToday = day.date === todayKey;
    const dominant = dominantWorkoutType(day);
    const bg = lvl === 0 ? "var(--surface-2)" : dominant ? TYPE_VAR[dominant] : "var(--type-manual)";
    return (
      <DayCell
        key={day.date}
        dayNum={dayNum}
        lvl={lvl}
        bg={bg}
        isToday={isToday}
        showLabel={labeledDays.has(dayNum)}
        title={day.date + (day.load > 0 ? ` — ${dominant ?? "logged"}` : "")}
        cellSize={cellSize}
      />
    );
  });

  return (
    <div>
      {variant === "labeled" && (
        <p className="mb-2 font-display text-sm uppercase tracking-wide text-text-muted">
          {MONTH_NAMES[data.month]} {data.year}
        </p>
      )}

      {variant === "mini" ? (
        <div className="flex w-full flex-wrap justify-between" style={{ gap }}>
          {cells}
        </div>
      ) : (
        <div
          className="inline-grid"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(${cellSize}px, auto))`, gap }}
        >
          {cells}
        </div>
      )}

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
