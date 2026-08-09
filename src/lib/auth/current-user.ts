import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, profiles, userSettings } from "@/db/schema";
import { SESSION_COOKIE, verifySessionToken } from "./session";

export interface CurrentUser {
  id: string;
  email: string;
  profile: typeof profiles.$inferSelect | null;
  settings: typeof userSettings.$inferSelect;
}

/** Returns the logged-in user (with profile + settings) or null. Safe to call
 * from any Server Component, Route Handler, or Server Action. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const rows = await db
    .select()
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .leftJoin(userSettings, eq(userSettings.userId, users.id))
    .where(eq(users.id, payload.sub))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.users.id,
    email: row.users.email,
    profile: row.profiles,
    settings:
      row.user_settings ?? {
        id: "",
        userId: row.users.id,
        themePreset: "graphite-rust",
        autoRotateTheme: false,
        units: "metric",
        restTimerDefaultSec: 90,
        timezone: "UTC",
        openrouterKeyEncrypted: null,
        openrouterKeyPreview: null,
        preferredAiModel: null,
      },
  };
}

/** Same as getCurrentUser but throws if there's no session — for use inside
 * server actions and route handlers where a missing session is a bug, not
 * a navigable state (pages should redirect instead of throwing). */
export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}
