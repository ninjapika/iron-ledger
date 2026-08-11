"use server";

import { revalidatePath } from "next/cache";
import { and, eq, desc, asc } from "drizzle-orm";
import { db } from "@/db";
import { workoutSessions, workoutSets, exercises, cardioSessions, programs, programDays } from "@/db/schema";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { dateKeyInTZ } from "@/lib/tz";

export interface HistoryEntry {
  id: string;
  kind: "strength" | "cardio";
  date: Date;
  dateKey: string;
  timeOfDay: string | null;
  workoutType: string | null;
  summary: string;
  title: string;
}

/** Combined, chronological strength + cardio history for the list view.
 * A session started from a program day shows the program's name as the
 * headline, not the raw exercise list — the exercises still show as the
 * summary line underneath. */
export async function getWorkoutHistory(userId: string, timezone: string, limit = 60): Promise<HistoryEntry[]> {
  const [sessions, cardio] = await Promise.all([
    db
      .select({
        id: workoutSessions.id,
        date: workoutSessions.date,
        mode: workoutSessions.mode,
        timeOfDay: workoutSessions.timeOfDay,
        workoutType: workoutSessions.workoutType,
        programDayId: workoutSessions.programDayId,
        dayTitle: programDays.title,
        dayIndex: programDays.dayIndex,
        programName: programs.name,
      })
      .from(workoutSessions)
      .leftJoin(programDays, eq(workoutSessions.programDayId, programDays.id))
      .leftJoin(programs, eq(programDays.programId, programs.id))
      .where(eq(workoutSessions.userId, userId))
      .orderBy(desc(workoutSessions.date))
      .limit(limit),
    db
      .select()
      .from(cardioSessions)
      .where(eq(cardioSessions.userId, userId))
      .orderBy(desc(cardioSessions.date))
      .limit(limit),
  ]);

  const strengthEntries: HistoryEntry[] = await Promise.all(
    sessions.map(async (s) => {
      const sets = await db
        .select({ exerciseName: exercises.name })
        .from(workoutSets)
        .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
        .where(eq(workoutSets.sessionId, s.id));
      const names = [...new Set(sets.map((x) => x.exerciseName))];
      const exerciseSummary = names.length
        ? `${names.slice(0, 3).join(", ")}${names.length > 3 ? "…" : ""} · ${sets.length} sets`
        : "No sets logged";

      return {
        id: s.id,
        kind: "strength" as const,
        date: s.date,
        dateKey: dateKeyInTZ(s.date, timezone),
        timeOfDay: s.timeOfDay,
        workoutType: s.workoutType,
        title: s.programName ? `${s.programName} — ${s.dayTitle ?? `Day ${s.dayIndex}`}` : exerciseSummary,
        summary: s.programName ? exerciseSummary : "",
      };
    })
  );

  const cardioEntries: HistoryEntry[] = cardio.map((c) => ({
    id: c.id,
    kind: "cardio" as const,
    date: c.date,
    dateKey: dateKeyInTZ(c.date, timezone),
    timeOfDay: c.timeOfDay,
    workoutType: "cardio",
    title: c.type.replace("_", " "),
    summary: c.distanceKm ? `${c.distanceKm} km` : "",
  }));

  return [...strengthEntries, ...cardioEntries].sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function getSessionDetail(userId: string, sessionId: string) {
  const [session] = await db
    .select({
      session: workoutSessions,
      dayTitle: programDays.title,
      dayIndex: programDays.dayIndex,
      programName: programs.name,
    })
    .from(workoutSessions)
    .leftJoin(programDays, eq(workoutSessions.programDayId, programDays.id))
    .leftJoin(programs, eq(programDays.programId, programs.id))
    .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)))
    .limit(1);
  if (!session) return null;

  const sets = await db
    .select({ set: workoutSets, exerciseName: exercises.name, equipment: exercises.equipment, trackingType: exercises.trackingType })
    .from(workoutSets)
    .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
    .where(eq(workoutSets.sessionId, sessionId))
    .orderBy(asc(workoutSets.setNumber));

  return {
    session: session.session,
    programContext: session.programName ? { programName: session.programName, dayTitle: session.dayTitle ?? `Day ${session.dayIndex}` } : null,
    sets: sets.map((s) => ({ ...s.set, exerciseName: s.exerciseName, equipment: s.equipment, trackingType: s.trackingType })),
  };
}

