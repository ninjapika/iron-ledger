import { Trash2, Footprints } from "lucide-react";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getCardioHistory, deleteCardioSession } from "@/lib/actions/tracking";
import { getCardioTrend } from "@/lib/data/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedList } from "@/components/ui/animated-list";
import { CardioForm } from "@/components/cardio/cardio-form";
import { CardioTrendChart } from "@/components/charts/cardio-trend-chart";
import { formatDuration, formatPace } from "@/lib/format";

const TYPE_LABELS: Record<string, string> = {
  outdoor_run: "Outdoor Run",
  treadmill: "Treadmill",
  cycling: "Cycling",
};

export default async function CardioPage() {
  const user = await requireCurrentUser();

  const [history, trend] = await Promise.all([
    getCardioHistory(user.id, 20),
    getCardioTrend(user.id, user.settings.timezone, 90),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl uppercase tracking-wide">Running</h1>
        <p className="mt-1 text-sm text-text-muted">
          Distance-based cardio only — running, treadmill, cycling. Everything else (jump rope, circuits,
          burpees) logs through <span className="text-text">Log Workout</span> as a Cardio-type session instead.
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader className="flex flex-row items-center gap-2">
          <Footprints size={16} className="text-accent-cardio" />
          <CardTitle className="text-base">Log a run</CardTitle>
        </CardHeader>
        <CardContent>
          <CardioForm />
        </CardContent>
      </Card>

      {trend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Trend (90d)</CardTitle>
          </CardHeader>
          <CardContent>
            <CardioTrendChart data={trend} />
          </CardContent>
        </Card>
      )}

      <AnimatedList className="space-y-2">
        {history.map((h) => (
          <div key={h.id} className="flex items-center justify-between rounded-theme border border-border bg-surface px-4 py-3 text-sm">
            <div>
              <p className="font-medium">{TYPE_LABELS[h.type] ?? h.type}</p>
              <p className="text-text-muted">
                {new Date(h.date).toLocaleString(undefined, {
                  timeZone: user.settings.timezone,
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {h.distanceKm ? ` · ${h.distanceKm} km` : ""}
                {h.durationSec ? ` · ${formatDuration(h.durationSec)}` : ""}
                {h.avgPaceSecKm ? ` · ${formatPace(h.avgPaceSecKm)}` : ""}
              </p>
            </div>
            <form action={async () => { "use server"; await deleteCardioSession(h.id); }}>
              <button className="text-text-muted hover:text-accent-danger">
                <Trash2 size={16} />
              </button>
            </form>
          </div>
        ))}
      </AnimatedList>
    </div>
  );
}
