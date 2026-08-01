import "server-only";
import { and, eq, gte, sql, desc, asc } from "drizzle-orm";
import { db } from "@/db";
import {
  workoutSessions,
  workoutSets,
  exercises,
  cardioSessions,
  bodyMetrics,
} from "@/db/schema";
import { estimate1RM } from "@/lib/format";
import { dateKeyInTZ, todayKeyInTZ, cutoffDaysAgo, mondayOfWeekKey, addDaysToKey } from "@/lib/tz";

export interface SummaryStats {
  totalWorkouts: number;
  currentStreakDays: number;
  weekVolumeKg: number;
  weekCardioKm: number;
}

export interface DayActivity {
  date: string; // yyyy-mm-dd, in the user's timezone
  load: number; // relative intensity for the heatmap
}

export interface WeeklyVolume {
  weekStart: string;
  volumeKg: number;
}

export interface OneRmPoint {
  date: string;
  estimated1RM: number;
}

export interface MuscleBalance {
  category: string;
  volumeKg: number;
}

export interface BodyWeightPoint {
  date: string;
  weightKg: number;
}

export interface CardioPoint {
  date: string;
  distanceKm: number;
  paceSecKm: number | null;
}

/** Every finished strength session's sets since a cutoff — one raw query,
 * reduced/bucketed in JS below using the user's actual timezone. */
async function getFinishedSetsSince(userId: string, since: Date) {
  return db
    .select({
      date: workoutSessions.date,
      weightKg: workoutSets.weightKg,
      reps: workoutSets.reps,
      isWarmup: workoutSets.isWarmup,
      exerciseId: workoutSets.exerciseId,
      category: exercises.category,
    })
    .from(workoutSets)
    .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
    .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
    .where(and(eq(workoutSessions.userId, userId), gte(workoutSessions.date, since)));
}

export async function getSummaryStats(userId: string, timezone: string): Promise<SummaryStats> {
  const [{ value: totalWorkouts }] = await db
    .select({ value: sql<number>`count(*)` })
    .from(workoutSessions)
    .where(eq(workoutSessions.userId, userId));

  const activity = await getDayActivity(userId, timezone, 120);
  const activeKeys = new Set(activity.filter((d) => d.load > 0).map((d) => d.date));

  let streak = 0;
  let cursorKey = todayKeyInTZ(timezone);
  // Today doesn't need activity yet for the streak to still be "alive" —
  // you just haven't trained yet today.
  if (!activeKeys.has(cursorKey)) cursorKey = addDaysToKey(cursorKey, -1);
  while (activeKeys.has(cursorKey)) {
    streak++;
    cursorKey = addDaysToKey(cursorKey, -1);
  }

  const weekStart = cutoffDaysAgo(7);
  const weekSets = await getFinishedSetsSince(userId, weekStart);
  const weekVolumeKg = weekSets
    .filter((s) => !s.isWarmup)
    .reduce((sum, s) => sum + (s.weightKg ?? 0) * (s.reps ?? 0), 0);

  const weekCardio = await db
    .select({ distanceKm: cardioSessions.distanceKm })
    .from(cardioSessions)
    .where(and(eq(cardioSessions.userId, userId), gte(cardioSessions.date, weekStart)));
  const weekCardioKm = weekCardio.reduce((sum, c) => sum + (c.distanceKm ?? 0), 0);

  return { totalWorkouts: Number(totalWorkouts), currentStreakDays: streak, weekVolumeKg, weekCardioKm };
}

/**
 * Heatmap intensity, bucketed by the user's own calendar day.
 *
 * "Load" per day = total (weight × reps) across working (non-warmup) sets,
 * plus a rough equivalent for cardio (distance × 20, or minutes if no
 * distance was logged — e.g. a timed circuit). It's relative, not
 * absolute: the heatmap shades each day against the *busiest day in the
 * shown window*, not against any fixed number. Concretely, in
 * StreakHeatmap: >66% of the window's max day = full color, 33-66% = medium,
 * >0% = faint, 0 = the empty surface color. If you want different
 * thresholds or a different load formula entirely, both live in this
 * function and the `intensity()` function in
 * components/charts/streak-heatmap.tsx — nothing else needs to change.
 */
