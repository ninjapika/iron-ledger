"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq, count } from "drizzle-orm";
import { db } from "@/db";
import { users, profiles, userSettings, sessions } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  SESSION_COOKIE,
  signSessionToken,
  sessionCookieMaxAgeSeconds,
} from "@/lib/auth/session";
import { signUpSchema, logInSchema } from "@/lib/validators/auth";
import { parsePlatesInput } from "@/lib/plates";
import { createHash } from "crypto";

export interface ActionResult {
  error?: string;
}

function parsePlates(raw: string | undefined): string | null {
  if (!raw) return null;
  const plates = parsePlatesInput(raw);
  return plates.length ? JSON.stringify(plates) : null;
}

async function establishSession(userId: string) {
  const token = await signSessionToken(userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionCookieMaxAgeSeconds(),
  });

  // Audit-trail row only — not required for the cookie to remain valid, but
  // gives a foundation for a future "sign out other devices" feature.
  await db.insert(sessions).values({
    userId,
    tokenHash: createHash("sha256").update(token).digest("hex"),
    expiresAt: new Date(Date.now() + sessionCookieMaxAgeSeconds() * 1000),
  });
}

export async function signUp(formData: FormData): Promise<ActionResult> {
  // This is a private, single-owner tracker: signup locks itself after the
  // first account so a leaked URL can't be used to register a second user.
  const [{ value: existing }] = await db.select({ value: count() }).from(users);
  if (existing > 0) {
    return { error: "This instance already has an owner. Sign in instead." };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }
  const data = parsed.data;

  const emailTaken = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
  if (emailTaken.length > 0) {
    return { error: "That email is already registered." };
  }

  const passwordHash = await hashPassword(data.password);

  const userId = await db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({ email: data.email, passwordHash }).returning();

    await tx.insert(profiles).values({
      userId: user.id,
      displayName: data.displayName,
      age: data.age,
      heightCm: data.heightCm,
      startingWeightKg: data.startingWeightKg,
      goal: data.goal,
      experienceLevel: data.experienceLevel,
      dumbbellMinKg: data.dumbbellMinKg,
      dumbbellMaxKg: data.dumbbellMaxKg,
      dumbbellStepKg: data.dumbbellStepKg ?? 2.5,
      barbellWeightKg: data.barbellWeightKg,
      availablePlatesKg: parsePlates(data.availablePlatesKg),
      ezBarWeightKg: data.ezBarWeightKg,
      bandMinKg: data.bandMinKg,
      bandMaxKg: data.bandMaxKg,
    });

    await tx.insert(userSettings).values({ userId: user.id });

    return user.id;
  });

  await establishSession(userId);
  redirect("/dashboard");
}

export async function logIn(formData: FormData): Promise<ActionResult> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = logInSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  }

  const rows = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  const user = rows[0];
  if (!user) {
    return { error: "Incorrect email or password." };
  }

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    return { error: "Incorrect email or password." };
  }

  await establishSession(user.id);
  redirect("/dashboard");
}

export async function logOut() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
