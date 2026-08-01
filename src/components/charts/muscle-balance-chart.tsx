"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import type { MuscleBalance } from "@/lib/data/dashboard";
import { CATEGORY_LABELS } from "@/lib/data/exercise-labels";
import { ChartTooltip } from "./chart-tooltip";

const COLOR_BY_CATEGORY: Record<string, string> = {
  push: "var(--accent-strength)",
  pull: "var(--accent-cardio)",
  legs: "var(--accent-highlight)",
  core: "var(--accent-danger)",
  full_body: "var(--text-muted)",
};

export function MuscleBalanceChart({ data }: { data: MuscleBalance[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-text-muted">No strength sets logged in the last 4 weeks yet.</p>;
  }

  const chartData = data
    .map((d) => ({ category: CATEGORY_LABELS[d.category] ?? d.category, key: d.category, volume: Math.round(d.volumeKg) }))
    .sort((a, b) => b.volume - a.volume);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="category"
          tick={{ fill: "var(--text)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={70}
        />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          content={<ChartTooltip valueLabel="Volume" valueSuffix=" kg" dataKey="volume" />}
        />
        <Bar dataKey="volume" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {chartData.map((d) => (
            <Cell key={d.key} fill={COLOR_BY_CATEGORY[d.key] ?? "var(--text-muted)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
