import { hourInTZ } from "@/lib/tz";

export type TimeOfDay = "morning" | "afternoon" | "evening";

export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

/** A reasonable default guess — always shown as an editable, not a fact.
 * `timeZone` is required (not defaulted) so a call site can't accidentally
 * fall back to `date.getHours()`-style server-local-time bugs — the very
 * thing this function exists to avoid (see tz.ts). Pass the user's own
 * settings.timezone. */
export function guessTimeOfDay(date: Date = new Date(), timeZone: string): TimeOfDay {
  const hour = hourInTZ(date, timeZone);
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
