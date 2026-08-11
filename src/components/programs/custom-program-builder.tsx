"use client";

import { useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { Trash2, Plus, Pencil, ChevronUp } from "lucide-react";
import { ExercisePicker, type ExerciseOption } from "@/components/workout/exercise-picker";
import { createCustomProgram, updateCustomProgram, type CustomDayInput } from "@/lib/actions/programs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/field";
import { EQUIPMENT_LABELS, categoriesForWorkoutType } from "@/lib/data/exercise-labels";

interface DayExerciseDraft {
  exercise: ExerciseOption;
  sets: string;
  reps: string;
  durationSec: string;
  restSec: string;
}

interface DayDraft {
  /** Present for a day that already exists in the DB — omitted for a new
   * one added in this editing session. Preserved through to the update
   * action so existing days get updated in place, not deleted+recreated. */
  id?: string;
  title: string;
  type: "strength" | "cardio" | "skill" | "rest";
  exercises: DayExerciseDraft[];
}

export function CustomProgramBuilder({
  exercises,
  programId,
  initialName,
  initialDescription,
  initialDays,
}: {
  exercises: ExerciseOption[];
  /** Presence of these props switches the component into edit mode:
   * pre-filled fields, "Save Changes" instead of "Save Program", and
   * updateCustomProgram instead of createCustomProgram on submit. */
  programId?: string;
  initialName?: string;
  initialDescription?: string;
  initialDays?: DayDraft[];
}) {
  const isEditing = !!programId;
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initialName ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [days, setDays] = useState<DayDraft[]>(initialDays?.length ? initialDays : [{ title: "Day 1", type: "strength", exercises: [] }]);
  const [error, setError] = useState<string | null>(null);
  // Which single day currently has its exercise editor open, if any. A
  // multi-day program used to render every day's full exercise picker +
  // list stacked on the page at once — fine for one day, exhausting to
  // scroll past for five. Only one day's editor opens at a time now,
  // toggled by the pencil icon in that day's header; everything else shows
  // just a compact summary line. A brand-new program (still just its
  // default single day) opens straight into that day instead of making
  // the first click be "find the pencil."
  const [expandedIdx, setExpandedIdx] = useState<number | null>(initialDays?.length ? null : 0);

  function addDay() {
    setDays((d) => {
      setExpandedIdx(d.length); // jump straight into editing the new day
      return [...d, { title: `Day ${d.length + 1}`, type: "strength", exercises: [] }];
    });
  }

  function updateDay(i: number, patch: Partial<DayDraft>) {
    setDays((d) => d.map((day, idx) => (idx === i ? { ...day, ...patch } : day)));
  }

  function removeDay(i: number) {
    setDays((d) => d.filter((_, idx) => idx !== i));
    setExpandedIdx((cur) => (cur === null ? null : cur === i ? null : cur > i ? cur - 1 : cur));
  }

  function addExerciseToDay(dayIdx: number, ex: ExerciseOption) {
    setDays((d) =>
      d.map((day, idx) =>
        idx === dayIdx
          ? {
              ...day,
              // Newest exercise goes on top — same ordering the live-workout
              // and logged-workout pickers use, so it's immediately visible
              // instead of requiring a scroll past everything already added.
              exercises: [{ exercise: ex, sets: "3", reps: "10", durationSec: "", restSec: "" }, ...day.exercises],
            }
          : day
      )
    );
  }

  function removeExerciseFromDay(dayIdx: number, exIdx: number) {
    setDays((d) =>
      d.map((day, idx) => (idx === dayIdx ? { ...day, exercises: day.exercises.filter((_, j) => j !== exIdx) } : day))
    );
  }

  function updateExerciseField(dayIdx: number, exIdx: number, patch: Partial<DayExerciseDraft>) {
    setDays((d) =>
      d.map((dd, i) =>
        i !== dayIdx ? dd : { ...dd, exercises: dd.exercises.map((x, j) => (j === exIdx ? { ...x, ...patch } : x)) }
      )
    );
  }

  function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Give the program a name.");
      return;
    }
    const payload: CustomDayInput[] = days.map((d, i) => ({
      id: d.id,
      dayIndex: i + 1,
      title: d.title,
      type: d.type,
      exercises: d.exercises.map((e) => ({
        exerciseId: e.exercise.id,
        sets: e.sets ? Number(e.sets) : undefined,
        reps: e.exercise.trackingType === "duration" ? undefined : e.reps || undefined,
        durationSec: e.exercise.trackingType === "duration" && e.durationSec ? Number(e.durationSec) : undefined,
        restSec: e.restSec ? Number(e.restSec) : undefined,
      })),
    }));
    startTransition(async () => {
      try {
        if (isEditing) {
          await updateCustomProgram(programId!, name.trim(), description.trim(), payload);
        } else {
          await createCustomProgram(name.trim(), description.trim(), payload);
        }
      } catch (err) {
        // redirect() (on success) works by throwing an internal Next.js
        // control-flow error — this lets that through untouched so
        // navigation still happens, while catching anything else as a
        // real validation error to show the user.
        unstable_rethrow(err);
        setError(err instanceof Error ? err.message : "Something went wrong saving this program.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 pt-5">
          <div>
            <Label htmlFor="prog-name">Program name</Label>
            <Input id="prog-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Home Push/Pull/Legs" />
          </div>
          <div>
            <Label htmlFor="prog-desc">Description (optional)</Label>
            <Input id="prog-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {days.map((day, dayIdx) => {
        const allowedCategories = categoriesForWorkoutType(day.type === "rest" ? "manual" : day.type);
        const expanded = expandedIdx === dayIdx;
        return (
          <Card key={dayIdx}>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <Input value={day.title} onChange={(e) => updateDay(dayIdx, { title: e.target.value })} className="max-w-[200px]" />
                <Select
                  value={day.type}
                  onChange={(e) => updateDay(dayIdx, { type: e.target.value as DayDraft["type"] })}
                  className="max-w-[140px]"
                >
                  <option value="strength">Strength</option>
                  <option value="cardio">Cardio</option>
                  <option value="skill">Skill</option>
                  <option value="rest">Rest</option>
                </Select>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {day.type !== "rest" && (
                  <button
                    type="button"
                    onClick={() => setExpandedIdx(expanded ? null : dayIdx)}
                    className="rounded p-1.5 text-text-muted hover:bg-surface-2 hover:text-text"
                    aria-label={expanded ? "Done editing this day's exercises" : "Edit this day's exercises"}
                    title={expanded ? "Done" : "Edit exercises"}
                  >
                    {expanded ? <ChevronUp size={16} /> : <Pencil size={14} />}
                  </button>
                )}
                {days.length > 1 && (
                  <button
                    onClick={() => removeDay(dayIdx)}
                    className="rounded p-1.5 text-text-muted hover:bg-surface-2 hover:text-accent-danger"
                    aria-label="Delete day"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </CardHeader>

            {day.type !== "rest" && !expanded && (
              <CardContent className="pt-0">
                <p className="text-xs text-text-muted">
                  {day.exercises.length === 0
                    ? "No exercises yet."
                    : `${day.exercises.length} exercise${day.exercises.length === 1 ? "" : "s"}: ${day.exercises
                        .map((e) => e.exercise.name)
                        .join(", ")}`}
                </p>
              </CardContent>
            )}

            {day.type !== "rest" && expanded && (
              <CardContent className="space-y-3">
                <ExercisePicker
                  exercises={exercises}
                  excludeIds={day.exercises.map((e) => e.exercise.id)}
                  allowedCategories={allowedCategories}
                  onSelect={(id) => {
                    const ex = exercises.find((e) => e.id === id);
                    if (ex) addExerciseToDay(dayIdx, ex);
                  }}
                />
                {day.exercises.map((e, exIdx) => {
                  const timed = e.exercise.trackingType === "duration";
                  return (
                    <div key={exIdx} className="flex flex-wrap items-center gap-2 rounded bg-surface-2 px-3 py-2 text-sm">
                      <span className="flex-1 min-w-[120px] font-medium">{e.exercise.name}</span>
                      <span className="text-[10px] text-text-muted">{EQUIPMENT_LABELS[e.exercise.equipment]}</span>
                      <Input
                        className="w-16"
                        value={e.sets}
                        onChange={(ev) => updateExerciseField(dayIdx, exIdx, { sets: ev.target.value })}
                        placeholder="Sets"
                      />
                      {timed ? (
                        <Input
                          className="w-24"
                          value={e.durationSec}
                          onChange={(ev) => updateExerciseField(dayIdx, exIdx, { durationSec: ev.target.value })}
                          placeholder="Seconds"
                        />
                      ) : (
                        <Input
                          className="w-20"
                          value={e.reps}
                          onChange={(ev) => updateExerciseField(dayIdx, exIdx, { reps: ev.target.value })}
                          placeholder="Reps"
                        />
                      )}
                      <Input
                        className="w-20"
                        value={e.restSec}
                        onChange={(ev) => updateExerciseField(dayIdx, exIdx, { restSec: ev.target.value })}
                        placeholder="Rest s"
                      />
                      <button onClick={() => removeExerciseFromDay(dayIdx, exIdx)} className="text-text-muted hover:text-accent-danger">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </CardContent>
            )}
          </Card>
        );
      })}

      <Button variant="secondary" onClick={addDay} className="gap-1.5">
        <Plus size={15} />
        Add day
      </Button>

      {error && <p className="text-sm text-accent-danger">{error}</p>}

      <div>
        <Button onClick={submit} disabled={isPending}>
          {isPending ? "Saving…" : isEditing ? "Save Changes" : "Save Program"}
        </Button>
      </div>
    </div>
  );
}
