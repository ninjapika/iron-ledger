"use client";

import { useActionState, useRef, useState } from "react";
import { signUp, type ActionResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";

const initialState: ActionResult = {};
const STEPS = ["Account", "Profile", "Equipment"] as const;

export function SignUpForm() {
  const [step, setStep] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(async (_: ActionResult, formData: FormData) => {
    return (await signUp(formData)) ?? {};
  }, initialState);

  const isLast = step === STEPS.length - 1;

  // Required fields only exist on step 0 today. Checking them here — while
  // that section is still visible — lets the browser show its native
  // validation bubble and focus the field. Waiting until final submit
  // would fail silently instead: a required field inside a display:none
  // section can't be focused, so the browser blocks submission without
  // showing the user anything at all.
  function goNext() {
    if (step === 0) {
      const valid = ["email", "password", "displayName"].every((id) => {
        const el = formRef.current?.querySelector<HTMLInputElement>(`#${id}`);
        return el ? el.reportValidity() : true;
      });
      if (!valid) return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border font-mono text-xs tabular",
                i <= step
                  ? "border-accent-strength bg-accent-strength text-bg"
                  : "border-border text-text-muted"
              )}
            >
              {i + 1}
            </div>
            <span className={cn("text-xs uppercase tracking-wide", i <= step ? "text-text" : "text-text-muted")}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1: Account */}
      <section className={cn("space-y-4", step !== 0 && "hidden")}>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <div>
          <Label htmlFor="displayName">What should we call you?</Label>
          <Input id="displayName" name="displayName" required />
        </div>
      </section>

      {/* Step 2: Profile */}
      <section className={cn("space-y-4", step !== 1 && "hidden")}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="age">Age</Label>
            <Input id="age" name="age" type="number" min={10} max={100} />
          </div>
          <div>
            <Label htmlFor="heightCm">Height (cm)</Label>
            <Input id="heightCm" name="heightCm" type="number" min={100} max={250} />
          </div>
        </div>
        <div>
          <Label htmlFor="startingWeightKg">Current bodyweight (kg)</Label>
          <Input id="startingWeightKg" name="startingWeightKg" type="number" step="0.1" min={30} max={300} />
        </div>
        <div>
          <Label htmlFor="goal">Primary goal</Label>
          <Select id="goal" name="goal" defaultValue="general_fitness">
            <option value="strength">Strength</option>
            <option value="hypertrophy">Hypertrophy / muscle</option>
            <option value="endurance">Endurance</option>
            <option value="general_fitness">General fitness</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="experienceLevel">Experience level</Label>
          <Select id="experienceLevel" name="experienceLevel" defaultValue="intermediate">
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </Select>
        </div>
      </section>

      {/* Step 3: Equipment */}
      <section className={cn("space-y-4", step !== 2 && "hidden")}>
        <p className="text-xs text-text-muted">
          These pre-fill weight pickers when logging sets — you can change any of it later in Settings.
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="dumbbellMinKg">Dumbbell min (kg)</Label>
            <Input id="dumbbellMinKg" name="dumbbellMinKg" type="number" step="0.5" />
          </div>
          <div>
            <Label htmlFor="dumbbellMaxKg">Dumbbell max (kg)</Label>
            <Input id="dumbbellMaxKg" name="dumbbellMaxKg" type="number" step="0.5" />
          </div>
          <div>
            <Label htmlFor="dumbbellStepKg">Adjust step (kg)</Label>
            <Input id="dumbbellStepKg" name="dumbbellStepKg" type="number" step="0.5" defaultValue={2.5} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="barbellWeightKg">Barbell rod weight (kg)</Label>
            <Input id="barbellWeightKg" name="barbellWeightKg" type="number" step="0.5" />
          </div>
          <div>
            <Label htmlFor="ezBarWeightKg">EZ curl bar weight (kg)</Label>
            <Input id="ezBarWeightKg" name="ezBarWeightKg" type="number" step="0.5" />
          </div>
        </div>
        <div>
          <Label htmlFor="availablePlatesKg">Plates you own (weight x how many, e.g. one pair of 20s + two pairs of 10s)</Label>
          <Input id="availablePlatesKg" name="availablePlatesKg" placeholder="20x2, 10x4, 5x2, 2.5x2" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="bandMinKg">Resistance band min (kg)</Label>
            <Input id="bandMinKg" name="bandMinKg" type="number" step="1" defaultValue={40} />
          </div>
          <div>
            <Label htmlFor="bandMaxKg">Resistance band max (kg)</Label>
            <Input id="bandMaxKg" name="bandMaxKg" type="number" step="1" defaultValue={60} />
          </div>
        </div>
      </section>

      {state?.error && <p className="text-sm text-accent-danger">{state.error}</p>}

      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className={step === 0 ? "invisible" : ""}
        >
          Back
        </Button>
        {isLast ? (
          <Button type="submit" disabled={pending}>
            {pending ? "Creating account…" : "Create account"}
          </Button>
        ) : (
          <Button type="button" onClick={goNext}>
            Continue
          </Button>
        )}
      </div>
    </form>
  );
}
