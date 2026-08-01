import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getProgramWithDays } from "@/lib/actions/programs";
import { getExerciseCatalog } from "@/lib/data/exercises";
import { CustomProgramBuilder } from "@/components/programs/custom-program-builder";

export default async function EditProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireCurrentUser();
  const program = await getProgramWithDays(user.id, id);
  if (!program) notFound();
  // DAREBEE imports can include freeText exercises with no catalog match —
  // the custom builder's exercise picker has nothing to show for those, so
  // editing here is only offered for programs built with it in the first
  // place.
  if (program.source !== "custom") notFound();

  const catalog = await getExerciseCatalog(user.id);
  const options = catalog.map((e) => ({
    id: e.id,
    name: e.name,
    category: e.category,
    equipment: e.equipment,
    trackingType: e.trackingType,
  }));

  const initialDays = program.days.map((day) => ({
    id: day.id,
    title: day.title ?? "",
    type: day.type as "strength" | "cardio" | "skill" | "rest",
    exercises: day.exercises
      .filter((ex) => ex.catalogExercise) // every custom-built exercise has one; this just satisfies the type
      .map((ex) => ({
        exercise: {
          id: ex.catalogExercise!.id,
          name: ex.catalogExercise!.name,
          category: ex.catalogExercise!.category,
          equipment: ex.catalogExercise!.equipment,
          trackingType: ex.catalogExercise!.trackingType,
        },
        sets: ex.sets?.toString() ?? "",
        reps: ex.reps ?? "",
        durationSec: ex.durationSec?.toString() ?? "",
        restSec: ex.restSec?.toString() ?? "",
      })),
  }));

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl uppercase tracking-wide">Edit Program</h1>
      <CustomProgramBuilder
        exercises={options}
        programId={program.id}
        initialName={program.name}
        initialDescription={program.description ?? ""}
        initialDays={initialDays}
      />
    </div>
  );
}
