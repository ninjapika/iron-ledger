"use client";

import { useState, useTransition } from "react";
import { startLiveWorkout } from "@/lib/actions/workouts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";
import { WorkoutTypeSelector, type WorkoutType } from "./workout-type-selector";

export function StartLiveWorkoutButton() {
  const [workoutType, setWorkoutType] = useState<WorkoutType>("strength");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <div>
        <Label>What kind of session?</Label>
        <WorkoutTypeSelector value={workoutType} onChange={setWorkoutType} />
      </div>
      <Button
        className="w-full"
        disabled={isPending}
        onClick={() => startTransition(() => startLiveWorkout(undefined, undefined, undefined, workoutType))}
      >
        {isPending ? "Starting…" : "Start Live Workout"}
      </Button>
    </div>
  );
}
