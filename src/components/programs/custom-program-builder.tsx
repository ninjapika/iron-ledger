"use client";

import { useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { Trash2, Plus, Pencil, ChevronUp } from "lucide-react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
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
  /** Client-only React/animation identity, generated once per day-draft
   * and never sent to the server (see the explicit payload mapping in
   * submit() below) — separate from `id` because a brand-new day doesn't
   * have a server id yet, but still needs a stable key so deleting an
   * earlier day animates the day that actually got removed instead of
   * whichever one ends up at the end of the array. */
  key: string;
  title: string;
  type: "strength" | "cardio" | "skill" | "rest";
  exercises: DayExerciseDraft[];
}

function newDay(title: string): DayDraft {
  return { key: crypto.randomUUID(), title, type: "strength", exercises: [] };
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
  initialDays?: Array<Omit<DayDraft, "key">>;
}) {
  const isEditing = !!programId;
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initialName ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [days, setDays] = useState<DayDraft[]>(
    initialDays?.length ? initialDays.map((d) => ({ ...d, key: crypto.randomUUID() })) : [newDay("Day 1")]
  );
  const [error, setError] = useState<string | null>(null);
  // Which single day currently has its exercise editor open, if any. A
  // multi-day program used to render every day's full exercise picker +
  // list stacked on the page at once — fine for one day, exhausting to
  // scroll past for five. Only one day's editor opens at a time now,
  // toggled by the pencil icon in that day's header; everything else shows
  // just a compact summary line. A brand-new program (still just its
  // default single day) opens straight into that day instead of making
  // the first click be "find the pencil."
  const [expandedKey, setExpandedKey] = useState<string | null>(initialDays?.length ? null : days[0].key);
  const [daysListRef] = useAutoAnimate();

  function addDay() {
    setDays((d) => {
      const day = newDay(`Day ${d.length + 1}`);
      setExpandedKey(day.key); // jump straight into editing the new day
      return [...d, day];
    });
  }

  function updateDay(key: string, patch: Partial<DayDraft>) {
    setDays((d) => d.map((day) => (day.key === key ? { ...day, ...patch } : day)));
  }

  function removeDay(key: string) {
    setDays((d) => d.filter((day) => day.key !== key));
    setExpandedKey((cur) => (cur === key ? null : cur));
  }

  function addExerciseToDay(key: string, ex: ExerciseOption) {
    setDays((d) =>
      d.map((day) =>
        day.key === key
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

  function removeExerciseFromDay(dayKey: string, exerciseId: string) {
    setDays((d) =>
      d.map((day) =>
        day.key === dayKey ? { ...day, exercises: day.exercises.filter((x) => x.exercise.id !== exerciseId) } : day
      )
    );
  }

  function updateExerciseField(dayKey: string, exerciseId: string, patch: Partial<DayExerciseDraft>) {
    setDays((d) =>
      d.map((day) =>
        day.key !== dayKey
          ? day
          : { ...day, exercises: day.exercises.map((x) => (x.exercise.id === exerciseId ? { ...x, ...patch } : x)) }
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

      <div className="space-y-4" ref={daysListRef}>
        {days.map((day) => (
          <ProgramDayCard
            key={day.key}
            day={day}
            exercises={exercises}
            expanded={expandedKey === day.key}
            canDelete={days.length > 1}
            onToggleExpanded={() => setExpandedKey(expandedKey === day.key ? null : day.key)}
            onUpdateDay={(patch) => updateDay(day.key, patch)}
            onRemoveDay={() => removeDay(day.key)}
            onAddExercise={(ex) => addExerciseToDay(day.key, ex)}
            onRemoveExercise={(exerciseId) => removeExerciseFromDay(day.key, exerciseId)}
            onUpdateExerciseField={(exerciseId, patch) => updateExerciseField(day.key, exerciseId, patch)}
          />
        ))}
      </div>

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

function ProgramDayCard({
  day,
  exercises,
  expanded,
  canDelete,
  onToggleExpanded,
  onUpdateDay,
  onRemoveDay,
  onAddExercise,
  onRemoveExercise,
  onUpdateExerciseField,
}: {
  day: DayDraft;
  exercises: ExerciseOption[];
  expanded: boolean;
  canDelete: boolean;
  onToggleExpanded: () => void;
  onUpdateDay: (patch: Partial<DayDraft>) => void;
  onRemoveDay: () => void;
  onAddExercise: (ex: ExerciseOption) => void;
  onRemoveExercise: (exerciseId: string) => void;
  onUpdateExerciseField: (exerciseId: string, patch: Partial<DayExerciseDraft>) => void;
}) {
  const allowedCategories = categoriesForWorkoutType(day.type === "rest" ? "manual" : day.type);
  const [exerciseListRef] = useAutoAnimate();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Input value={day.title} onChange={(e) => onUpdateDay({ title: e.target.value })} className="max-w-[200px]" />
          <Select
            value={day.type}
            onChange={(e) => onUpdateDay({ type: e.target.value as DayDraft["type"] })}
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
              onClick={onToggleExpanded}
              className="rounded p-1.5 text-text-muted hover:bg-surface-2 hover:text-text"
              aria-label={expanded ? "Done editing this day's exercises" : "Edit this day's exercises"}
              title={expanded ? "Done" : "Edit exercises"}
            >
              {expanded ? <ChevronUp size={16} /> : <Pencil size={14} />}
            </button>
          )}
          {canDelete && (
            <button
              onClick={onRemoveDay}
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
              if (ex) onAddExercise(ex);
            }}
          />
          <div className="space-y-3" ref={exerciseListRef}>
            {day.exercises.map((e) => {
              const timed = e.exercise.trackingType === "duration";
              return (
                <div key={e.exercise.id} className="flex flex-wrap items-center gap-2 rounded bg-surface-2 px-3 py-2 text-sm">
                  <span className="flex-1 min-w-[120px] font-medium">{e.exercise.name}</span>
                  <span className="text-[10px] text-text-muted">{EQUIPMENT_LABELS[e.exercise.equipment]}</span>
                  <Input
                    className="w-16"
                    value={e.sets}
                    onChange={(ev) => onUpdateExerciseField(e.exercise.id, { sets: ev.target.value })}
                    placeholder="Sets"
                  />
                  {timed ? (
                    <Input
                      className="w-24"
                      value={e.durationSec}
                      onChange={(ev) => onUpdateExerciseField(e.exercise.id, { durationSec: ev.target.value })}
                      placeholder="Seconds"
                    />
                  ) : (
                    <Input
                      className="w-20"
                      value={e.reps}
                      onChange={(ev) => onUpdateExerciseField(e.exercise.id, { reps: ev.target.value })}
                      placeholder="Reps"
                    />
                  )}
                  <Input
                    className="w-20"
                    value={e.restSec}
                    onChange={(ev) => onUpdateExerciseField(e.exercise.id, { restSec: ev.target.value })}
                    placeholder="Rest s"
                  />
                  <button onClick={() => onRemoveExercise(e.exercise.id)} className="text-text-muted hover:text-accent-danger">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
