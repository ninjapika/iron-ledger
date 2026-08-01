"use client";

import { useActionState, useMemo, useState } from "react";
import { updateProfileAndEquipment, type ActionResult } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { parsePlatesInput, formatPlatesForInput, achievableBarLoads } from "@/lib/plates";

interface ProfileValues {
  displayName: string;
  age: number | null;
  heightCm: number | null;
  startingWeightKg: number | null;
  goal: string | null;
  experienceLevel: string | null;
  dumbbellMinKg: number | null;
  dumbbellMaxKg: number | null;
  dumbbellStepKg: number | null;
  barbellWeightKg: number | null;
  availablePlatesKg: string | null; // JSON string
  ezBarWeightKg: number | null;
  bandMinKg: number | null;
  bandMaxKg: number | null;
}

const initialState: ActionResult = {};

const GOAL_EXPLANATIONS: Record<string, string> = {
  strength: "Prioritizes low-rep, heavy sets — the 1RM trend chart and progression matter more here than total volume.",
  hypertrophy: "Prioritizes total volume across moderate rep ranges — the weekly volume chart is the one to watch.",
  endurance: "Prioritizes cardio consistency and time-under-tension — the cardio trend and streak matter most.",
  general_fitness: "A balanced mix — nothing is weighted differently, this just labels your profile for your own reference.",
};

