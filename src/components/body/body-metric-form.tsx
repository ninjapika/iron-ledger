"use client";

import { useState, useTransition } from "react";
import { logBodyMetric } from "@/lib/actions/tracking";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

const MEASUREMENT_FIELDS = [
  { key: "arms", label: "Arms (cm)" },
  { key: "chest", label: "Chest (cm)" },
  { key: "waist", label: "Waist (cm)" },
  { key: "thighs", label: "Thighs (cm)" },
];

export function BodyMetricForm() {
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState("");
  const [measurements, setMeasurements] = useState<Record<string, string>>({});

  function submit() {
    const parsedMeasurements: Record<string, number> = {};
    for (const [k, v] of Object.entries(measurements)) {
      if (v) parsedMeasurements[k] = Number(v);
    }
    startTransition(async () => {
      await logBodyMetric({
        date,
        weightKg: weight ? Number(weight) : undefined,
        measurements: Object.keys(parsedMeasurements).length ? parsedMeasurements : undefined,
      });
      setWeight("");
      setMeasurements({});
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="bm-date">Date</Label>
          <Input id="bm-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="bm-weight">Bodyweight (kg)</Label>
          <Input id="bm-weight" type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        {MEASUREMENT_FIELDS.map((f) => (
          <div key={f.key}>
            <Label htmlFor={`bm-${f.key}`}>{f.label}</Label>
            <Input
              id={`bm-${f.key}`}
              type="number"
              step="0.1"
              value={measurements[f.key] ?? ""}
              onChange={(e) => setMeasurements((m) => ({ ...m, [f.key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <Button onClick={submit} disabled={isPending}>
        {isPending ? "Saving…" : "Log Entry"}
      </Button>
    </div>
  );
}
