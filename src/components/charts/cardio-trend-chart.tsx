"use client";

import { ComposedChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { CardioPoint } from "@/lib/data/dashboard";
import { formatPace } from "@/lib/format";
import { formatDateKey } from "@/lib/tz";
import { ChartTooltip } from "./chart-tooltip";

export function CardioTrendChart({ data }: { data: CardioPoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-text-muted">No cardio or runs logged in this window yet.</p>;
  }
  const chartData = data.map((d) => ({
    date: formatDateKey(d.date),
    distance: Math.round(d.distanceKm * 10) / 10,
    paceSec: d.paceSecKm,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
        <YAxis
          yAxisId="dist"
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={36}
          label={{ value: "km", position: "insideTopLeft", fill: "var(--text-muted)", fontSize: 10 }}
        />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          content={
            <ChartTooltip
              valueLabel="Distance"
              dataKey="distance"
              formatValue={(v, payload) => {
                const paceSec = (payload as { paceSec?: number | null } | undefined)?.paceSec;
                return `${v} km${paceSec ? ` · ${formatPace(paceSec)}` : ""}`;
              }}
            />
          }
        />
        <Bar yAxisId="dist" dataKey="distance" fill="var(--accent-cardio)" radius={[4, 4, 0, 0]} maxBarSize={22} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
