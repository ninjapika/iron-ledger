"use client";

import { useMemo, useState, useTransition } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Trash2 } from "lucide-react";
import { ExercisePicker, type ExerciseOption } from "./exercise-picker";
import { createLoggedWorkout, type LoggedSetInput } from "@/lib/actions/workouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";
import { EQUIPMENT_LABELS, categoriesForWorkoutType } from "@/lib/data/exercise-labels";
import { WorkoutTypeSelector, type WorkoutType } from "./workout-type-selector";

interface DraftSet {
  /** Client-only identity for React/animation purposes — never sent to the
   * server (the submit payload below only reads reps/durationSec/weight/
   * warmup off each set). Without a stable key here, deleting a set from
   * the middle of the list makes React reuse existing DOM nodes for the
   * shifted rows and only truly remove the last one — so the delete
   * animation would play on the wrong row. */
  id: string;
  reps: string;
  durationSec: string;
  weight: string;
  warmup: boolean;
}

interface DraftExercise {
  exercise: ExerciseOption;
  sets: DraftSet[];
}

function usesWeight(equipment: string) {
  return equipment !== "bodyweight" && equipment !== "cardio";
}

function emptySet(): DraftSet {
  return { id: crypto.randomUUID(), reps: "", durationSec: "", weight: "", warmup: false };
}

export function LoggedWorkoutForm({ exercises }: { exercises: ExerciseOption[] }) {
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });
  const [workoutType, setWorkoutType] = useState<WorkoutType>("strength");
  const [notes, setNotes] = useState("");
  const [drafts, setDrafts] = useState<DraftExercise[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [exerciseListRef] = useAutoAnimate();

  const allowedCategories = useMemo(() => categoriesForWorkoutType(workoutType), [workoutType]);

  function addExercise(id: string) {
    const ex = exercises.find((e) => e.id === id);
    if (!ex) return;
    // Newest addition goes on top — same ordering the live-workout picker
    // uses (see LiveSessionClient), so a freshly-added exercise is always
    // right there instead of requiring a scroll past everything already
    // logged.
    setDrafts((prev) => [{ exercise: ex, sets: [emptySet()] }, ...prev]);
  }

  function updateSet(exIdx: number, setIdx: number, patch: Partial<DraftSet>) {
    setDrafts((prev) =>
      prev.map((d, i) =>
        i !== exIdx ? d : { ...d, sets: d.sets.map((s, j) => (j === setIdx ? { ...s, ...patch } : s)) }
      )
    );
  }

  function addSetRow(exIdx: number) {
    setDrafts((prev) => prev.map((d, i) => (i !== exIdx ? d : { ...d, sets: [...d.sets, emptySet()] })));
  }

  function removeSetRow(exIdx: number, setIdx: number) {
    setDrafts((prev) =>
      prev.map((d, i) => (i !== exIdx ? d : { ...d, sets: d.sets.filter((_, j) => j !== setIdx) }))
    );
  }

  function removeExercise(exIdx: number) {
    setDrafts((prev) => prev.filter((_, i) => i !== exIdx));
  }

  function submit() {
    setError(null);
    const sets: LoggedSetInput[] = [];
    for (const d of drafts) {
      const timed = d.exercise.trackingType === "duration";
      for (const s of d.sets) {
        if (timed ? !s.durationSec : !s.reps && !s.weight) continue;
        sets.push({
          exerciseId: d.exercise.id,
          reps: !timed && s.reps ? Number(s.reps) : undefined,
          durationSec: timed && s.durationSec ? Number(s.durationSec) : undefined,
          weightKg: s.weight ? Number(s.weight) : undefined,
          isWarmup: s.warmup,
        });
      }
    }
    if (sets.length === 0) {
      setError(timedHint(drafts));
      return;
    }
    // A date-only or ambiguous string silently gets parsed as UTC midnight
    // by JS, which is exactly the "shows 5:30am" bug — combining date+time
    // with no trailing "Z" makes the browser parse it as local time instead,
    // then toISOString() carries that exact instant through correctly.
    const localDateTime = new Date(`${date}T${time}:00`);
    startTransition(async () => {
      await createLoggedWorkout(localDateTime.toISOString(), notes, sets, workoutType);
    });
  }

  function timedHint(d: DraftExercise[]): string {
    if (d.some((x) => x.exercise.trackingType === "duration")) {
      return "Add a duration for at least one set.";
    }
    return "Add at least one set with reps or weight.";
  }

  return (
    <div className="space-y-6">
      <div>
        <Label>What kind of session was this?</Label>
        <WorkoutTypeSelector value={workoutType} onChange={setWorkoutType} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="time">Time</Label>
          <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="notes">Notes (optional)</Label>
          <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How it felt…" />
        </div>
      </div>

      <ExercisePicker
        exercises={exercises}
        excludeIds={drafts.map((d) => d.exercise.id)}
        onSelect={addExercise}
        allowedCategories={allowedCategories}
        placeholder={workoutType === "manual" ? "Add any exercise…" : `Add a ${workoutType} exercise…`}
      />

      <div className="space-y-4" ref={exerciseListRef}>
        {drafts.map((d, exIdx) => (
          <DraftExerciseCard
            key={d.exercise.id}
            draft={d}
            onRemoveExercise={() => removeExercise(exIdx)}
            onUpdateSet={(setIdx, patch) => updateSet(exIdx, setIdx, patch)}
            onAddSet={() => addSetRow(exIdx)}
            onRemoveSet={(setIdx) => removeSetRow(exIdx, setIdx)}
          />
        ))}
      </div>

      {error && <p className="text-sm text-accent-danger">{error}</p>}

      <Button onClick={submit} disabled={isPending || drafts.length === 0} className="w-full sm:w-auto">
        {isPending ? "Saving…" : "Save Workout"}
      </Button>
    </div>
  );
}

