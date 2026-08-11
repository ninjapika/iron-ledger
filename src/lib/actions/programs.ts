"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db";
import { programs, programDays, programExercises, exercises } from "@/db/schema";
import { requireCurrentUser } from "@/lib/auth/current-user";

export interface CustomDayInput {
  /** Present when editing an existing day (matches it up for an in-place
   * update instead of delete+recreate, so workout history that points at
   * it via workoutSessions.programDayId stays valid). Omitted for a
   * brand-new day. */
  id?: string;
  dayIndex: number;
  title: string;
  type: "strength" | "cardio" | "skill" | "rest";
  exercises: { exerciseId: string; sets?: number; reps?: string; durationSec?: number; restSec?: number }[];
}

export async function createCustomProgram(name: string, description: string, days: CustomDayInput[]) {
  const programId = await insertCustomProgram(name, description, days);
  redirect(`/programs/${programId}`);
}

/** The actual DB work behind createCustomProgram, without the redirect —
 * shared by the form action above and the AI agent's create_program tool
 * (lib/ai/agent.ts). Returns the new program's id. */
export async function insertCustomProgram(name: string, description: string, days: CustomDayInput[]): Promise<string> {
  const user = await requireCurrentUser();

  return db.transaction(async (tx) => {
    const [program] = await tx
      .insert(programs)
      .values({ userId: user.id, name, description, source: "custom" })
      .returning();

    for (const day of days) {
      const [d] = await tx
        .insert(programDays)
        .values({ programId: program.id, dayIndex: day.dayIndex, title: day.title, type: day.type })
        .returning();

      for (const [i, ex] of day.exercises.entries()) {
        await tx.insert(programExercises).values({
          dayId: d.id,
          exerciseId: ex.exerciseId,
          sets: ex.sets,
          reps: ex.reps,
          durationSec: ex.durationSec,
          restSec: ex.restSec,
          orderIndex: i,
        });
      }
    }
    return program.id;
  });
}

/** Edits an existing custom program's name/description and its days'
 * exercises. Days are matched by id and updated in place — never
 * deleted-and-recreated — because workoutSessions.programDayId points at a
 * specific day row, and losing that would break past history. A day with
 * no id is a new one and gets inserted. A previously-existing day that's
 * missing from the submitted list is a genuine removal; that's only safe
 * when nothing references it yet, so a day with history attached throws a
 * clear error instead of silently failing the delete.
 *
 * Exercises within a day have no such history dependency (a live session
 * only reads them once, at start, to prefill itself — it doesn't keep
 * pointing at the row afterward), so those are simply cleared and
 * re-inserted fresh every time, which trivially handles add/remove/reorder
 * without needing to diff anything. */
export async function updateCustomProgram(programId: string, name: string, description: string, days: CustomDayInput[]) {
  await applyCustomProgramUpdate(programId, name, description, days);
  revalidatePath(`/programs/${programId}`);
  redirect(`/programs/${programId}`);
}

/** The actual DB work behind updateCustomProgram, without the redirect —
 * shared by the form action above and the AI agent's update_program tool
 * (lib/ai/agent.ts). */
export async function applyCustomProgramUpdate(programId: string, name: string, description: string, days: CustomDayInput[]) {
  const user = await requireCurrentUser();

  const [program] = await db
    .select()
    .from(programs)
    .where(and(eq(programs.id, programId), eq(programs.userId, user.id)))
    .limit(1);
  if (!program) throw new Error("Program not found.");
  if (program.source !== "custom") throw new Error("Only custom programs can be edited this way.");

  await db.transaction(async (tx) => {
    await tx.update(programs).set({ name, description }).where(eq(programs.id, programId));

    const existingDays = await tx.select().from(programDays).where(eq(programDays.programId, programId));
    const keptDayIds = new Set(days.filter((d) => d.id).map((d) => d.id!));

    for (const existing of existingDays) {
      if (keptDayIds.has(existing.id)) continue;
      try {
        await tx.delete(programDays).where(eq(programDays.id, existing.id));
      } catch {
        throw new Error(
          `Couldn't remove "${existing.title || "a day"}" — it has past workout history attached. Leave it in the editor (you can still change its exercises) instead of deleting it, then save again.`
        );
      }
    }

    for (const [i, day] of days.entries()) {
      let dayId = day.id;
      if (dayId) {
        await tx.update(programDays).set({ dayIndex: i + 1, title: day.title, type: day.type }).where(eq(programDays.id, dayId));
        await tx.delete(programExercises).where(eq(programExercises.dayId, dayId));
      } else {
        const [d] = await tx.insert(programDays).values({ programId, dayIndex: i + 1, title: day.title, type: day.type }).returning();
        dayId = d.id;
      }

      for (const [j, ex] of day.exercises.entries()) {
        await tx.insert(programExercises).values({
          dayId,
          exerciseId: ex.exerciseId,
          sets: ex.sets,
          reps: ex.reps,
          durationSec: ex.durationSec,
          restSec: ex.restSec,
          orderIndex: j,
        });
      }
    }
  });
}