export async function getDayActivity(userId: string, timezone: string, days: number): Promise<DayActivity[]> {
  const since = cutoffDaysAgo(days);
  const [sets, cardio] = await Promise.all([
    getFinishedSetsSince(userId, since),
    db
      .select({ date: cardioSessions.date, distanceKm: cardioSessions.distanceKm, durationSec: cardioSessions.durationSec })
      .from(cardioSessions)
      .where(and(eq(cardioSessions.userId, userId), gte(cardioSessions.date, since))),
  ]);

  const byDay = new Map<string, number>();
  for (const s of sets) {
    if (s.isWarmup) continue;
    const key = dateKeyInTZ(s.date, timezone);
    const load = (s.weightKg ?? 0) * (s.reps ?? 0) || (s.reps ?? 1); // bodyweight sets still count
    byDay.set(key, (byDay.get(key) ?? 0) + load);
  }
  for (const c of cardio) {
    const key = dateKeyInTZ(c.date, timezone);
    const load = (c.distanceKm ?? 0) * 20 || (c.durationSec ?? 0) / 60;
    byDay.set(key, (byDay.get(key) ?? 0) + load);
  }

  const out: DayActivity[] = [];
  const todayKey = todayKeyInTZ(timezone);
  for (let i = days - 1; i >= 0; i--) {
    const key = addDaysToKey(todayKey, -i);
    out.push({ date: key, load: byDay.get(key) ?? 0 });
  }
  return out;
}

/**
 * Same load calculation as getDayActivity, but shaped as a full calendar
 * month (with leading/trailing blanks for grid alignment) instead of a
 * rolling N-day window — this is what the calendar-style heatmap renders,
 * since "Mon/Wed/Fri" row labels turned out to read as confusing where a
 * plain month grid with date numbers is instantly familiar.
 */
/** Same as DayActivity, plus a per-type load split so the heatmap can color
 * a day by what kind of training actually happened (strength/cardio/skill)
 * instead of one flat color for anything logged at all. `load` stays the
 * overall total used for intensity shading; the three *Load fields decide
 * which type "wins" a given cell — see dominantWorkoutType() below. */
export interface MonthDayActivity {
  date: string;
  load: number;
  strengthLoad: number;
  cardioLoad: number;
  skillLoad: number;
}

export interface MonthActivity {
  year: number;
  month: number; // 0-11
  leadingBlanks: number; // days before the 1st, for grid alignment (Mon-start week)
  days: MonthDayActivity[]; // one entry per calendar day in the month
}

export async function getMonthActivity(userId: string, timezone: string, year: number, month: number): Promise<MonthActivity> {
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstOfMonth = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const firstDow = (new Date(`${firstOfMonth}T12:00:00Z`).getUTCDay() + 6) % 7; // 0=Mon

  const since = new Date(Date.UTC(year, month, 1));
  const until = new Date(Date.UTC(year, month + 1, 1));

  const [sessions, setRows, cardio] = await Promise.all([
    db
      .select({ id: workoutSessions.id, date: workoutSessions.date, workoutType: workoutSessions.workoutType })
      .from(workoutSessions)
      .where(and(eq(workoutSessions.userId, userId), gte(workoutSessions.date, since), sql`${workoutSessions.date} < ${until}`)),
    db
      .select({ sessionId: workoutSets.sessionId, weightKg: workoutSets.weightKg, reps: workoutSets.reps, isWarmup: workoutSets.isWarmup })
      .from(workoutSets)
      .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
      .where(and(eq(workoutSessions.userId, userId), gte(workoutSessions.date, since), sql`${workoutSessions.date} < ${until}`)),
    db
      .select({ date: cardioSessions.date, distanceKm: cardioSessions.distanceKm, durationSec: cardioSessions.durationSec })
      .from(cardioSessions)
      .where(and(eq(cardioSessions.userId, userId), gte(cardioSessions.date, since), sql`${cardioSessions.date} < ${until}`)),
  ]);

  // Volume per session first (sets don't carry their own date/type — the
  // parent session does), then attribute the whole session to one calendar
  // day and one type bucket.
  const volumeBySession = new Map<string, number>();
  for (const s of setRows) {
    if (s.isWarmup) continue;
    const load = (s.weightKg ?? 0) * (s.reps ?? 0) || (s.reps ?? 1);
    volumeBySession.set(s.sessionId, (volumeBySession.get(s.sessionId) ?? 0) + load);
  }

  interface Bucket {
    load: number;
    strengthLoad: number;
    cardioLoad: number;
    skillLoad: number;
  }
  const byDay = new Map<string, Bucket>();
  function addLoad(key: string, type: string | null, amount: number) {
    if (amount <= 0) return;
    const b = byDay.get(key) ?? { load: 0, strengthLoad: 0, cardioLoad: 0, skillLoad: 0 };
    b.load += amount;
    if (type === "strength") b.strengthLoad += amount;
    else if (type === "cardio") b.cardioLoad += amount;
    else if (type === "skill") b.skillLoad += amount;
    // "manual" (or unset) still counts toward the day's total intensity,
    // just doesn't push any single type's color.
    byDay.set(key, b);
  }

  for (const s of sessions) {
    const vol = volumeBySession.get(s.id) ?? 0;
    if (vol <= 0) continue; // a session with nothing logged doesn't light up a day
    addLoad(dateKeyInTZ(s.date, timezone), s.workoutType, vol);
  }
  for (const c of cardio) {
    const load = (c.distanceKm ?? 0) * 20 || (c.durationSec ?? 0) / 60;
    addLoad(dateKeyInTZ(c.date, timezone), "cardio", load);
  }

  const days: MonthDayActivity[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const b = byDay.get(key);
    days.push({
      date: key,
      load: b?.load ?? 0,
      strengthLoad: b?.strengthLoad ?? 0,
      cardioLoad: b?.cardioLoad ?? 0,
      skillLoad: b?.skillLoad ?? 0,
    });
  }

  return { year, month, leadingBlanks: firstDow, days };
}

