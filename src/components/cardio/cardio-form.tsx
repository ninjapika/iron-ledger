"use client";

import { useState, useTransition } from "react";
import { logCardioSession } from "@/lib/actions/tracking";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { paceSecPerKm, formatPace } from "@/lib/format";

const TYPE_LABELS: Record<string, string> = {
  outdoor_run: "Outdoor Run",
  treadmill: "Treadmill",
  cycling: "Cycling",
};

export function CardioForm({
  defaultType = "outdoor_run",
  programId,
  programName,
}: {
  defaultType?: string;
  programId?: string;
  programName?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });
  const [type, setType] = useState(defaultType);
  const [distance, setDistance] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");

  const durationSec = (Number(minutes) || 0) * 60 + (Number(seconds) || 0);
  const distanceKm = Number(distance) || 0;
  const pace = distanceKm > 0 && durationSec > 0 ? paceSecPerKm(distanceKm, durationSec) : null;

  function submit() {
    const localDateTime = new Date(`${date}T${time}:00`);
    startTransition(async () => {
      await logCardioSession({
        isoDateTime: localDateTime.toISOString(),
        type,
        distanceKm: distanceKm || undefined,
        durationSec: durationSec || undefined,
        programId,
      });
      setDistance("");
      setMinutes("");
      setSeconds("");
    });
  }

  return (
    <div className="space-y-3">
      {programName && (
        <p className="rounded-theme bg-surface-2 px-3 py-2 text-xs text-text-muted">
          Logging as part of <span className="text-text">{programName}</span>
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Select value={type} onChange={(e) => setType(e.target.value)} className="w-auto min-w-[140px]">
          {Object.entries(TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-auto" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label htmlFor="c-distance">Distance (km)</Label>
          <Input id="c-distance" type="number" step="0.01" value={distance} onChange={(e) => setDistance(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="c-min">Minutes</Label>
          <Input id="c-min" type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="c-sec">Seconds</Label>
          <Input id="c-sec" type="number" value={seconds} onChange={(e) => setSeconds(e.target.value)} />
        </div>
      </div>
      {pace && <p className="text-xs text-text-muted">Pace: {formatPace(pace)}</p>}
      <Button onClick={submit} disabled={isPending} className="w-full sm:w-auto">
        {isPending ? "Saving…" : "Log"}
      </Button>
    </div>
  );
}
