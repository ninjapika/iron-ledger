import { Dumbbell, Footprints, Sparkles, ListTree } from "lucide-react";

export type WorkoutType = "strength" | "cardio" | "skill" | "manual";

export const WORKOUT_TYPES: WorkoutType[] = ["strength", "cardio", "skill", "manual"];

export const WORKOUT_TYPE_ICONS: Record<WorkoutType, typeof Dumbbell> = {
  strength: Dumbbell,
  cardio: Footprints,
  skill: Sparkles,
  manual: ListTree,
};

/** Fixed color identity per workout type — intentionally NOT the same as
 * the theme's accent-* roles. Accent-* is allowed to shift hue between
 * themes (a theme's "strength" accent might be pink); these stay
 * recognizable as "strength = orange, cardio = blue, skill = violet" no
 * matter which theme is active. Each theme still tunes the exact shade
 * (see the --type-* tokens in globals.css), just not the hue family. */
export const WORKOUT_TYPE_COLOR: Record<WorkoutType, { text: string; bg: string; border: string; ring: string }> = {
  strength: { text: "text-type-strength", bg: "bg-type-strength/14", border: "border-type-strength", ring: "ring-type-strength" },
  cardio: { text: "text-type-cardio", bg: "bg-type-cardio/14", border: "border-type-cardio", ring: "ring-type-cardio" },
  skill: { text: "text-type-skill", bg: "bg-type-skill/14", border: "border-type-skill", ring: "ring-type-skill" },
  manual: { text: "text-type-manual", bg: "bg-surface-2", border: "border-border", ring: "ring-type-manual" },
};

/** Whichever bucket has the most load wins the cell's color; ties/empties
 * fall back to null (rendered as the neutral/manual color). Lives in this
 * client-safe module (not lib/data/dashboard.ts, which is server-only and
 * pulls in the `pg` driver) since the heatmap calls it directly in the
 * browser. */
export function dominantWorkoutType(day: { strengthLoad: number; cardioLoad: number; skillLoad: number }): "strength" | "cardio" | "skill" | null {
  const { strengthLoad, cardioLoad, skillLoad } = day;
  const max = Math.max(strengthLoad, cardioLoad, skillLoad);
  if (max <= 0) return null;
  if (strengthLoad === max) return "strength";
  if (cardioLoad === max) return "cardio";
  return "skill";
}