export async function updateSet(setId: string, patch: { reps?: number; durationSec?: number; weightKg?: number; rpe?: number; isWarmup?: boolean }) {
  await requireCurrentUser();
  await db.update(workoutSets).set(patch).where(eq(workoutSets.id, setId));
  revalidatePath("/history");
}

/** Adds one set for an exercise within an already-logged session — used
 * both to add a brand-new exercise to the session (its first set) and to
 * add another set to one that's already there; the two are the same
 * operation from the DB's point of view, just with a different starting
 * setNumber. Fields are left blank/null when not supplied, same as a
 * freshly-added row anywhere else in the app — they're filled in via the
 * existing per-cell inputs afterward. */
export async function addHistorySet(
  sessionId: string,
  exerciseId: string,
  input: { reps?: number; durationSec?: number; weightKg?: number; isWarmup?: boolean } = {}
) {
  const user = await requireCurrentUser();

  const [session] = await db
    .select({ id: workoutSessions.id })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, user.id)))
    .limit(1);
  if (!session) throw new Error("Workout not found.");

  const [lastSet] = await db
    .select({ setNumber: workoutSets.setNumber })
    .from(workoutSets)
    .where(and(eq(workoutSets.sessionId, sessionId), eq(workoutSets.exerciseId, exerciseId)))
    .orderBy(desc(workoutSets.setNumber))
    .limit(1);

  await db.insert(workoutSets).values({
    sessionId,
    exerciseId,
    setNumber: (lastSet?.setNumber ?? 0) + 1,
    reps: input.reps,
    durationSec: input.durationSec,
    weightKg: input.weightKg,
    isWarmup: input.isWarmup ?? false,
  });

  revalidatePath(`/history/${sessionId}`);
  revalidatePath("/history");
}

export async function deleteHistorySet(setId: string, sessionId: string) {
  await requireCurrentUser();
  await db.delete(workoutSets).where(eq(workoutSets.id, setId));
  revalidatePath(`/history/${sessionId}`);
  revalidatePath("/history");
}

export async function updateSessionNotes(sessionId: string, notes: string) {
  const user = await requireCurrentUser();
  await db
    .update(workoutSessions)
    .set({ notes: notes || null })
    .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, user.id)));
  revalidatePath(`/history/${sessionId}`);
}

export async function deleteWorkoutSession(sessionId: string) {
  const user = await requireCurrentUser();
  await db
    .delete(workoutSessions)
    .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, user.id)));
  revalidatePath("/history");
}

/** Only exercises this user has actually logged at least once — the
 * picker for the progress tracker shouldn't show the whole catalog. */
export async function getLoggedExercises(userId: string) {
  const rows = await db
    .selectDistinct({ id: exercises.id, name: exercises.name, equipment: exercises.equipment, trackingType: exercises.trackingType })
    .from(workoutSets)
    .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
    .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
    .where(eq(workoutSessions.userId, userId))
    .orderBy(asc(exercises.name));
  return rows;
}

/** Full logged history for one exercise — the per-exercise progress view.
 * Derives the user from the session rather than accepting a userId param,
 * since this is called directly from a client component picker. */
export async function getExerciseProgress(exerciseId: string) {
  const user = await requireCurrentUser();
  const rows = await db
    .select({ set: workoutSets, date: workoutSessions.date })
    .from(workoutSets)
    .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
    .where(and(eq(workoutSessions.userId, user.id), eq(workoutSets.exerciseId, exerciseId)))
    .orderBy(asc(workoutSessions.date));

  return rows.map((r) => ({ ...r.set, date: r.date }));
}
