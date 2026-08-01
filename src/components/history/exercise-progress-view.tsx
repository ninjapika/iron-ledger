"use client";

import { useEffect, useState, useTransition } from "react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Select } from "@/components/ui/field";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { getExerciseProgress } from "@/lib/actions/history";
import { estimate1RM, formatDuration } from "@/lib/format";

interface ExerciseOption {
  id: string;
  name: string;
  equipment: string;
  trackingType: string;
}

export function ExerciseProgressView({ exercises }: { exercises: ExerciseOption[] }) {
  const [selectedId, setSelectedId] = useState(exercises[0]?.id ?? "");
  const [rows, setRows] = useState<Awaited<ReturnType<typeof getExerciseProgress>>>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!selectedId) return;
    startTransition(async () => {
      const data = await getExerciseProgress(selectedId);
      setRows(data);
    });
  }, [selectedId]);

  if (exercises.length === 0) {
    return <p className="text-sm text-text-muted">Log a few workouts first — this fills in once you have history.</p>;
  }

  const selected = exercises.find((e) => e.id === selectedId);
  const usesWeight = selected?.equipment !== "bodyweight" && selected?.equipment !== "cardio";
  const timed = selected?.trackingType === "duration";

  const chartData = rows
    .filter((r) => !r.isWarmup)
    .map((r) => ({
      date: r.date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      value: timed
        ? r.durationSec ?? 0
        : usesWeight && r.weightKg && r.reps
        ? Math.round(estimate1RM(r.weightKg, r.reps) * 10) / 10
        : r.reps ?? 0,
    }));

  const valueLabel = timed ? "Time held" : usesWeight ? "Est. 1RM" : "Reps";

  return (
    <div className="space-y-4">
      <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="max-w-xs">
        {exercises.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </Select>

      {isPending && <p className="text-sm text-text-muted">Loading…</p>}

      {!isPending && chartData.length > 1 && (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
            <YAxis
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={40}
              tickFormatter={timed ? (v: number) => formatDuration(v) : undefined}
            />
            <Tooltip
              cursor={{ stroke: "var(--accent-strength)", strokeWidth: 1, strokeDasharray: "3 3" }}
              content={
                <ChartTooltip
                  valueLabel={valueLabel}
                  dataKey="value"
                  formatValue={timed ? (v) => formatDuration(v) : undefined}
                  valueSuffix={!timed && usesWeight ? " kg" : ""}
                />
              }
            />
            <Line type="monotone" dataKey="value" stroke="var(--accent-strength)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}

      {!isPending && rows.length > 0 && (
        <div className="overflow-hidden rounded-theme border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Set</th>
                {usesWeight && !timed && <th className="px-3 py-2 text-left">Weight</th>}
                <th className="px-3 py-2 text-left">{timed ? "Time" : "Reps"}</th>
                <th className="px-3 py-2 text-left">RPE</th>
              </tr>
            </thead>
            <tbody>
              {[...rows].reverse().map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2 text-text-muted">{r.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</td>
                  <td className="px-3 py-2">
                    {r.setNumber}
                    {r.isWarmup && <span className="ml-1 text-[10px] text-text-muted">(warmup)</span>}
                  </td>
                  {usesWeight && !timed && <td className="px-3 py-2">{r.weightKg ? `${r.weightKg} kg` : "—"}</td>}
                  <td className="px-3 py-2">{timed ? (r.durationSec ? `${r.durationSec}s` : "—") : r.reps ?? "—"}</td>
                  <td className="px-3 py-2 text-text-muted">{r.rpe ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
