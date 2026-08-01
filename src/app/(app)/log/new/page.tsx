import { requireCurrentUser } from "@/lib/auth/current-user";
import { getExerciseCatalog } from "@/lib/data/exercises";
import { LoggedWorkoutForm } from "@/components/workout/logged-workout-form";

export default async function NewLoggedWorkoutPage() {
  const user = await requireCurrentUser();
  const catalog = await getExerciseCatalog(user.id);
  const exerciseOptions = catalog
    .filter((e) => e.equipment !== "cardio")
    .map((e) => ({ id: e.id, name: e.name, category: e.category, equipment: e.equipment, trackingType: e.trackingType }));

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl uppercase tracking-wide">Log a Completed Workout</h1>
      <LoggedWorkoutForm exercises={exerciseOptions} />
    </div>
  );
}
