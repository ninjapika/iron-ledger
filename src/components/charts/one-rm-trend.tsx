"use client";

import { useState } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { cn } from "@/lib/cn";
import type { OneRmPoint } from "@/lib/data/dashboard";
import { formatDateKey } from "@/lib/tz";
import { ChartTooltip } from "./chart-tooltip";

export function OneRmTrend({
  options,
}: {
  options: { exerciseId: string; name: string; points: OneRmPoint[] }[];
}) {
  const withData = options.filter((o) => o.points.length > 1);
  const [selected, setSelected] = useState(withData[0]?.exerciseId);

  if (withData.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        Log the same exercise across a few sessions to see its estimated-1RM trend here.
      </p>
    );
  }

  const active = withData.find((o) => o.exerciseId === selected) ?? withData[0];
  const chartData = active.points.map((p) => ({
    date: formatDateKey(p.date),
    est1rm: Math.round(p.estimated1RM * 10) / 10,
  }));

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {withData.map((o) => (
          <button
            key={o.exerciseId}
            onClick={() => setSelected(o.exerciseId)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors",
              o.exerciseId === active.exerciseId
                ? "border-accent-highlight bg-accent-highlight text-bg"
                : "border-border text-text-muted hover:text-text"
            )}
          >
            {o.name}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
          <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={40} domain={["dataMin - 5", "dataMax + 5"]} />
          <Tooltip
            cursor={{ stroke: "var(--accent-highlight)", strokeWidth: 1, strokeDasharray: "3 3" }}
            content={<ChartTooltip valueLabel="Est. 1RM" valueSuffix=" kg" dataKey="est1rm" />}
          />
          <Line type="monotone" dataKey="est1rm" stroke="var(--accent-highlight)" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
