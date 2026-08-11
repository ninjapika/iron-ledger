"use client";

import { useRef, useState, useTransition } from "react";
import { addCustomExercise } from "@/lib/actions/workouts";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { FieldTooltip } from "@/components/ui/field-tooltip";

export function AddExerciseForm() {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("push");
  const [equipment, setEquipment] = useState("dumbbell");
  const [trackingType, setTrackingType] = useState("reps");
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const nameFieldRef = useRef<HTMLDivElement>(null);

  function submit() {
    if (!name.trim()) return;
    setDuplicateError(null);
    startTransition(async () => {
      const result = await addCustomExercise(name.trim(), category, equipment, trackingType);
      if (result.error) {
        setDuplicateError(result.error);
        setTimeout(() => setDuplicateError(null), 3000);
        return;
      }
      setName("");
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div ref={nameFieldRef} className="flex-1 min-w-[180px]">
        <Label htmlFor="ex-name">Name</Label>
        <Input id="ex-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Zottman Curl" />
        <FieldTooltip message={duplicateError} anchorRef={nameFieldRef} />
      </div>
      <div>
        <Label htmlFor="ex-category">Category</Label>
        <Select id="ex-category" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="push">Push</option>
          <option value="pull">Pull</option>
          <option value="legs">Legs</option>
          <option value="core">Core</option>
          <option value="full_body">Full Body</option>
          <option value="cardio">Cardio</option>
          <option value="skill">Skill</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="ex-equipment">Equipment</Label>
        <Select id="ex-equipment" value={equipment} onChange={(e) => setEquipment(e.target.value)}>
          <option value="dumbbell">Dumbbell</option>
          <option value="barbell">Barbell</option>
          <option value="ez_bar">EZ Curl Bar</option>
          <option value="band">Resistance Band</option>
          <option value="bodyweight">Bodyweight</option>
          <option value="cardio">Cardio</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="ex-tracking">Tracked by</Label>
        <Select id="ex-tracking" value={trackingType} onChange={(e) => setTrackingType(e.target.value)}>
          <option value="reps">Reps</option>
          <option value="duration">Time held</option>
        </Select>
      </div>
      <Button onClick={submit} disabled={isPending || !name.trim()}>
        {isPending ? "Adding…" : "Add"}
      </Button>
    </div>
  );
}