export function ProfileForm({ profile }: { profile: ProfileValues }) {
  const [state, formAction, pending] = useActionState(async (_: ActionResult, formData: FormData) => {
    return (await updateProfileAndEquipment(formData)) ?? {};
  }, initialState);

  const initialPlates = profile.availablePlatesKg ? JSON.parse(profile.availablePlatesKg) : [];

  const [goal, setGoal] = useState(profile.goal ?? "general_fitness");
  const [barbellWeightKg, setBarbellWeightKg] = useState(String(profile.barbellWeightKg ?? ""));
  const [ezBarWeightKg, setEzBarWeightKg] = useState(String(profile.ezBarWeightKg ?? ""));
  const [platesInput, setPlatesInput] = useState(formatPlatesForInput(initialPlates));

  const plates = useMemo(() => parsePlatesInput(platesInput), [platesInput]);
  const barbellLoads = useMemo(
    () => (barbellWeightKg ? achievableBarLoads(Number(barbellWeightKg), plates) : []),
    [barbellWeightKg, plates]
  );
  const ezBarLoads = useMemo(
    () => (ezBarWeightKg ? achievableBarLoads(Number(ezBarWeightKg), plates) : []),
    [ezBarWeightKg, plates]
  );

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">Profile</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="displayName">Name</Label>
            <Input id="displayName" name="displayName" defaultValue={profile.displayName} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="age">Age</Label>
              <Input id="age" name="age" type="number" defaultValue={profile.age ?? ""} />
            </div>
            <div>
              <Label htmlFor="heightCm">Height (cm)</Label>
              <Input id="heightCm" name="heightCm" type="number" defaultValue={profile.heightCm ?? ""} />
            </div>
          </div>
          <div>
            <Label htmlFor="startingWeightKg">Bodyweight (kg)</Label>
            <Input id="startingWeightKg" name="startingWeightKg" type="number" step="0.1" defaultValue={profile.startingWeightKg ?? ""} />
          </div>
          <div>
            <Label htmlFor="goal">Primary goal</Label>
            <Select id="goal" name="goal" value={goal} onChange={(e) => setGoal(e.target.value)}>
              <option value="strength">Strength</option>
              <option value="hypertrophy">Hypertrophy / muscle</option>
              <option value="endurance">Endurance</option>
              <option value="general_fitness">General fitness</option>
            </Select>
          </div>
        </div>
        <p className="mt-2 text-xs text-text-muted">{GOAL_EXPLANATIONS[goal]}</p>
        <div className="mt-3 max-w-[200px]">
          <Label htmlFor="experienceLevel">Experience</Label>
          <Select id="experienceLevel" name="experienceLevel" defaultValue={profile.experienceLevel ?? "intermediate"}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </Select>
        </div>
        <p className="mt-1 text-xs text-text-muted">
          Goal and experience are labels for your own reference right now — they don&apos;t change any calculations. Worth
          knowing so you&apos;re not filling in fields expecting hidden logic that isn&apos;t there yet.
        </p>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">Equipment</h3>
        <p className="mb-3 text-xs text-text-muted">
          This pre-fills weight pickers when logging sets — nothing here is required, but the barbell/EZ-bar fields
          below also compute which total weights you can actually load, live, as you type.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="dumbbellMinKg">Dumbbell min (kg)</Label>
            <Input id="dumbbellMinKg" name="dumbbellMinKg" type="number" step="0.5" defaultValue={profile.dumbbellMinKg ?? ""} />
          </div>
          <div>
            <Label htmlFor="dumbbellMaxKg">Dumbbell max (kg)</Label>
            <Input id="dumbbellMaxKg" name="dumbbellMaxKg" type="number" step="0.5" defaultValue={profile.dumbbellMaxKg ?? ""} />
          </div>
          <div>
            <Label htmlFor="dumbbellStepKg">Adjust step (kg)</Label>
            <Input id="dumbbellStepKg" name="dumbbellStepKg" type="number" step="0.5" defaultValue={profile.dumbbellStepKg ?? 2.5} />
          </div>
          <div>
            <Label htmlFor="barbellWeightKg">Barbell rod (kg)</Label>
            <Input
              id="barbellWeightKg"
              name="barbellWeightKg"
              type="number"
              step="0.5"
              value={barbellWeightKg}
              onChange={(e) => setBarbellWeightKg(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="ezBarWeightKg">EZ curl bar (kg)</Label>
            <Input
              id="ezBarWeightKg"
              name="ezBarWeightKg"
              type="number"
              step="0.5"
              value={ezBarWeightKg}
              onChange={(e) => setEzBarWeightKg(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="availablePlatesKg">Plates owned (weight x how many)</Label>
            <Input
              id="availablePlatesKg"
              name="availablePlatesKg"
              value={platesInput}
              onChange={(e) => setPlatesInput(e.target.value)}
              placeholder="20x2, 10x4, 5x2"
            />
          </div>
          <div>
            <Label htmlFor="bandMinKg">Band min (kg)</Label>
            <Input id="bandMinKg" name="bandMinKg" type="number" defaultValue={profile.bandMinKg ?? ""} />
          </div>
          <div>
            <Label htmlFor="bandMaxKg">Band max (kg)</Label>
            <Input id="bandMaxKg" name="bandMaxKg" type="number" defaultValue={profile.bandMaxKg ?? ""} />
          </div>
        </div>

        {(barbellLoads.length > 0 || ezBarLoads.length > 0) && (
          <div className="mt-4 space-y-3 rounded-md border border-border bg-surface-2 p-3">
            {barbellLoads.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">
                  Barbell — every total you can load
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {barbellLoads.map((w) => (
                    <span key={w} className="rounded-full bg-surface px-2 py-0.5 font-mono text-xs tabular">
                      {w} kg
                    </span>
                  ))}
                </div>
              </div>
            )}
            {ezBarLoads.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">
                  EZ bar — every total you can load
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ezBarLoads.map((w) => (
                    <span key={w} className="rounded-full bg-surface px-2 py-0.5 font-mono text-xs tabular">
                      {w} kg
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="text-[11px] text-text-muted">
              Computed from real pairs (loaded symmetrically) — e.g. &quot;10x4&quot; means two pairs of 10s, so both a single
              10kg-per-side and a stacked 20kg-per-side load are possible.
            </p>
          </div>
        )}
      </div>

      {state?.error && <p className="text-sm text-accent-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-accent-strength">Saved.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}
