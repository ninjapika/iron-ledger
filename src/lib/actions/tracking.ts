"use server";

import { revalidatePath } from "next/cache";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { cardioSessions, bodyMetrics } from "@/db/schema";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { paceSecPerKm } from "@/lib/format";
import { guessTimeOfDay } from "@/lib/time-of-day";

export async function logCardioSession(input: {
  isoDateTime: string;
  type: string;
  distanceKm?: number;
  durationSec?: number;
  notes?: string;
  programId?: string;
}) {
  const user = await requireCurrentUser();
  const when = new Date(input.isoDateTime);
  const avgPaceSecKm =
    input.distanceKm && input.durationSec ? paceSecPerKm(input.distanceKm, input.durationSec) : null;

  await db.insert(cardioSessions).values({
    userId: user.id,
    date: when,
    type: input.type,
    timeOfDay: guessTimeOfDay(when, user.settings.timezone),
    distanceKm: input.distanceKm,
    durationSec: input.durationSec,
    avgPaceSecKm,
    notes: input.notes || null,
    programId: input.programId || null,
  });

  revalidatePath("/cardio");
  revalidatePath("/dashboard");
}

export async function deleteCardioSession(id: string) {
  const user = await requireCurrentUser();
  await db.delete(cardioSessions).where(and(eq(cardioSessions.id, id), eq(cardioSessions.userId, user.id)));
  revalidatePath("/cardio");
  revalidatePath("/dashboard");
}

export async function getCardioHistory(userId: string, limit = 30) {
  return db
    .select()
    .from(cardioSessions)
    .where(eq(cardioSessions.userId, userId))
    .orderBy(desc(cardioSessions.date))
    .limit(limit);
}

export async function logBodyMetric(input: {
  date: string;
  weightKg?: number;
  measurements?: Record<string, number>;
}) {
  const user = await requireCurrentUser();
  await db.insert(bodyMetrics).values({
    userId: user.id,
    date: new Date(input.date),
    weightKg: input.weightKg,
    measurements: input.measurements ? JSON.stringify(input.measurements) : null,
  });
  revalidatePath("/body");
  revalidatePath("/dashboard");
}

export async function deleteBodyMetric(id: string) {
  const user = await requireCurrentUser();
  await db.delete(bodyMetrics).where(and(eq(bodyMetrics.id, id), eq(bodyMetrics.userId, user.id)));
  revalidatePath("/body");
  revalidatePath("/dashboard");
}

export async function getBodyMetricHistory(userId: string, limit = 30) {
  return db
    .select()
    .from(bodyMetrics)
    .where(eq(bodyMetrics.userId, userId))
    .orderBy(desc(bodyMetrics.date))
    .limit(limit);
}
