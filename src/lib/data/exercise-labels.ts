export const EQUIPMENT_LABELS: Record<string, string> = {
  dumbbell: "Dumbbell",
  barbell: "Barbell",
  ez_bar: "EZ Curl Bar",
  band: "Resistance Band",
  bodyweight: "Bodyweight",
  cardio: "Cardio",
};

export const CATEGORY_LABELS: Record<string, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  core: "Core",
  full_body: "Full Body",
  cardio: "Cardio",
  skill: "Skill",
};

/** The four session types a workout can be logged as. "manual" shows the
 * full catalog with no filtering — everything else narrows the exercise
 * picker to the matching category (cardio-tagged bodyweight moves like
 * Burpees or High Knees included, since they're categorized "cardio"
 * regardless of equipment). */
export const WORKOUT_TYPE_LABELS: Record<string, string> = {
  strength: "Strength",
  cardio: "Cardio",
  skill: "Skill",
  manual: "Manual / Mixed",
};

export function categoriesForWorkoutType(workoutType: string): string[] | null {
  switch (workoutType) {
    case "strength":
      return ["push", "pull", "legs", "core", "full_body"];
    case "cardio":
      return ["cardio"];
    case "skill":
      return ["skill"];
    default:
      return null; // manual — no filtering
  }
}
