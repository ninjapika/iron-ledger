"use client";

interface PayloadItem {
  dataKey?: string;
  name?: string;
  value?: number | string;
  payload?: Record<string, unknown>;
  color?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: PayloadItem[];
  label?: string;
  valueLabel?: string;
  valueSuffix?: string;
  dataKey?: string; // pull this specific series out of payload; defaults to the first
  formatValue?: (value: number, payload?: Record<string, unknown>) => string;
}

/** Pass as `<Tooltip content={<ChartTooltip ... />} />` — recharts clones
 * this element and injects active/payload/label itself. Styled with
 * Tailwind classes bound to our theme tokens (not inline `var()` strings),
 * so it can never render as a plain white box regardless of chart type. */
export function ChartTooltip({ active, payload, label, valueLabel, valueSuffix = "", dataKey, formatValue }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = (dataKey ? payload.find((p) => p.dataKey === dataKey) : undefined) ?? payload[0];
  const value = Number(item?.value ?? 0);
  const display = formatValue ? formatValue(value, item?.payload) : `${value.toLocaleString()}${valueSuffix}`;

  return (
    <div className="tooltip-pop rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs shadow-lg shadow-black/30">
      {label && <p className="mb-0.5 text-text-muted">{label}</p>}
      <p className="font-medium text-text">
        {valueLabel && <span className="text-text-muted">{valueLabel}: </span>}
        {display}
      </p>
    </div>
  );
}