export async function archiveProgram(id: string) {
  const user = await requireCurrentUser();
  await db
    .update(programs)
    .set({ archived: true })
    .where(and(eq(programs.id, id), eq(programs.userId, user.id)));
  revalidatePath("/programs");
  redirect("/programs");
}

/** Clears the "completed" marker on every day in this program so it can be
 * run again from scratch. Deliberately does NOT touch any actual logged
 * workout sessions or sets — those stay in History exactly as they were;
 * this only resets the visual progress indicator on the program itself. */
export async function resetProgramProgress(programId: string) {
  const user = await requireCurrentUser();
  const [program] = await db.select().from(programs).where(and(eq(programs.id, programId), eq(programs.userId, user.id))).limit(1);
  if (!program) return;

  await db.update(programDays).set({ completedAt: null }).where(eq(programDays.programId, programId));
  revalidatePath(`/programs/${programId}`);
}

export async function getPrograms(userId: string) {
  return db
    .select()
    .from(programs)
    .where(and(eq(programs.userId, userId), eq(programs.archived, false)))
    .orderBy(asc(programs.createdAt));
}

export async function getProgramWithDays(userId: string, programId: string) {
  const [program] = await db
    .select()
    .from(programs)
    .where(and(eq(programs.id, programId), eq(programs.userId, userId)))
    .limit(1);
  if (!program) return null;

  const days = await db
    .select()
    .from(programDays)
    .where(eq(programDays.programId, programId))
    .orderBy(asc(programDays.dayIndex));

  const daysWithExercises = await Promise.all(
    days.map(async (day) => {
      const rows = await db
        .select({ item: programExercises, exercise: exercises })
        .from(programExercises)
        .leftJoin(exercises, eq(programExercises.exerciseId, exercises.id))
        .where(eq(programExercises.dayId, day.id))
        .orderBy(asc(programExercises.orderIndex));

      return {
        ...day,
        exercises: rows.map((r) => ({
          ...r.item,
          displayName: r.exercise?.name ?? r.item.freeText ?? "Exercise",
          catalogExercise: r.exercise, // full exercise row, or null for freeText-only entries from an already-imported legacy program
        })),
      };
    })
  );

  return { ...program, days: daysWithExercises };
}

/** A single day's exercises, joined with the real catalog exercise info
 * needed to start a live workout from it (name/equipment/trackingType).
 * Rows with no matched exerciseId (freeText-only, from an already-imported
 * legacy program) are returned separately so the caller can tell the user
 * those need to be added manually. */
export async function getProgramDayForWorkout(dayId: string) {
  const rows = await db
    .select({ item: programExercises, exercise: exercises })
    .from(programExercises)
    .leftJoin(exercises, eq(programExercises.exerciseId, exercises.id))
    .where(eq(programExercises.dayId, dayId))
    .orderBy(asc(programExercises.orderIndex));

  const matched = rows
    .filter((r) => r.exercise)
    .map((r) => ({
      exerciseId: r.exercise!.id,
      name: r.exercise!.name,
      equipment: r.exercise!.equipment,
      category: r.exercise!.category,
      trackingType: r.exercise!.trackingType,
      targetSets: r.item.sets,
      targetReps: r.item.reps,
      targetDurationSec: r.item.durationSec,
      targetRounds: r.item.rounds,
      restSec: r.item.restSec,
    }));

  const unmatchedNames = rows.filter((r) => !r.exercise).map((r) => r.item.freeText ?? "an exercise");

  return { matched, unmatchedNames };
}
