export type TimeOfDay = "morning" | "afternoon" | "evening";

export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

/** A reasonable default guess — always shown as an editable, not a fact. */
export function guessTimeOfDay(date: Date = new Date()): TimeOfDay {
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
