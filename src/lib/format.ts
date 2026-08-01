export function formatDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** "52m", "1h 5m", "45s" — for a duration read as a summary (today's mini
 * cards, a finished session's total), as opposed to formatDuration's mm:ss
 * stopwatch face used while a timer is actively ticking. */
export function formatDurationHuman(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec));
  if (sec < 60) return `${sec}s`;
  const totalMin = Math.round(sec / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Epley formula — the standard, simple estimated-1RM used across the app. */
export function estimate1RM(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export function formatKg(kg: number | null | undefined): string {
  if (kg == null) return "—";
  return `${Number(kg.toFixed(1)).toString()} kg`;
}

/** Pace in sec/km -> "5:42/km" */
export function formatPace(secPerKm: number | null | undefined): string {
  if (!secPerKm || !Number.isFinite(secPerKm)) return "—";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

export function paceSecPerKm(distanceKm: number, durationSec: number): number | null {
  if (!distanceKm || distanceKm <= 0) return null;
  return durationSec / distanceKm;
}

export function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}
