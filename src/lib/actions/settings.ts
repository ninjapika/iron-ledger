"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles, userSettings, users } from "@/db/schema";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { isValidTheme } from "@/lib/theme";
import { parsePlatesInput } from "@/lib/plates";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

export async function updateProfileAndEquipment(formData: FormData): Promise<ActionResult> {
  const user = await requireCurrentUser();
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;

  const num = (v: string) => (v ? Number(v) : null);
  const plates = raw.availablePlatesKg ? JSON.stringify(parsePlatesInput(raw.availablePlatesKg)) : null;

  await db
    .update(profiles)
    .set({
      displayName: raw.displayName || null,
      age: num(raw.age),
      heightCm: num(raw.heightCm),
      startingWeightKg: num(raw.startingWeightKg),
      goal: raw.goal || null,
      experienceLevel: raw.experienceLevel || null,
      dumbbellMinKg: num(raw.dumbbellMinKg),
      dumbbellMaxKg: num(raw.dumbbellMaxKg),
      dumbbellStepKg: num(raw.dumbbellStepKg) ?? 2.5,
      barbellWeightKg: num(raw.barbellWeightKg),
      availablePlatesKg: plates,
      ezBarWeightKg: num(raw.ezBarWeightKg),
      bandMinKg: num(raw.bandMinKg),
      bandMaxKg: num(raw.bandMaxKg),
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, user.id));

  revalidatePath("/settings");
  return { success: true };
}

export async function syncTimezone(timezone: string) {
  const user = await requireCurrentUser();
  if (!timezone || timezone === user.settings.timezone) return; // already correct, skip the write
  await db.update(userSettings).set({ timezone }).where(eq(userSettings.userId, user.id));
  revalidatePath("/", "layout");
}

export async function updateThemeSettings(themePreset: string, autoRotateTheme: boolean) {
  const user = await requireCurrentUser();
  if (!isValidTheme(themePreset)) throw new Error("Unknown theme");

  await db
    .update(userSettings)
    .set({ themePreset, autoRotateTheme })
    .where(eq(userSettings.userId, user.id));

  revalidatePath("/", "layout");
}

export async function changePassword(formData: FormData): Promise<ActionResult> {
  const user = await requireCurrentUser();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }

  const [row] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const ok = await verifyPassword(currentPassword, row.passwordHash);
  if (!ok) return { error: "Current password is incorrect." };

  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));

  return { success: true };
}

export async function exportAllDataAsJson(): Promise<string> {
  const user = await requireCurrentUser();
  const { workoutSessions, workoutSets, cardioSessions, bodyMetrics, programs, programDays, programExercises } =
    await import("@/db/schema");

  const [sessions, sets, cardio, body, progs, days, progExercises] = await Promise.all([
    db.select().from(workoutSessions).where(eq(workoutSessions.userId, user.id)),
    db
      .select()
      .from(workoutSets)
      .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
      .where(eq(workoutSessions.userId, user.id)),
    db.select().from(cardioSessions).where(eq(cardioSessions.userId, user.id)),
    db.select().from(bodyMetrics).where(eq(bodyMetrics.userId, user.id)),
    db.select().from(programs).where(eq(programs.userId, user.id)),
    db
      .select({ day: programDays })
      .from(programDays)
      .innerJoin(programs, eq(programDays.programId, programs.id))
      .where(eq(programs.userId, user.id)),
    db
      .select({ item: programExercises })
      .from(programExercises)
      .innerJoin(programDays, eq(programExercises.dayId, programDays.id))
      .innerJoin(programs, eq(programDays.programId, programs.id))
      .where(eq(programs.userId, user.id)),
  ]);

  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      profile: user.profile,
      workoutSessions: sessions,
      workoutSets: sets.map((s) => s.workout_sets),
      cardioSessions: cardio,
      bodyMetrics: body,
      programs: progs,
      programDays: days.map((d) => d.day),
      programExercises: progExercises.map((e) => e.item),
    },
    null,
    2
  );
}
