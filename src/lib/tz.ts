/**
 * Calendar-day math, done correctly.
 *
 * The bug this file exists to prevent: JS Date methods like `.getDay()`,
 * `.setHours()`, `.getDate()` all operate in whatever timezone the Node
 * process itself is running in — which is IST on a Windows dev machine and
 * usually UTC on a Linux VPS. Mixing those with `.toISOString()` (always
 * UTC) to build a "YYYY-MM-DD" key is how you get a workout that silently
 * lands on the wrong day, or a whole week's volume bucketed somewhere the
 * dashboard never looks.
 *
 * The fix: every "what calendar day is this" question goes through
 * `dateKeyInTZ`, which asks explicitly for the user's own timezone rather
 * than trusting whatever timezone the server happens to be in. Everything
 * else here works from date-key strings instead of raw Date arithmetic.
 */

/** The user's calendar-day key ("2026-07-25") for an instant, in their timezone. */
export function dateKeyInTZ(date: Date, timeZone: string): string {
  // en-CA happens to format as YYYY-MM-DD, which is convenient — this has
  // nothing to do with Canada, it's just the shortest reliable route to
  // that format from Intl without hand-rolling padding logic.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Today's key in the user's timezone. */
export function todayKeyInTZ(timeZone: string): string {
  return dateKeyInTZ(new Date(), timeZone);
}

/** The key N days before today, in the user's timezone. */
export function daysAgoKeyInTZ(n: number, timeZone: string): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return dateKeyInTZ(d, timeZone);
}

/** A safe cutoff Date for SQL "since" filters — a little generous is fine
 * here since this only trims a query window, it doesn't decide which day
 * an individual row belongs to (dateKeyInTZ does that, per-row). */
export function cutoffDaysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n - 1);
  return d;
}

/** Monday's date-key for whatever week a given date-key falls in. Works
 * entirely on calendar-date strings anchored to UTC noon, so it's immune
 * to local-timezone DST/offset quirks — there's no real "instant" here,
 * just calendar math. */
export function mondayOfWeekKey(dateKey: string): string {
  const anchor = new Date(`${dateKey}T12:00:00.000Z`);
  const dow = anchor.getUTCDay(); // 0=Sun..6=Sat
  const diff = (dow + 6) % 7; // days since Monday
  anchor.setUTCDate(anchor.getUTCDate() - diff);
  return anchor.toISOString().slice(0, 10);
}

/** Add days to a date-key, returning a new date-key. */
export function addDaysToKey(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Human display for a date-key without any timezone reinterpretation. */
export function formatDateKey(dateKey: string, opts?: Intl.DateTimeFormatOptions): string {
  const d = new Date(`${dateKey}T12:00:00.000Z`);
  return d.toLocaleDateString(undefined, { timeZone: "UTC", month: "short", day: "numeric", ...opts });
}
