"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import type { WeeklyVolume } from "@/lib/data/dashboard";
import { formatDateKey } from "@/lib/tz";
import { ChartTooltip } from "./chart-tooltip";

export function VolumeChart({ data }: { data: WeeklyVolume[] }) {
  const chartData = data.map((d) => ({
    week: formatDateKey(d.weekStart),
    volume: Math.round(d.volumeKg),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="week" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
        <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          content={<ChartTooltip valueLabel="Volume" valueSuffix=" kg" dataKey="volume" />}
        />
        <Bar dataKey="volume" fill="var(--accent-strength)" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
