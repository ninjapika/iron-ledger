"use client";

import { useMemo } from "react";
import type { DayActivity } from "@/lib/data/dashboard";

const DOW_LABELS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];
const CELL = 14;
const GAP = 3;

/**
 * Coloring logic (see also the docstring on getDayActivity in
 * lib/data/dashboard.ts, which computes the raw "load" number this reads):
 *   - 0 load           -> empty surface color
 *   - up to 33% of max -> faint accent
 *   - 33-66% of max    -> medium accent
 *   - above 66% of max -> full accent
 * "max" is the busiest day currently in view, not a fixed number, so the
 * heatmap always uses its full color range regardless of whether you're a
 * light or heavy trainer. To change the thresholds, edit `intensity()`
 * below. To change what counts as "load" in the first place (e.g. weight
 * by itself instead of weight x reps), edit getDayActivity instead.
 */
function intensity(load: number, max: number): 0 | 1 | 2 | 3 {
  if (load <= 0) return 0;
  const ratio = load / max;
  if (ratio > 0.66) return 3;
  if (ratio > 0.33) return 2;
  return 1;
}

const SHADE = ["var(--surface-2)", "var(--accent-strength)", "var(--accent-strength)", "var(--accent-strength)"];
const OPACITY = [1, 0.35, 0.65, 1];

export function StreakHeatmap({ data }: { data: DayActivity[] }) {
  const max = useMemo(() => Math.max(1, ...data.map((d) => d.load)), [data]);

  // Pad to the previous Monday so weeks line up into clean columns, then
  // place every cell by explicit grid position — no nested flex containers
  // to get out of sync with each other.
  const cells = useMemo(() => {
    if (data.length === 0) return [];
    const firstDow = (new Date(`${data[0].date}T12:00:00Z`).getUTCDay() + 6) % 7; // 0=Mon
    return [...(Array(firstDow).fill(null) as null[]), ...data];
  }, [data]);

  const weekCount = Math.ceil(cells.length / 7);

  return (
    <div>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `24px repeat(${weekCount}, ${CELL}px)`,
          gridTemplateRows: `repeat(7, ${CELL}px)`,
          gridAutoFlow: "column",
          gap: GAP,
        }}
      >
        {DOW_LABELS.map((label, row) => (
          <div
            key={`label-${row}`}
            style={{ gridColumn: 1, gridRow: row + 1 }}
            className="flex items-center text-[9px] text-text-muted"
          >
            {label}
          </div>
        ))}
        {cells.map((day, i) => {
          const row = i % 7;
          const col = Math.floor(i / 7) + 2; // +2: column 1 is the label column
          if (!day) return null;
          const lvl = intensity(day.load, max);
          return (
            <div
              key={day.date}
              title={day.date + (day.load > 0 ? " — trained" : "")}
              style={{
                gridColumn: col,
                gridRow: row + 1,
                backgroundColor: SHADE[lvl],
                opacity: OPACITY[lvl],
              }}
              className="rounded-[3px] transition-opacity"
            />
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-text-muted">
        Less
        {OPACITY.map((o, i) => (
          <div key={i} className="h-[10px] w-[10px] rounded-[2px]" style={{ backgroundColor: SHADE[i], opacity: o }} />
        ))}
        More
      </div>
    </div>
  );
}
