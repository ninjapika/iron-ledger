"use client";

import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { BodyWeightPoint } from "@/lib/data/dashboard";
import { formatDateKey } from "@/lib/tz";
import { ChartTooltip } from "./chart-tooltip";

export function BodyWeightTrendChart({ data }: { data: BodyWeightPoint[] }) {
  if (data.length < 2) {
    return <p className="text-sm text-text-muted">Log your bodyweight a few times to see the trend here.</p>;
  }
  const chartData = data.map((d) => ({
    date: formatDateKey(d.date),
    kg: d.weightKg,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
        <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={40} domain={["dataMin - 1", "dataMax + 1"]} />
        <Tooltip
          cursor={{ stroke: "var(--accent-cardio)", strokeWidth: 1, strokeDasharray: "3 3" }}
          content={<ChartTooltip valueLabel="Bodyweight" valueSuffix=" kg" dataKey="kg" />}
        />
        <Line type="monotone" dataKey="kg" stroke="var(--accent-cardio)" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
