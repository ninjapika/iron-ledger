import { db } from "./index";
import { exercises } from "./schema";
import { sql, eq, and, isNull } from "drizzle-orm";

type Seed = {
  name: string;
  category: string;
  equipment: string;
  restSec?: number;
  trackingType?: "reps" | "duration";
};

// Curated for a home setup: adjustable dumbbells, a barbell, an EZ curl bar,
// and a resistance band — plus bodyweight/cardio/skill staples for
// DAREBEE-style programs. userId stays null: this is the shared catalog
// every user sees. This seed is an upsert (matched by name), so fixing an
// entry here (e.g. correcting Plank to duration-based) and re-running
// `npm run db:seed` corrects it in place rather than needing a manual
// database edit.
const SEED: Seed[] = [
  // Dumbbell — push
  { name: "Dumbbell Bench Press", category: "push", equipment: "dumbbell" },
  { name: "Dumbbell Incline Press", category: "push", equipment: "dumbbell" },
  { name: "Dumbbell Shoulder Press", category: "push", equipment: "dumbbell" },
  { name: "Dumbbell Lateral Raise", category: "push", equipment: "dumbbell", restSec: 60 },
  { name: "Dumbbell Front Raise", category: "push", equipment: "dumbbell", restSec: 60 },
  { name: "Dumbbell Tricep Extension", category: "push", equipment: "dumbbell", restSec: 60 },
  { name: "Dumbbell Floor Press", category: "push", equipment: "dumbbell" },
  // Dumbbell — pull
  { name: "Dumbbell Row", category: "pull", equipment: "dumbbell" },
  { name: "Dumbbell Rear Delt Fly", category: "pull", equipment: "dumbbell", restSec: 60 },
  { name: "Dumbbell Bicep Curl", category: "pull", equipment: "dumbbell", restSec: 60 },
  { name: "Dumbbell Hammer Curl", category: "pull", equipment: "dumbbell", restSec: 60 },
  { name: "Dumbbell Shrug", category: "pull", equipment: "dumbbell", restSec: 60 },
  // Dumbbell — legs
  { name: "Dumbbell Goblet Squat", category: "legs", equipment: "dumbbell" },
  { name: "Dumbbell Romanian Deadlift", category: "legs", equipment: "dumbbell" },
  { name: "Dumbbell Lunge", category: "legs", equipment: "dumbbell" },
  { name: "Dumbbell Bulgarian Split Squat", category: "legs", equipment: "dumbbell" },
  { name: "Dumbbell Step-Up", category: "legs", equipment: "dumbbell" },
  { name: "Dumbbell Calf Raise", category: "legs", equipment: "dumbbell", restSec: 60 },
  // Barbell
  { name: "Barbell Back Squat", category: "legs", equipment: "barbell", restSec: 150 },
  { name: "Barbell Deadlift", category: "legs", equipment: "barbell", restSec: 180 },
  { name: "Barbell Bench Press", category: "push", equipment: "barbell", restSec: 150 },
  { name: "Barbell Overhead Press", category: "push", equipment: "barbell", restSec: 120 },
  { name: "Barbell Row", category: "pull", equipment: "barbell", restSec: 120 },
  { name: "Barbell Romanian Deadlift", category: "legs", equipment: "barbell", restSec: 150 },
  { name: "Barbell Front Squat", category: "legs", equipment: "barbell", restSec: 150 },
  { name: "Barbell Hip Thrust", category: "legs", equipment: "barbell", restSec: 120 },
  // EZ curl bar
  { name: "EZ Bar Bicep Curl", category: "pull", equipment: "ez_bar", restSec: 75 },
  { name: "EZ Bar Skull Crusher", category: "push", equipment: "ez_bar", restSec: 75 },
  { name: "EZ Bar Preacher Curl", category: "pull", equipment: "ez_bar", restSec: 75 },
  { name: "EZ Bar Upright Row", category: "pull", equipment: "ez_bar", restSec: 75 },
  { name: "EZ Bar Reverse Curl", category: "pull", equipment: "ez_bar", restSec: 60 },
  // Resistance band
  { name: "Band Pull-Apart", category: "pull", equipment: "band", restSec: 45 },
  { name: "Band Face Pull", category: "pull", equipment: "band", restSec: 45 },
  { name: "Band Assisted Pull-Up", category: "pull", equipment: "band", restSec: 90 },
  { name: "Band Squat", category: "legs", equipment: "band", restSec: 60 },
  { name: "Band Row", category: "pull", equipment: "band", restSec: 60 },
  { name: "Band Tricep Pushdown", category: "push", equipment: "band", restSec: 45 },
  { name: "Band Lateral Walk", category: "legs", equipment: "band", restSec: 45 },
  // Bodyweight / core (common DAREBEE building blocks)
  { name: "Push-Up", category: "push", equipment: "bodyweight", restSec: 45 },
  { name: "Pull-Up", category: "pull", equipment: "bodyweight", restSec: 90 },
  { name: "Bodyweight Squat", category: "legs", equipment: "bodyweight", restSec: 30 },
  { name: "Plank", category: "core", equipment: "bodyweight", restSec: 30, trackingType: "duration" },
  { name: "Side Plank", category: "core", equipment: "bodyweight", restSec: 30, trackingType: "duration" },
  { name: "Lunges", category: "legs", equipment: "bodyweight", restSec: 30 },
  { name: "Sit-Ups", category: "core", equipment: "bodyweight", restSec: 30 },
  { name: "Bicycle Crunches", category: "core", equipment: "bodyweight", restSec: 30 },
  { name: "Superman", category: "core", equipment: "bodyweight", restSec: 30 },
  // Bodyweight cardio-conditioning — reps-in-a-circuit moves that read as
  // cardio in practice, so they're tagged category "cardio" even though
  // the equipment is "bodyweight." This is what makes them show up when
  // logging a Cardio-type session instead of only under Strength.
  { name: "Jumping Jacks", category: "cardio", equipment: "bodyweight", restSec: 20 },
  { name: "High Knees", category: "cardio", equipment: "bodyweight", restSec: 20 },
  { name: "Burpees", category: "cardio", equipment: "bodyweight", restSec: 45 },
  { name: "Mountain Climbers", category: "cardio", equipment: "bodyweight", restSec: 30 },
  // Skill work — holds, balance, and control-focused bodyweight practice
  { name: "Handstand Hold", category: "skill", equipment: "bodyweight", restSec: 60, trackingType: "duration" },
  { name: "Wall Handstand Hold", category: "skill", equipment: "bodyweight", restSec: 60, trackingType: "duration" },
  { name: "L-Sit Hold", category: "skill", equipment: "bodyweight", restSec: 60, trackingType: "duration" },
  { name: "Bridge Hold", category: "skill", equipment: "bodyweight", restSec: 45, trackingType: "duration" },
  { name: "Crow Pose Hold", category: "skill", equipment: "bodyweight", restSec: 45, trackingType: "duration" },
  { name: "Single-Leg Balance", category: "skill", equipment: "bodyweight", restSec: 30, trackingType: "duration" },
  { name: "Pistol Squat Practice", category: "skill", equipment: "bodyweight", restSec: 60 },
  // Cardio (distance-based — logged via the Running tab instead)
  { name: "Outdoor Run", category: "cardio", equipment: "cardio" },
  { name: "Cycling", category: "cardio", equipment: "cardio" },
  { name: "Jump Rope", category: "cardio", equipment: "bodyweight", restSec: 30, trackingType: "duration" },
];

async function main() {
  console.log(`Seeding ${SEED.length} catalog exercises…`);
  let inserted = 0;
  let updated = 0;

  for (const s of SEED) {
    const existing = await db
      .select()
      .from(exercises)
      .where(and(eq(exercises.name, s.name), isNull(exercises.userId)))
      .limit(1);

    const values = {
      category: s.category,
      equipment: s.equipment,
      trackingType: s.trackingType ?? "reps",
      defaultRestSec: s.restSec ?? 90,
    };

    if (existing.length > 0) {
      const row = existing[0];
      const changed =
        row.category !== values.category ||
        row.equipment !== values.equipment ||
        row.trackingType !== values.trackingType ||
        row.defaultRestSec !== values.defaultRestSec;
      if (changed) {
        await db.update(exercises).set(values).where(eq(exercises.id, row.id));
        updated++;
      }
      continue;
    }

    await db.insert(exercises).values({ name: s.name, isCustom: false, userId: null, ...values });
    inserted++;
  }

  const [{ value }] = await db.select({ value: sql<number>`count(*)` }).from(exercises);
  console.log(`Done. ${inserted} inserted, ${updated} corrected. Catalog now has ${value} exercises.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
