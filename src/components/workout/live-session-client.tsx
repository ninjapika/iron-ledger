"use client";

import { useMemo, useState, useTransition, useEffect, useRef } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Trash2, Flame, Clock, Activity, BedDouble } from "lucide-react";
import { ExercisePicker, type ExerciseOption } from "./exercise-picker";
import { RestTimerDisplay } from "./rest-timer-display";
import { useRestTimer } from "@/hooks/use-rest-timer";
import { addSet, deleteSet, finishWorkout } from "@/lib/actions/workouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { EQUIPMENT_LABELS } from "@/lib/data/exercise-labels";
import { formatDuration, formatKg } from "@/lib/format";

export interface SetRow {
  id: string;
  exerciseId: string;
  setNumber: number;
  reps: number | null;
  durationSec: number | null;
  weightKg: number | null;
  rpe: number | null;
  isWarmup: boolean;
  restTakenSec?: number | null;
}

interface EquipmentDefaults {
  dumbbellStepKg: number;
  dumbbellMinKg: number | null;
  barbellWeightKg: number | null;
  ezBarWeightKg: number | null;
  bandMinKg: number | null;
}

interface PrefillExercise {
  exerciseId: string;
  name: string;
  equipment: string;
  category: string;
  trackingType: string;
  targetSets: number | null;
  targetReps: string | null;
  targetDurationSec: number | null;
  targetRounds: number | null;
  restSec: number | null;
}

function usesWeight(equipment: string) {
  return equipment !== "bodyweight" && equipment !== "cardio";
}

function defaultStep(equipment: string, eq: EquipmentDefaults) {
  if (equipment === "dumbbell") return eq.dumbbellStepKg || 2.5;
  if (equipment === "barbell") return 2.5;
  return 1;
}

function targetLabel(p?: PrefillExercise): string | null {
  if (!p) return null;
  const parts: string[] = [];
  if (p.targetRounds) parts.push(`${p.targetRounds} rounds`);
  else if (p.targetSets) parts.push(`${p.targetSets} sets`);
  if (p.targetDurationSec) parts.push(`${p.targetDurationSec}s`);
  else if (p.targetReps) parts.push(`× ${p.targetReps}`);
  return parts.length ? `Target: ${parts.join(" ")}` : null;
}