function DraftExerciseCard({
  draft,
  onRemoveExercise,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
}: {
  draft: DraftExercise;
  onRemoveExercise: () => void;
  onUpdateSet: (setIdx: number, patch: Partial<DraftSet>) => void;
  onAddSet: () => void;
  onRemoveSet: (setIdx: number) => void;
}) {
  const showWeight = usesWeight(draft.exercise.equipment);
  const timed = draft.exercise.trackingType === "duration";
  const [setsListRef] = useAutoAnimate();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{draft.exercise.name}</CardTitle>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-text-muted">{EQUIPMENT_LABELS[draft.exercise.equipment]}</span>
          <button onClick={onRemoveExercise} className="text-text-muted hover:text-accent-danger">
            <Trash2 size={15} />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="space-y-2" ref={setsListRef}>
          {draft.sets.map((s, setIdx) => (
            <div key={s.id} className="flex flex-wrap items-center gap-2">
              <span className="w-5 font-mono text-xs text-text-muted">{setIdx + 1}</span>
              {timed ? (
                <Input
                  type="number"
                  placeholder="Seconds held"
                  className="w-32"
                  value={s.durationSec}
                  onChange={(e) => onUpdateSet(setIdx, { durationSec: e.target.value })}
                />
              ) : (
                <Input
                  type="number"
                  placeholder="Reps"
                  className="w-20"
                  value={s.reps}
                  onChange={(e) => onUpdateSet(setIdx, { reps: e.target.value })}
                />
              )}
              {showWeight && (
                <Input
                  type="number"
                  step="0.5"
                  placeholder="kg"
                  className="w-24"
                  value={s.weight}
                  onChange={(e) => onUpdateSet(setIdx, { weight: e.target.value })}
                />
              )}
              <label className="flex items-center gap-1.5 text-xs text-text-muted">
                <input
                  type="checkbox"
                  checked={s.warmup}
                  onChange={(e) => onUpdateSet(setIdx, { warmup: e.target.checked })}
                />
                Warm-up
              </label>
              <button onClick={() => onRemoveSet(setIdx)} className="ml-auto text-text-muted hover:text-accent-danger">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={onAddSet} className="text-xs text-accent-strength hover:underline">
          + Add set
        </button>
      </CardContent>
    </Card>
  );
}