/** Which calendar months actually have any logged activity — powers the
 * monthly heatmap gallery so it doesn't show a wall of empty months. */
export async function getActiveMonths(userId: string, timezone: string): Promise<{ year: number; month: number }[]> {
  const [sessionDates, cardioDates] = await Promise.all([
    db.select({ date: workoutSessions.date }).from(workoutSessions).where(eq(workoutSessions.userId, userId)),
    db.select({ date: cardioSessions.date }).from(cardioSessions).where(eq(cardioSessions.userId, userId)),
  ]);
  const months = new Set<string>();
  for (const { date } of [...sessionDates, ...cardioDates]) {
    const key = dateKeyInTZ(date, timezone);
    months.add(key.slice(0, 7)); // "2026-07"
  }
  const thisMonthKey = todayKeyInTZ(timezone).slice(0, 7);
  months.add(thisMonthKey); // always include the current month even if empty
  return [...months]
    .sort()
    .reverse()
    .map((m) => ({ year: Number(m.slice(0, 4)), month: Number(m.slice(5, 7)) - 1 }));
}

export async function getWeeklyVolume(userId: string, timezone: string, weeks: number): Promise<WeeklyVolume[]> {
  const since = cutoffDaysAgo(weeks * 7);
  const sets = await getFinishedSetsSince(userId, since);

  const byWeek = new Map<string, number>();
  for (const s of sets) {
    if (s.isWarmup) continue;
    const weekKey = mondayOfWeekKey(dateKeyInTZ(s.date, timezone));
    const vol = (s.weightKg ?? 0) * (s.reps ?? 0);
    byWeek.set(weekKey, (byWeek.get(weekKey) ?? 0) + vol);
  }

  const thisWeekMonday = mondayOfWeekKey(todayKeyInTZ(timezone));
  const out: WeeklyVolume[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekKey = addDaysToKey(thisWeekMonday, -i * 7);
    out.push({ weekStart: weekKey, volumeKg: byWeek.get(weekKey) ?? 0 });
  }
  return out;
}

export async function getTopExercises(userId: string, limit = 3) {
  const rows = await db
    .select({ exerciseId: workoutSets.exerciseId, name: exercises.name, n: sql<number>`count(*)` })
    .from(workoutSets)
    .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
    .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
    .where(and(eq(workoutSessions.userId, userId), eq(workoutSets.isWarmup, false)))
    .groupBy(workoutSets.exerciseId, exercises.name)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
  return rows;
}

export async function get1RMTrend(userId: string, timezone: string, exerciseId: string, days = 180): Promise<OneRmPoint[]> {
  const since = cutoffDaysAgo(days);
  const rows = await db
    .select({ date: workoutSessions.date, weightKg: workoutSets.weightKg, reps: workoutSets.reps })
    .from(workoutSets)
    .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSets.exerciseId, exerciseId),
        eq(workoutSets.isWarmup, false),
        gte(workoutSessions.date, since)
      )
    )
    .orderBy(asc(workoutSessions.date));

  const byDay = new Map<string, number>();
  for (const r of rows) {
    if (!r.weightKg || !r.reps) continue;
    const est = estimate1RM(r.weightKg, r.reps);
    const key = dateKeyInTZ(r.date, timezone);
    byDay.set(key, Math.max(byDay.get(key) ?? 0, est));
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, estimated1RM]) => ({ date, estimated1RM }));
}