export function LiveSessionClient({
  sessionId,
  createdAt,
  exercises,
  pickerExercises,
  initialSets,
  allowedCategories,
  programContext,
  prefillExercises,
  unmatchedNames,
  equipmentDefaults,
}: {
  sessionId: string;
  createdAt: string;
  /** Full catalog — resolves a card for any id already active in the
   * session (prefilled or logged), regardless of equipment. */
  exercises: ExerciseOption[];
  /** Narrower list for the "add an exercise" search box only. */
  pickerExercises: ExerciseOption[];
  initialSets: SetRow[];
  allowedCategories: string[] | null;
  programContext: { programName: string; dayTitle: string } | null;
  prefillExercises: PrefillExercise[];
  unmatchedNames: string[];
  equipmentDefaults: EquipmentDefaults;
}) {
  const timer = useRestTimer();
  const [isPending, startTransition] = useTransition();
  // Keys here are already stable (real exercise ids, not array index — see
  // PATCHING.md-style reasoning in custom-program-builder.tsx for why that
  // distinction matters), so auto-animate's enter/exit detection lands on
  // the right card instead of whichever one happens to sit at the end.
  const [exerciseListRef] = useAutoAnimate();

  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const prefillById = useMemo(() => new Map(prefillExercises.map((p) => [p.exerciseId, p])), [prefillExercises]);

  const [activeIds, setActiveIds] = useState<string[]>(() => [
    ...new Set([...prefillExercises.map((p) => p.exerciseId), ...initialSets.map((s) => s.exerciseId)]),
  ]);

  // Active vs. rest is driven by the rest-timer widget itself: time counts
  // as "rest" only while a countdown is actually running (auto-started
  // after logging a set, or started manually via a Quick Rest preset);
  // everything else — including the moment before the very first set, and
  // any time after a countdown naturally finishes or gets skipped — counts
  // as active. That's what makes clicking +15s or a preset actually show up
  // live instead of only being reflected retroactively.
  //
  // Segment boundaries are tracked as absolute timestamps (not incremented
  // counters), so the display self-corrects every render instead of
  // drifting if a tick is ever delayed (e.g. a backgrounded tab).
  const startMs = new Date(createdAt).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsed = Math.max(0, Math.floor((now - startMs) / 1000));

  const initialRestSec = useMemo(() => initialSets.reduce((sum, s) => sum + (s.restTakenSec ?? 0), 0), [initialSets]);
  // Two separate running totals, both fed by the same "a rest segment just
  // closed" event, but with different lifetimes:
  //  - sessionRestSec: cumulative for the whole session, never reset — this
  //    is what the "Rest" stat bar shows.
  //  - pendingSinceLogSec: rest banked since the LAST logged set only,
  //    reset to 0 every time a set is logged — this is what gets persisted
  //    as the NEXT set's restTakenSec.
  // Conflating these into one variable is what caused the very bug being
  // fixed here: a closed segment got added to the running total once when
  // it closed, then added AGAIN when the next set logged and re-banked the
  // same number.
  const [sessionRestSec, setSessionRestSec] = useState(initialRestSec);
  const [pendingSinceLogSec, setPendingSinceLogSec] = useState(0);
  // Timestamp the current rest segment started at, or null when not
  // resting — kept as state (not a ref) since it's read during render.
  const [restSegmentStart, setRestSegmentStart] = useState<number | null>(null);
  const wasRunningRef = useRef(false);

  useEffect(() => {
    if (timer.running && !wasRunningRef.current) {
      // A rest period just started (preset click or auto-start after a log).
      setRestSegmentStart(Date.now());
    } else if (!timer.running && wasRunningRef.current) {
      // Just stopped — naturally finished or hit Skip. Bank whatever
      // elapsed into BOTH totals so "active" can resume ticking from here
      // without losing that segment or double-counting it later.
      setRestSegmentStart((startedAt) => {
        if (startedAt != null) {
          const dur = Math.round((Date.now() - startedAt) / 1000);
          setSessionRestSec((s) => s + dur);
          setPendingSinceLogSec((p) => p + dur);
        }
        return null;
      });
    }
    wasRunningRef.current = timer.running;
  }, [timer.running]);

  const liveOpenSec = restSegmentStart != null ? Math.round((now - restSegmentStart) / 1000) : 0;
  const displayedRestSec = sessionRestSec + liveOpenSec;
  const activeSec = Math.max(0, elapsed - displayedRestSec);

  function pendingRestSec(): number {
    // Whatever's accumulated toward rest since the last logged set,
    // including any segment still in progress right now — this is what
    // gets persisted as that set's restTakenSec, so the live number and
    // the historical record always agree. Uses the actual clock rather
    // than the ticked `now` state so it's precise at the instant of
    // clicking "Log Set," not just as of the last 1s tick.
    const live = restSegmentStart != null ? Math.round((Date.now() - restSegmentStart) / 1000) : 0;
    return pendingSinceLogSec + live;
  }

  const setsByExercise = useMemo(() => {
    const map = new Map<string, SetRow[]>();
    for (const s of initialSets) {
      if (!map.has(s.exerciseId)) map.set(s.exerciseId, []);
      map.get(s.exerciseId)!.push(s);
    }
    return map;
  }, [initialSets]);

  function recordSetLogged() {
    // Whatever's still open right now hasn't been folded into
    // sessionRestSec yet (only CLOSED segments are, via the effect above)
    // — claim that open portion into the session total now, since it just
    // got attributed to this set's persisted restTakenSec.
    const openPortion = restSegmentStart != null ? Math.round((Date.now() - restSegmentStart) / 1000) : 0;
    setSessionRestSec((s) => s + openPortion);
    setPendingSinceLogSec(0);
    // If a countdown is still running (e.g. it was already going for a
    // different exercise), rebase it to start fresh from now — its
    // elapsed-so-far was just claimed above, so leaving the old start
    // timestamp in place would double-count that span once it closes.
    setRestSegmentStart((start) => (start != null ? Date.now() : null));
  }

  return (
    <div>
      <RestTimerDisplay timer={timer} />

      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">
            Live workout{programContext ? ` · ${programContext.programName} — ${programContext.dayTitle}` : ""}
          </p>
          <p className="font-mono text-2xl tabular text-text">{formatDuration(elapsed)}</p>
        </div>
        <Button
          variant="secondary"
          disabled={isPending}
          onClick={() => startTransition(() => finishWorkout(sessionId))}
        >
          Finish Workout
        </Button>
      </div>

      <div className="mb-6 flex gap-4 rounded-theme border border-border bg-surface-2 px-4 py-2.5 text-xs text-text-muted">
        <span className="flex items-center gap-1.5">
          <Clock size={13} /> Total {formatDuration(elapsed)}
        </span>
        <span className="flex items-center gap-1.5">
          <Activity size={13} className="text-accent-strength" /> Active {formatDuration(activeSec)}
        </span>
        <span className="flex items-center gap-1.5">
          <BedDouble size={13} className="text-accent-cardio" /> Rest {formatDuration(displayedRestSec)}
        </span>
      </div>

      {unmatchedNames.length > 0 && (
        <p className="mb-4 rounded-theme border border-accent-highlight/30 bg-accent-highlight/10 px-3 py-2 text-xs text-text-muted">
          {unmatchedNames.length} item{unmatchedNames.length > 1 ? "s" : ""} from this day&apos;s plan
          couldn&apos;t be matched to a catalog exercise ({unmatchedNames.join(", ")}) — add them manually below
          if you did them.
        </p>
      )}

      <div className="mb-6">
        <ExercisePicker
          exercises={pickerExercises}
          excludeIds={activeIds}
          onSelect={(id) => setActiveIds((prev) => [id, ...prev])}
          allowedCategories={allowedCategories}
        />
      </div>

      <div className="space-y-4" ref={exerciseListRef}>
        {activeIds.length === 0 && (
          <p className="text-sm text-text-muted">Add an exercise above to start logging sets.</p>
        )}
        {activeIds.map((exId) => {
          const ex = exerciseById.get(exId);
          if (!ex) return null;
          return (
            <ExerciseCard
              key={exId}
              exercise={ex}
              target={prefillById.get(exId)}
              sets={setsByExercise.get(exId) ?? []}
              sessionId={sessionId}
              equipmentDefaults={equipmentDefaults}
              onLoggedSet={(restSec) => timer.start(restSec)}
              pendingRestSec={pendingRestSec}
              onSetRecorded={recordSetLogged}
            />
          );
        })}
      </div>
    </div>
  );
}

