import Link from "next/link";
import { Sparkles, ArrowRight, Footprints } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { getTodaysActivity, MonthActivity } from "@/lib/data/dashboard";
import { WORKOUT_TYPE_ICONS, WORKOUT_TYPE_COLOR } from "@/lib/data/workout-types";
import { WORKOUT_TYPE_LABELS } from "@/lib/data/exercise-labels";
import { formatDurationHuman } from "@/lib/format";
import { CalendarHeatmap } from "@/components/charts/calendar-heatmap";

const RUN_LABELS: Record<string, string> = {
  outdoor_run: "Outdoor Run",
  treadmill: "Treadmill",
  cycling: "Cycling",
};

function MiniCard({ icon: Icon, label, sub, accent }: { icon: typeof Sparkles; label: string; sub: string; accent: { text: string; bg: string; border: string; ring: string } }) {
  return (
    <div className={`flex items-center gap-2.5 rounded-theme px-3 py-2 ${accent.bg}`}>
      <Icon size={16} className={accent.text} />
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-text">{label}</p>
        <p className="truncate text-xs text-text-muted">{sub}</p>
      </div>
    </div>
  );
}

/**
 * "Today so far" and "Consistency" used to be two separate cards, which
 * left the heatmap one looking sparse once it became compact instead of a
 * full-width calendar. Merged into one card, side by side on md+ (today
 * gets more room since it can hold several mini-cards; the heatmap only
 * ever needs its own small footprint) and stacked on mobile.
 */
export function TodayCard({
  today,
  monthActivity,
}: {
  today: Awaited<ReturnType<typeof getTodaysActivity>>;
  monthActivity: MonthActivity;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="grid md:grid-cols-[1.3fr_1fr]">
        <div className="relative px-5 py-4 md:border-r md:border-border">
          {today.hasActivity && (
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl"
              style={{ background: "var(--accent-strength)" }}
            />
          )}
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 font-display text-lg uppercase tracking-wide">
                <Sparkles size={16} className="text-accent-highlight" />
                Today so far
              </p>
              <Link href="/log" className="shrink-0 text-xs text-accent-strength hover:underline">
                {today.hasActivity ? "Log more" : "Log workout"}
              </Link>
            </div>

            {today.hasActivity ? (
              // Each logged session becomes its own small, distinctly-colored
              // card by type — no exercise names or raw set counts here, just
              // "what kind, how long."
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-2">
                {today.sessions.map((s) => {
                  const Icon = WORKOUT_TYPE_ICONS[s.workoutType as keyof typeof WORKOUT_TYPE_ICONS] ?? WORKOUT_TYPE_ICONS.manual;
                  const accent = WORKOUT_TYPE_COLOR[s.workoutType as keyof typeof WORKOUT_TYPE_COLOR] ?? WORKOUT_TYPE_COLOR.manual;
                  const sub = s.durationSec != null ? formatDurationHuman(s.durationSec) : "logged after the fact";
                  return (
                    <MiniCard
                      key={s.id}
                      icon={Icon}
                      label={WORKOUT_TYPE_LABELS[s.workoutType] ?? "Workout"}
                      sub={sub}
                      accent={accent}
                    />
                  );
                })}
                {today.runs.map((r) => (
                  <MiniCard
                    key={r.id}
                    icon={Footprints}
                    label={RUN_LABELS[r.type] ?? "Run"}
                    sub={r.distanceKm ? `${r.distanceKm} km` : r.durationSec ? formatDurationHuman(r.durationSec) : ""}
                    accent={WORKOUT_TYPE_COLOR.cardio}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-sm text-text-muted">Nothing logged yet — start a live workout or log something once you&apos;re done.</p>
                <Link
                  href="/log"
                  className="flex shrink-0 items-center gap-1.5 rounded-theme bg-accent-strength px-3 py-2 text-sm font-semibold text-bg hover:brightness-110"
                >
                  Log <ArrowRight size={15} />
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border px-5 py-4 md:border-t-0">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-lg uppercase tracking-wide">Consistency</p>
            <Link href="/history/calendar" className="text-xs text-text-muted hover:text-text">
              All months →
            </Link>
          </div>
          <CalendarHeatmap data={monthActivity} variant="mini" />
        </div>
      </div>
    </Card>
  );
}
