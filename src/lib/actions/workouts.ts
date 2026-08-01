"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and, or, isNull, desc } from "drizzle-orm";
import { db } from "@/db";
import { workoutSessions, workoutSets, exercises, programExercises, programDays } from "@/db/schema";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { guessTimeOfDay } from "@/lib/time-of-day";

export async function startLiveWorkout(programDayId?: string, programId?: string, timeOfDay?: string, workoutType?: string) {
  const user = await requireCurrentUser();

  // A program day already knows what kind of day it is — no need to ask
  // again, and no risk of it disagreeing with the exercises it pre-loads.
  let resolvedType = workoutType;
  if (programDayId) {
    const [day] = await db.select({ type: programDays.type }).from(programDays).where(eq(programDays.id, programDayId)).limit(1);
    if (day && day.type !== "rest") resolvedType = day.type;
  }

  const [session] = await db
    .insert(workoutSessions)
    .values({
      userId: user.id,
      mode: "live",
      workoutType: resolvedType ?? "manual",
      timeOfDay: timeOfDay ?? guessTimeOfDay(),
      programDayId: programDayId ?? null,
      programId: programId ?? null,
    })
    .returning();

  redirect(`/log/live/${session.id}`);
}

export async function addSet(input: {
  sessionId: string;
  exerciseId: string;
  reps?: number;
  durationSec?: number;
  weightKg?: number;
  rpe?: number;
  isWarmup?: boolean;
  restSec?: number;
  restTakenSec?: number;
}) {
  const user = await requireCurrentUser();

  // Ownership check — a session id alone should never let you write into
  // someone else's log (irrelevant for a single-owner app today, but cheap
  // insurance if this schema is ever reused for more than one account).
  const [session] = await db
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.id, input.sessionId), eq(workoutSessions.userId, user.id)))
    .limit(1);
  if (!session) throw new Error("Session not found");

  const priorSets = await db
    .select()
    .from(workoutSets)
    .where(and(eq(workoutSets.sessionId, input.sessionId), eq(workoutSets.exerciseId, input.exerciseId)));

  const [set] = await db
    .insert(workoutSets)
    .values({
      sessionId: input.sessionId,
      exerciseId: input.exerciseId,
      setNumber: priorSets.length + 1,
      reps: input.reps,
      durationSec: input.durationSec,
      weightKg: input.weightKg,
      rpe: input.rpe,
      isWarmup: input.isWarmup ?? false,
      restSec: input.restSec,
      restTakenSec: input.restTakenSec,
      completedAt: new Date(),
    })
    .returning();

  revalidatePath(`/log/live/${input.sessionId}`);
  return set;
}

export async function deleteSet(setId: string, sessionId: string) {
  await requireCurrentUser();
  await db.delete(workoutSets).where(eq(workoutSets.id, setId));
  revalidatePath(`/log/live/${sessionId}`);
}

export async function finishWorkout(sessionId: string) {
  const user = await requireCurrentUser();
  const [session] = await db
    .update(workoutSessions)
    .set({ finishedAt: new Date() })
    .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, user.id)))
    .returning();

  if (session?.programDayId) {
    await db.update(programDays).set({ completedAt: new Date() }).where(eq(programDays.id, session.programDayId));
  }

  redirect("/dashboard");
}

export async function getActiveLiveSession(userId: string) {
  const rows = await db
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.mode, "live")))
    .orderBy(desc(workoutSessions.createdAt));
  return rows.find((r) => !r.finishedAt) ?? null;
}

export interface LoggedSetInput {
  exerciseId: string;
  reps?: number;
  durationSec?: number;
  weightKg?: number;
  rpe?: number;
  isWarmup?: boolean;
}

export async function createLoggedWorkout(isoDateTime: string, notes: string, sets: LoggedSetInput[], workoutType?: string) {
  const user = await requireCurrentUser();
  if (sets.length === 0) throw new Error("Add at least one set");

  // isoDateTime carries a real instant (built client-side from date+time,
  // then .toISOString()'d) — never a bare date-only string. A bare
  // "YYYY-MM-DD" is parsed by JS as UTC midnight, which is exactly the
  // "shows 5:30am" bug this replaced.
  const when = new Date(isoDateTime);

  await db.transaction(async (tx) => {
    const [session] = await tx
      .insert(workoutSessions)
      .values({
        userId: user.id,
        mode: "logged",
        date: when,
        workoutType: workoutType || null,
        timeOfDay: guessTimeOfDay(when),
        notes: notes || null,
        finishedAt: when,
      })
      .returning();

    const counters = new Map<string, number>();
    for (const s of sets) {
      const n = (counters.get(s.exerciseId) ?? 0) + 1;
      counters.set(s.exerciseId, n);
      await tx.insert(workoutSets).values({
        sessionId: session.id,
        exerciseId: s.exerciseId,
        setNumber: n,
        reps: s.reps,
        durationSec: s.durationSec,
        weightKg: s.weightKg,
        rpe: s.rpe,
        isWarmup: s.isWarmup ?? false,
        completedAt: when,
      });
    }
  });

  redirect("/dashboard");
}

export async function addCustomExercise(name: string, category: string, equipment: string, trackingType: string = "reps") {
  const user = await requireCurrentUser();
  const [ex] = await db
    .insert(exercises)
    .values({ name, category, equipment, trackingType, isCustom: true, userId: user.id })
    .returning();
  revalidatePath("/exercises");
  revalidatePath("/log");
  return ex;
}

export async function updateExercise(id: string, name: string, category: string, equipment: string, trackingType: string = "reps") {
  const user = await requireCurrentUser();
  // This is a single-owner app, so there's no real distinction between
  // "your custom exercise" and "the shared catalog" from a permissions
  // standpoint — both belong to the one account that exists. Any
  // exercise can be edited; the isCustom flag itself is left untouched
  // (it's just a provenance label, not a lock).
  await db
    .update(exercises)
    .set({ name, category, equipment, trackingType })
    .where(and(eq(exercises.id, id), or(eq(exercises.userId, user.id), isNull(exercises.userId))));
  revalidatePath("/exercises");
  revalidatePath("/log");
}

export async function deleteExercise(id: string): Promise<{ error?: string }> {
  const user = await requireCurrentUser();

  const [usedInSet] = await db.select({ id: workoutSets.id }).from(workoutSets).where(eq(workoutSets.exerciseId, id)).limit(1);
  if (usedInSet) {
    return { error: "Can't delete — this exercise has logged sets. Remove those from History first, or just stop using it going forward." };
  }
  const [usedInProgram] = await db
    .select({ id: programExercises.id })
    .from(programExercises)
    .where(eq(programExercises.exerciseId, id))
    .limit(1);
  if (usedInProgram) {
    return { error: "Can't delete — this exercise is used in a saved program. Remove it from that program first." };
  }

  await db.delete(exercises).where(and(eq(exercises.id, id), or(eq(exercises.userId, user.id), isNull(exercises.userId))));
  revalidatePath("/exercises");
  revalidatePath("/log");
  return {};
}