function ExerciseCard({
  exercise,
  target,
  sets,
  sessionId,
  equipmentDefaults,
  onLoggedSet,
  pendingRestSec,
  onSetRecorded,
}: {
  exercise: ExerciseOption & { defaultRestSec?: number };
  target?: PrefillExercise;
  sets: SetRow[];
  sessionId: string;
  equipmentDefaults: EquipmentDefaults;
  onLoggedSet: (restSec: number) => void;
  pendingRestSec: () => number;
  onSetRecorded: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const showWeight = usesWeight(exercise.equipment);
  const timed = exercise.trackingType === "duration";
  const lastSet = sets[sets.length - 1];

  const suggestedWeight =
    lastSet?.weightKg ??
    (exercise.equipment === "dumbbell"
      ? equipmentDefaults.dumbbellMinKg ?? undefined
      : exercise.equipment === "barbell"
      ? equipmentDefaults.barbellWeightKg ?? undefined
      : exercise.equipment === "ez_bar"
      ? equipmentDefaults.ezBarWeightKg ?? undefined
      : exercise.equipment === "band"
      ? equipmentDefaults.bandMinKg ?? undefined
      : undefined);

  const [reps, setReps] = useState(lastSet?.reps?.toString() ?? "");
  const [durationSec, setDurationSec] = useState(
    lastSet?.durationSec?.toString() ?? target?.targetDurationSec?.toString() ?? ""
  );
  const [weight, setWeight] = useState(suggestedWeight?.toString() ?? "");
  const [isWarmup, setIsWarmup] = useState(false);

  const step = defaultStep(exercise.equipment, equipmentDefaults);
  const restSec = target?.restSec ?? exercise.defaultRestSec ?? 90;
  const targetText = targetLabel(target);

  function submit() {
    const restTaken = pendingRestSec();
    startTransition(async () => {
      await addSet({
        sessionId,
        exerciseId: exercise.id,
        reps: !timed && reps ? Number(reps) : undefined,
        durationSec: timed && durationSec ? Number(durationSec) : undefined,
        weightKg: showWeight && weight ? Number(weight) : undefined,
        isWarmup,
        restSec,
        restTakenSec: restTaken,
      });
      setIsWarmup(false);
      onLoggedSet(restSec);
      onSetRecorded();
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">{exercise.name}</CardTitle>
          {targetText && <p className="mt-0.5 text-[11px] text-accent-highlight">{targetText}</p>}
        </div>
        <span className="text-[11px] text-text-muted">{EQUIPMENT_LABELS[exercise.equipment]}</span>
      </CardHeader>
      <CardContent>
        {sets.length > 0 && (
          <table className="mb-3 w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-text-muted">
                <th className="pb-1 font-normal">Set</th>
                <th className="pb-1 font-normal">{timed ? "Time" : "Reps"}</th>
                {showWeight && <th className="pb-1 font-normal">Weight</th>}
                <th className="pb-1 font-normal"></th>
              </tr>
            </thead>
            <tbody className="font-mono tabular">
              {sets.map((s) => (
                <tr key={s.id} className="border-t border-border/60">
                  <td className="py-1.5 text-text-muted">
                    {s.setNumber}
                    {s.isWarmup && <span className="ml-1 text-[10px] text-accent-highlight">W</span>}
                  </td>
                  <td className="py-1.5">{timed ? (s.durationSec ? `${s.durationSec}s` : "—") : s.reps ?? "—"}</td>
                  {showWeight && <td className="py-1.5">{formatKg(s.weightKg)}</td>}
                  <td className="py-1.5 text-right">
                    <button
                      onClick={() => startTransition(() => deleteSet(s.id, sessionId))}
                      className="text-text-muted hover:text-accent-danger"
                      aria-label="Delete set"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="flex flex-wrap items-end gap-2">
          {timed ? (
            <div className="w-28">
              <label className="mb-1 block text-[11px] text-text-muted">Seconds held</label>
              <Input type="number" value={durationSec} onChange={(e) => setDurationSec(e.target.value)} min={0} />
            </div>
          ) : (
            <div className="w-20">
              <label className="mb-1 block text-[11px] text-text-muted">Reps</label>
              <Input type="number" value={reps} onChange={(e) => setReps(e.target.value)} min={0} />
            </div>
          )}
          {showWeight && (
            <div className="w-24">
              <label className="mb-1 block text-[11px] text-text-muted">Weight (kg)</label>
              <Input type="number" step={step} value={weight} onChange={(e) => setWeight(e.target.value)} min={0} />
            </div>
          )}
          <label className="flex items-center gap-1.5 pb-2 text-xs text-text-muted">
            <input type="checkbox" checked={isWarmup} onChange={(e) => setIsWarmup(e.target.checked)} />
            Warm-up
          </label>
          <Button onClick={submit} disabled={isPending} className="gap-1.5">
            <Flame size={15} />
            Log Set
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
