"use client";

import { cn } from "@/lib/cn";
import { WORKOUT_TYPE_LABELS } from "@/lib/data/exercise-labels";
import { WORKOUT_TYPES, WORKOUT_TYPE_ICONS, WORKOUT_TYPE_COLOR, type WorkoutType } from "@/lib/data/workout-types";

export type { WorkoutType };

export function WorkoutTypeSelector({
  value,
  onChange,
}: {
  value: WorkoutType;
  onChange: (t: WorkoutType) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {WORKOUT_TYPES.map((t) => {
        const Icon = WORKOUT_TYPE_ICONS[t];
        const color = WORKOUT_TYPE_COLOR[t];
        const active = value === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-theme border px-3 py-3 text-xs transition-all duration-150",
              active ? cn(color.border, color.bg, "text-text") : "border-border text-text-muted hover:text-text"
            )}
          >
            <Icon size={18} className={active ? color.text : ""} />
            {WORKOUT_TYPE_LABELS[t]}
          </button>
        );
      })}
    </div>
  );
}
