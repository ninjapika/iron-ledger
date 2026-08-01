import "server-only";
import { or, isNull, eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { exercises } from "@/db/schema";

export async function getExerciseCatalog(userId: string) {
  return db
    .select()
    .from(exercises)
    .where(or(isNull(exercises.userId), eq(exercises.userId, userId)))
    .orderBy(asc(exercises.category), asc(exercises.name));
}
