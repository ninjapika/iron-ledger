import Link from "next/link";
import { LineChart, Calendar } from "lucide-react";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getWorkoutHistory } from "@/lib/actions/history";
import { formatDateKey } from "@/lib/tz";
import { WORKOUT_TYPE_ICONS, WORKOUT_TYPE_COLOR } from "@/lib/data/workout-types";
import { cn } from "@/lib/cn";

export default async function HistoryPage() {
  const user = await requireCurrentUser();
  const entries = await getWorkoutHistory(user.id, user.settings.timezone, 90);

  const byDay = new Map<string, typeof entries>();
  for (const e of entries) {
    if (!byDay.has(e.dateKey)) byDay.set(e.dateKey, []);
    byDay.get(e.dateKey)!.push(e);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl uppercase tracking-wide">Workout History</h1>
        <div className="flex gap-2">
          <Link
            href="/history/calendar"
            className="flex items-center gap-1.5 rounded-theme border border-border px-3 py-2 text-xs text-text-muted hover:border-accent-strength/50 hover:text-text"
          >
            <Calendar size={14} />
            Calendar
          </Link>
          <Link
            href="/history/progress"
            className="flex items-center gap-1.5 rounded-theme border border-border px-3 py-2 text-xs text-text-muted hover:border-accent-strength/50 hover:text-text"
          >
            <LineChart size={14} />
            Exercise Progress
          </Link>
        </div>
      </div>

      {entries.length === 0 && <p className="text-sm text-text-muted">Nothing logged yet.</p>}

      <div className="space-y-4">
        {[...byDay.entries()].map(([dateKey, dayEntries]) => (
          <div key={dateKey}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
              {formatDateKey(dateKey, { weekday: "short", month: "short", day: "numeric" })}
            </p>
            <div className="space-y-2">
              {dayEntries.map((e) => {
                const typeKey = (e.kind === "cardio" ? "cardio" : e.workoutType) as keyof typeof WORKOUT_TYPE_ICONS;
                const Icon = WORKOUT_TYPE_ICONS[typeKey] ?? WORKOUT_TYPE_ICONS.manual;
                const color = WORKOUT_TYPE_COLOR[typeKey] ?? WORKOUT_TYPE_COLOR.manual;
                const content = (
                  <div className="card-interactive glow-interactive flex items-center gap-3 rounded-theme border border-border bg-surface px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-strength/40">
                    <Icon size={16} className={cn("shrink-0", color.text)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{e.title}</p>
                      {e.summary && <p className="truncate text-xs text-text-muted">{e.summary}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-text-muted">
                      {e.date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                );
                return e.kind === "strength" ? (
                  <Link key={e.id} href={`/history/${e.id}`}>
                    {content}
                  </Link>
                ) : (
                  <div key={e.id}>{content}</div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
