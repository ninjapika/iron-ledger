import { Trash2 } from "lucide-react";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getBodyMetricHistory, deleteBodyMetric } from "@/lib/actions/tracking";
import { getBodyWeightTrend } from "@/lib/data/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BodyMetricForm } from "@/components/body/body-metric-form";
import { BodyWeightTrendChart } from "@/components/charts/bodyweight-trend-chart";

export default async function BodyMetricsPage() {
  const user = await requireCurrentUser();
  const [history, trend] = await Promise.all([
    getBodyMetricHistory(user.id, 20),
    getBodyWeightTrend(user.id, user.settings.timezone, 365),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl uppercase tracking-wide">Body Metrics</h1>

      <Card>
        <CardHeader>
          <CardTitle>Log an entry</CardTitle>
        </CardHeader>
        <CardContent>
          <BodyMetricForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bodyweight Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <BodyWeightTrendChart data={trend} />
        </CardContent>
      </Card>

      <div className="space-y-2">
        {history.map((h) => {
          const measurements = h.measurements ? (JSON.parse(h.measurements) as Record<string, number>) : null;
          return (
            <div key={h.id} className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3 text-sm">
              <div>
                <p className="font-medium">
                  {new Date(h.date).toLocaleDateString()} {h.weightKg ? `· ${h.weightKg} kg` : ""}
                </p>
                {measurements && (
                  <p className="text-text-muted">
                    {Object.entries(measurements)
                      .map(([k, v]) => `${k} ${v}cm`)
                      .join(" · ")}
                  </p>
                )}
              </div>
              <form action={async () => { "use server"; await deleteBodyMetric(h.id); }}>
                <button className="text-text-muted hover:text-accent-danger">
                  <Trash2 size={16} />
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
