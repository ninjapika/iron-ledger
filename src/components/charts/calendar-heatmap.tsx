"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type DayInfo = {
  date: string;
  dayNum: number;
  lvl: 0 | 1 | 2 | 3;
  bg: string;
  isToday: boolean;
  showLabel: boolean;
  title: string;
};

/**
 * `size="fill"` makes the cell (and its aspect ratio) take on whatever
 * width its flex parent gives it instead of a fixed pixel value — used by
 * the `mini` variant's balanced-row layout below, where every row's cells
 * are meant to stretch evenly to fill that row's actual width.
 */
function DayCell({ day, size }: { day: DayInfo; size: number | "fill" }) {
  const boxStyle: React.CSSProperties =
    size === "fill"
      ? { width: "100%", aspectRatio: "1 / 1", backgroundColor: day.bg, opacity: OPACITY[day.lvl] }
      : { width: size, height: size, backgroundColor: day.bg, opacity: OPACITY[day.lvl] };
  return (
    <div className={cn("flex flex-col items-center gap-0.5", size === "fill" && "flex-1")}>
      <div
        title={day.title}
        style={boxStyle}
        className={cn("rounded-[3px]", day.isToday && "ring-1 ring-accent-highlight ring-offset-1 ring-offset-bg")}
      />
      <span
        className="text-[8px] leading-none text-text-muted"
        style={{ visibility: day.showLabel ? "visible" : "hidden" }}
      >
        {day.dayNum}
      </span>
    </div>
  );
}

/**
 * Splits `days` into balanced rows sized to actually fill `containerWidth`:
 * first works out how many `minCell`-ish cells fit per line at that width,
 * then — instead of just wrapping greedily at that count (which leaves a
 * lopsided short last row that `justify-content` would otherwise stretch
 * out into big, ugly gaps between its few cells) — picks the smallest
 * number of EQUAL-ish rows that keeps every row at or under that count.
 * "Equal-ish" means no two rows ever differ by more than one cell, so cell
 * size stays visually consistent from row to row.
 */
function balancedRows(days: DayInfo[], containerWidth: number, minCell: number, gap: number): DayInfo[][] {
  const total = days.length;
  if (total === 0) return [];
  const perRowAtMinSize = containerWidth > 0 ? Math.max(1, Math.floor((containerWidth + gap) / (minCell + gap))) : 10;
  const numRows = Math.max(1, Math.ceil(total / perRowAtMinSize));
  const base = Math.floor(total / numRows);
  const remainder = total % numRows;

  const rows: DayInfo[][] = [];
  let idx = 0;
  for (let r = 0; r < numRows; r++) {
    const count = base + (r < remainder ? 1 : 0);
    rows.push(days.slice(idx, idx + count));
    idx += count;
  }
  return rows;
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
 *   actually gives it, in balanced rows (see balancedRows above) — each row
 *   is its own flex line whose cells stretch evenly to fill it, so the
 *   whole block reads as one consistent, evenly-spaced grid that uses the
 *   full width with no dead trailing space, rather than a fixed tiny block
 *   or a lopsided wrap.
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
    // the start of each row; under `variant="mini"`'s balanced rows they
    // no longer necessarily do, but they're still a reasonable, evenly
    // spaced set of reference points either way.
    const marks = new Set<number>();
    for (let d = 1; d <= totalDays; d += 7) marks.add(d);
    marks.add(totalDays);
    return marks;
  }, [totalDays]);

  const cellSize = variant === "mini" ? 14 : 11;
  const gap = 5;

  const days: DayInfo[] = data.days.map((day, i) => {
    const dayNum = i + 1;
    const lvl = intensity(day.load, max);
    const dominant = dominantWorkoutType(day);
    return {
      date: day.date,
      dayNum,
      lvl,
      bg: lvl === 0 ? "var(--surface-2)" : dominant ? TYPE_VAR[dominant] : "var(--type-manual)",
      isToday: day.date === todayKey,
      showLabel: labeledDays.has(dayNum),
      title: day.date + (day.load > 0 ? ` — ${dominant ?? "logged"}` : ""),
    };
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (variant !== "mini") return;
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [variant]);

  const rows = variant === "mini" ? balancedRows(days, width, cellSize, gap) : [];

  return (
    <div>
      {variant === "labeled" && (
        <p className="mb-2 font-display text-sm uppercase tracking-wide text-text-muted">
          {MONTH_NAMES[data.month]} {data.year}
        </p>
      )}

      {variant === "mini" ? (
        <div ref={containerRef} className="flex w-full flex-col" style={{ gap }}>
          {rows.map((row, i) => (
            <div key={i} className="flex" style={{ gap }}>
              {row.map((day) => (
                <DayCell key={day.date} day={day} size="fill" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div
          className="inline-grid"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(${cellSize}px, auto))`, gap }}
        >
          {days.map((day) => (
            <DayCell key={day.date} day={day} size={cellSize} />
          ))}
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
