import { hashPassword, verifyPassword } from "../src/lib/auth/password";
import { signSessionToken, verifySessionToken } from "../src/lib/auth/session";
import { estimate1RM, formatPace, formatDuration, formatKg } from "../src/lib/format";
import { dateKeyInTZ, mondayOfWeekKey, addDaysToKey } from "../src/lib/tz";
import { parsePlatesInput, achievableBarLoads } from "../src/lib/plates";
import { db } from "../src/db";
import {
  users,
  profiles,
  userSettings,
  exercises,
  workoutSessions,
  workoutSets,
  cardioSessions,
  bodyMetrics,
  programs,
  programDays,
  programExercises,
} from "../src/db/schema";
import { eq } from "drizzle-orm";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function main() {
  console.log("Password hashing:");
  const hash = await hashPassword("correct-horse-battery-staple");
  assert(await verifyPassword("correct-horse-battery-staple", hash), "correct password verifies");
  assert(!(await verifyPassword("wrong-password", hash)), "wrong password rejected");

  console.log("Session JWT:");
  const token = await signSessionToken("user_test_123", 30);
  const payload = await verifySessionToken(token);
  assert(payload?.sub === "user_test_123", "signed token round-trips userId");
  assert((await verifySessionToken("garbage.token.value")) === null, "malformed token rejected");
  assert((await verifySessionToken(token + "x")) === null, "tampered token rejected");

  console.log("Training math:");
  assert(Math.round(estimate1RM(100, 5)) === 117, `estimate1RM(100,5) ≈ 117, got ${estimate1RM(100, 5)}`);
  assert(estimate1RM(100, 1) === 100, "estimate1RM(100,1) === weight itself");
  assert(formatPace(300) === "5:00/km", `formatPace(300) === '5:00/km', got ${formatPace(300)}`);
  assert(formatDuration(90) === "1:30", `formatDuration(90) === '1:30', got ${formatDuration(90)}`);
  assert(formatKg(80.567) === "80.6 kg", `formatKg rounds to 1dp, got ${formatKg(80.567)}`);

  console.log("Timezone-safe calendar math (the heatmap/weekly-volume bug fix):");
  // A UTC instant that's already "tomorrow" in a timezone ahead of UTC —
  // this is exactly the scenario that broke before the tz.ts rewrite.
  const lateUTC = new Date("2026-07-25T20:30:00.000Z"); // 8:30pm UTC July 25
  const keyInKolkata = dateKeyInTZ(lateUTC, "Asia/Kolkata"); // +5:30 -> 2:00am July 26 IST
  assert(keyInKolkata === "2026-07-26", `dateKeyInTZ crosses midnight correctly in IST, got ${keyInKolkata}`);
  const keyInUTC = dateKeyInTZ(lateUTC, "UTC");
  assert(keyInUTC === "2026-07-25", `dateKeyInTZ stays put in UTC, got ${keyInUTC}`);
  assert(mondayOfWeekKey("2026-07-25") === "2026-07-20", "mondayOfWeekKey finds the right Monday (Sat -> prior Mon)");
  assert(mondayOfWeekKey("2026-07-20") === "2026-07-20", "mondayOfWeekKey is a no-op on an actual Monday");
  assert(addDaysToKey("2026-07-31", 1) === "2026-08-01", "addDaysToKey crosses a month boundary");

  console.log("Plate-loading math:");
  const plates = parsePlatesInput("20x2, 10x4, 5x2");
  assert(plates.length === 3, `parses 3 plate groups, got ${plates.length}`);
  assert(plates[1].weightKg === 10 && plates[1].count === 4, "10x4 parses to weight=10, count=4");
  const loads = achievableBarLoads(20, plates);
  assert(loads.includes(20), "bar alone (20kg) is achievable");
  assert(loads.includes(30), "20 bar + one 5-pair per side (30kg) is achievable");
  assert(loads.includes(80), "20 bar + every pair loaded (80kg) is achievable");
  assert(!loads.includes(20 + 2 * 47.5), "a nonsense weight nobody owns plates for is not in the list");
  const singlePlate = parsePlatesInput("20x1"); // only one plate, can't load a pair
  assert(achievableBarLoads(20, singlePlate).length === 1, "a single unpaired plate adds nothing loadable");

  console.log("Full signup-shaped DB transaction:");
  const email = `smoketest+${Date.now()}@example.com`;
  const passwordHash = await hashPassword("hunter2hunter2");
  const userId = await db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({ email, passwordHash }).returning();
    await tx.insert(profiles).values({
      userId: user.id,
      displayName: "Smoke Test",
      bandMinKg: 40,
      bandMaxKg: 60,
    });
    await tx.insert(userSettings).values({ userId: user.id });
    return user.id;
  });
  const [fetched] = await db
    .select()
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .leftJoin(userSettings, eq(userSettings.userId, users.id))
    .where(eq(users.id, userId));
  assert(fetched.users.email === email, "user row persisted with correct email");
  assert(fetched.profiles?.bandMinKg === 40, "profile equipment (band min) persisted");
  assert(fetched.user_settings?.themePreset === "graphite-rust", "default theme settings created");

  console.log("Workout session + sets:");
  const [benchPress] = await db.select().from(exercises).where(eq(exercises.name, "Dumbbell Bench Press")).limit(1);
  assert(!!benchPress, "seeded catalog exercise exists");
  const [session] = await db.insert(workoutSessions).values({ userId, mode: "live" }).returning();
  await db.insert(workoutSets).values({
    sessionId: session.id,
    exerciseId: benchPress.id,
    setNumber: 1,
    reps: 8,
    weightKg: 20,
    completedAt: new Date(),
  });
  await db.update(workoutSessions).set({ finishedAt: new Date() }).where(eq(workoutSessions.id, session.id));
  const loggedSets = await db.select().from(workoutSets).where(eq(workoutSets.sessionId, session.id));
  assert(loggedSets.length === 1 && loggedSets[0].weightKg === 20, "set persisted with correct weight");

  console.log("Custom program (exercise-linked):");
  const [program] = await db.insert(programs).values({ userId, name: "Smoke Program", source: "custom" }).returning();
  const [day] = await db
    .insert(programDays)
    .values({ programId: program.id, dayIndex: 1, title: "Day 1", type: "strength" })
    .returning();
  await db.insert(programExercises).values({ dayId: day.id, exerciseId: benchPress.id, sets: 3, reps: "10", orderIndex: 0 });
  const customDayExercises = await db.select().from(programExercises).where(eq(programExercises.dayId, day.id));
  assert(customDayExercises[0]?.exerciseId === benchPress.id, "custom program exercise links to catalog");

  console.log("Legacy freeText-shaped program (already-imported data, rounds):");
  const [imported] = await db
    .insert(programs)
    .values({ userId, name: "Imported Test", source: "darebee", sourcePdfName: "test.pdf" })
    .returning();
  const [importedDay] = await db
    .insert(programDays)
    .values({ programId: imported.id, dayIndex: 1, title: "Circuit 1", type: "strength" })
    .returning();
  await db.insert(programExercises).values({ dayId: importedDay.id, freeText: "Push-ups", rounds: 3, reps: "15", orderIndex: 0 });
  const importedExercises = await db.select().from(programExercises).where(eq(programExercises.dayId, importedDay.id));
  assert(importedExercises[0]?.freeText === "Push-ups" && importedExercises[0]?.rounds === 3, "freeText-shaped exercise persisted");

  console.log("Cardio session linked to a program:");
  const [cardio] = await db
    .insert(cardioSessions)
    .values({ userId, type: "outdoor_run", distanceKm: 5, durationSec: 1500, avgPaceSecKm: 300, programId: imported.id })
    .returning();
  assert(cardio.programId === imported.id, "cardio session links to its program");

  console.log("Body metric with measurements JSON:");
  const [metric] = await db
    .insert(bodyMetrics)
    .values({ userId, weightKg: 70.5, measurements: JSON.stringify({ arms: 35, chest: 95 }) })
    .returning();
  assert(JSON.parse(metric.measurements!).arms === 35, "measurements JSON round-trips");

  // Cascade delete check
  await db.delete(users).where(eq(users.id, userId));
  const [afterDelete] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  assert(afterDelete === undefined, "deleting user cascades to profile row");
  const [setsAfterDelete] = await db.select().from(workoutSets).where(eq(workoutSets.sessionId, session.id));
  assert(setsAfterDelete === undefined, "deleting user cascades to workout sets");
  const [cardioAfterDelete] = await db.select().from(cardioSessions).where(eq(cardioSessions.id, cardio.id));
  assert(cardioAfterDelete === undefined, "deleting user cascades to cardio sessions");

  console.log("\nAll smoke tests passed.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