export async function getMuscleBalance(userId: string, days = 28): Promise<MuscleBalance[]> {
  const since = cutoffDaysAgo(days);
  const sets = await getFinishedSetsSince(userId, since);
  const byCategory = new Map<string, number>();
  for (const s of sets) {
    if (s.isWarmup || s.category === "cardio") continue;
    const vol = (s.weightKg ?? 0) * (s.reps ?? 0) || (s.reps ?? 0);
    byCategory.set(s.category, (byCategory.get(s.category) ?? 0) + vol);
  }
  return [...byCategory.entries()].map(([category, volumeKg]) => ({ category, volumeKg }));
}

export async function getBodyWeightTrend(userId: string, timezone: string, days = 180): Promise<BodyWeightPoint[]> {
  const since = cutoffDaysAgo(days);
  const rows = await db
    .select({ date: bodyMetrics.date, weightKg: bodyMetrics.weightKg })
    .from(bodyMetrics)
    .where(and(eq(bodyMetrics.userId, userId), gte(bodyMetrics.date, since)))
    .orderBy(asc(bodyMetrics.date));
  return rows
    .filter((r) => r.weightKg != null)
    .map((r) => ({ date: dateKeyInTZ(r.date, timezone), weightKg: r.weightKg! }));
}

export async function getCardioTrend(userId: string, timezone: string, days = 90): Promise<CardioPoint[]> {
  const since = cutoffDaysAgo(days);
  const rows = await db
    .select({
      date: cardioSessions.date,
      distanceKm: cardioSessions.distanceKm,
      avgPaceSecKm: cardioSessions.avgPaceSecKm,
    })
    .from(cardioSessions)
    .where(and(eq(cardioSessions.userId, userId), gte(cardioSessions.date, since)))
    .orderBy(asc(cardioSessions.date));
  return rows.map((r) => ({
    date: dateKeyInTZ(r.date, timezone),
    distanceKm: r.distanceKm ?? 0,
    paceSecKm: r.avgPaceSecKm,
  }));
}

/** Everything logged "today" (user's timezone) — powers the dashboard's
 * today-preview card. */
export interface TodaySessionSummary {
  id: string;
  workoutType: string; // strength | cardio | skill | manual
  mode: string; // live | logged
  durationSec: number | null; // null for logged (retroactive) sessions — there's no real "how long" for those
  setCount: number;
  volumeKg: number;
}

export interface TodayRunSummary {
  id: string;
  type: string;
  distanceKm: number | null;
  durationSec: number | null;
}

export async function getTodaysActivity(userId: string, timezone: string) {
  const since = cutoffDaysAgo(1);
  const todayKey = todayKeyInTZ(timezone);

  const [sessions, sets, cardio] = await Promise.all([
    db
      .select()
      .from(workoutSessions)
      .where(and(eq(workoutSessions.userId, userId), gte(workoutSessions.date, since))),
    db
      .select({
        sessionId: workoutSets.sessionId,
        reps: workoutSets.reps,
        weightKg: workoutSets.weightKg,
        isWarmup: workoutSets.isWarmup,
      })
      .from(workoutSets)
      .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
      .where(and(eq(workoutSessions.userId, userId), gte(workoutSessions.date, since))),
    db
      .select()
      .from(cardioSessions)
      .where(and(eq(cardioSessions.userId, userId), gte(cardioSessions.date, since))),
  ]);

  const todaysSessions = sessions.filter((s) => dateKeyInTZ(s.date, timezone) === todayKey);
  const todaysCardio = cardio.filter((c) => dateKeyInTZ(c.date, timezone) === todayKey);

  const setsBySession = new Map<string, typeof sets>();
  for (const s of sets) {
    if (!setsBySession.has(s.sessionId)) setsBySession.set(s.sessionId, []);
    setsBySession.get(s.sessionId)!.push(s);
  }

  const sessionSummaries: TodaySessionSummary[] = todaysSessions.map((s) => {
    const mySets = setsBySession.get(s.id) ?? [];
    const volumeKg = mySets.filter((x) => !x.isWarmup).reduce((sum, x) => sum + (x.weightKg ?? 0) * (x.reps ?? 0), 0);
    const durationSec =
      s.mode === "live" ? Math.round(((s.finishedAt ?? new Date()).getTime() - s.createdAt.getTime()) / 1000) : null;
    return {
      id: s.id,
      workoutType: s.workoutType ?? "manual",
      mode: s.mode,
      durationSec,
      setCount: mySets.length,
      volumeKg,
    };
  });

  const runSummaries: TodayRunSummary[] = todaysCardio.map((c) => ({
    id: c.id,
    type: c.type,
    distanceKm: c.distanceKm,
    durationSec: c.durationSec,
  }));

  return {
    hasActivity: sessionSummaries.length > 0 || runSummaries.length > 0,
    sessions: sessionSummaries,
    runs: runSummaries,
  };
}
