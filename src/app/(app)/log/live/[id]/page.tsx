import { notFound, redirect } from "next/navigation";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db";
import { workoutSessions, workoutSets, programs, programDays } from "@/db/schema";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getExerciseCatalog } from "@/lib/data/exercises";
import { getProgramDayForWorkout } from "@/lib/actions/programs";
import { LiveSessionClient, type SetRow } from "@/components/workout/live-session-client";
import { categoriesForWorkoutType } from "@/lib/data/exercise-labels";

export default async function LiveWorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireCurrentUser();

  const [session] = await db
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.id, id), eq(workoutSessions.userId, user.id)))
    .limit(1);

  if (!session) notFound();
  if (session.finishedAt) redirect("/dashboard");

  const [sets, catalog] = await Promise.all([
    db
      .select()
      .from(workoutSets)
      .where(eq(workoutSets.sessionId, id))
      .orderBy(asc(workoutSets.setNumber)),
    getExerciseCatalog(user.id),
  ]);

  const initialSets: SetRow[] = sets.map((s) => ({
    id: s.id,
    exerciseId: s.exerciseId,
    setNumber: s.setNumber,
    reps: s.reps,
    durationSec: s.durationSec,
    weightKg: s.weightKg,
    rpe: s.rpe,
    isWarmup: s.isWarmup,
  }));

  // Full catalog, unfiltered — this resolves an exercise card for ANY id
  // that's already active in the session (prefilled from a program day, or
  // already logged), regardless of its equipment tag. Filtering this list
  // used to make cardio-equipment prefills (e.g. a program day built around
  // Cycling or Outdoor Run) vanish silently: the id stayed in activeIds,
  // but the lookup came back empty so the card just never rendered — no
  // error, no placeholder, nothing.
  const allExerciseOptions = catalog.map((e) => ({
    id: e.id,
    name: e.name,
    category: e.category,
    equipment: e.equipment,
    trackingType: e.trackingType,
    defaultRestSec: e.defaultRestSec,
  }));

  // Filtered list for the ad-hoc "add an exercise" picker only — pure
  // distance cardio (Running, Cycling) is steered to the Running page
  // instead when added fresh, but that's just about what you can ADD, not
  // about what's allowed to display once it's already part of the day.
  const pickerOptions = allExerciseOptions.filter((e) => e.equipment !== "cardio");

  // Pre-populate from the program day this session was started from, if any.
  let programContext: { programName: string; dayTitle: string } | null = null;
  let prefill: Awaited<ReturnType<typeof getProgramDayForWorkout>>["matched"] = [];
  let unmatchedNames: string[] = [];
  if (session.programDayId) {
    const [day] = await db.select().from(programDays).where(eq(programDays.id, session.programDayId)).limit(1);
    if (day) {
      const [program] = await db.select().from(programs).where(eq(programs.id, day.programId)).limit(1);
      const { matched, unmatchedNames: unmatched } = await getProgramDayForWorkout(day.id);
      prefill = matched;
      unmatchedNames = unmatched;
      if (program) programContext = { programName: program.name, dayTitle: day.title ?? `Day ${day.dayIndex}` };
    }
  }

  return (
    <LiveSessionClient
      key={session.id}
      sessionId={session.id}
      createdAt={session.createdAt.toISOString()}
      exercises={allExerciseOptions}
      pickerExercises={pickerOptions}
      initialSets={initialSets}
      allowedCategories={categoriesForWorkoutType(session.workoutType ?? "manual")}
      programContext={programContext}
      prefillExercises={prefill}
      unmatchedNames={unmatchedNames}
      equipmentDefaults={{
        dumbbellStepKg: user.profile?.dumbbellStepKg ?? 2.5,
        dumbbellMinKg: user.profile?.dumbbellMinKg ?? null,
        barbellWeightKg: user.profile?.barbellWeightKg ?? null,
        ezBarWeightKg: user.profile?.ezBarWeightKg ?? null,
        bandMinKg: user.profile?.bandMinKg ?? null,
      }}
    />
  );
}
