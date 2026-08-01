"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { updateSet, deleteHistorySet, updateSessionNotes, deleteWorkoutSession } from "@/lib/actions/history";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { EQUIPMENT_LABELS } from "@/lib/data/exercise-labels";

interface SetRow {
  id: string;
  exerciseName: string;
  equipment: string;
  trackingType: string;
  setNumber: number;
  reps: number | null;
  durationSec: number | null;
  weightKg: number | null;
  rpe: number | null;
  isWarmup: boolean;
}

// Tighter than the shared Input's default padding (which is sized for
// standalone forms like login/signup) — this is a dense inline-editing
// grid, not a form.
const cellInput =
  "w-full min-w-0 rounded bg-transparent px-1.5 py-1 text-sm text-text outline-none focus:bg-surface-2 focus:shadow-[var(--glow-soft)]";

export function SessionEditor({
  sessionId,
  initialNotes,
  sets,
}: {
  sessionId: string;
  initialNotes: string;
  sets: SetRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState(initialNotes);
  const [savedNotes, setSavedNotes] = useState(false);

  const byExercise = new Map<string, SetRow[]>();
  for (const s of sets) {
    if (!byExercise.has(s.exerciseName)) byExercise.set(s.exerciseName, []);
    byExercise.get(s.exerciseName)!.push(s);
  }

  function saveField(setId: string, patch: Parameters<typeof updateSet>[1]) {
    startTransition(async () => {
      await updateSet(setId, patch);
      router.refresh();
    });
  }

  function removeSet(setId: string) {
    startTransition(async () => {
      await deleteHistorySet(setId, sessionId);
      router.refresh();
    });
  }

  function saveNotes() {
    startTransition(async () => {
      await updateSessionNotes(sessionId, notes);
      setSavedNotes(true);
      setTimeout(() => setSavedNotes(false), 1500);
    });
  }

  function removeSession() {
    if (!confirm("Delete this entire workout session? This can't be undone.")) return;
    startTransition(async () => {
      await deleteWorkoutSession(sessionId);
      router.push("/history");
    });
  }

  return (
    <div className="max-w-2xl space-y-3">
      <Card className="divide-y divide-border overflow-hidden">
        {[...byExercise.entries()].map(([name, exSets]) => {
          const usesWeight = exSets[0]?.equipment !== "bodyweight" && exSets[0]?.equipment !== "cardio";
          const timed = exSets[0]?.trackingType === "duration";
          // Fixed column template per exercise (weight column only exists
          // when this exercise actually uses one) so every set row within
          // it lines up exactly, instead of inputs floating at ad hoc
          // widths with a lot of empty trailing space.
          const cols = usesWeight ? "1.4rem 1.6rem 1fr 1fr 1fr 1.6rem" : "1.4rem 1.6rem 1fr 1fr 1.6rem";
          return (
            <div key={name} className="px-3 py-2.5">
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <h3 className="truncate font-display text-sm uppercase tracking-wide text-text">{name}</h3>
                <span className="shrink-0 text-[10px] text-text-muted">{EQUIPMENT_LABELS[exSets[0]?.equipment] ?? ""}</span>
              </div>
              <div className="space-y-1">
                <div
                  className="grid items-center gap-1 px-1 text-[10px] uppercase tracking-wide text-text-muted"
                  style={{ gridTemplateColumns: cols }}
                >
                  <span />
                  <span title="Warm-up">W</span>
                  <span>{timed ? "Sec" : "Reps"}</span>
                  {usesWeight && <span>Kg</span>}
                  <span>RPE</span>
                  <span />
                </div>
                {exSets.map((s) => (
                  <div
                    key={s.id}
                    className="grid items-center gap-1 rounded-theme bg-surface-2 px-1 py-1"
                    style={{ gridTemplateColumns: cols }}
                  >
                    <span className="text-xs text-text-muted">#{s.setNumber}</span>
                    <input
                      type="checkbox"
                      title="Warm-up set"
                      defaultChecked={s.isWarmup}
                      onChange={(e) => saveField(s.id, { isWarmup: e.target.checked })}
                      className="h-3.5 w-3.5 accent-accent-strength"
                    />
                    {timed ? (
                      <input
                        type="number"
                        defaultValue={s.durationSec ?? ""}
                        onBlur={(e) => saveField(s.id, { durationSec: e.target.value ? Number(e.target.value) : undefined })}
                        className={cellInput}
                      />
                    ) : (
                      <input
                        type="number"
                        defaultValue={s.reps ?? ""}
                        onBlur={(e) => saveField(s.id, { reps: e.target.value ? Number(e.target.value) : undefined })}
                        className={cellInput}
                      />
                    )}
                    {usesWeight && (
                      <input
                        type="number"
                        step="0.5"
                        defaultValue={s.weightKg ?? ""}
                        onBlur={(e) => saveField(s.id, { weightKg: e.target.value ? Number(e.target.value) : undefined })}
                        className={cellInput}
                      />
                    )}
                    <input
                      type="number"
                      step="0.5"
                      min={6}
                      max={10}
                      defaultValue={s.rpe ?? ""}
                      onBlur={(e) => saveField(s.id, { rpe: e.target.value ? Number(e.target.value) : undefined })}
                      className={cellInput}
                    />
                    <button onClick={() => removeSet(s.id)} className="text-text-muted hover:text-accent-danger" title="Delete set">
                      <Trash2 size={13} className="mx-auto" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </Card>

      <Card className={cn("px-3 py-2.5")}>
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text-muted">Notes</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          rows={2}
          className="w-full rounded-theme border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent-strength"
        />
        {savedNotes && <p className="mt-1 text-xs text-accent-strength">Saved</p>}
      </Card>

      <Button variant="danger" onClick={removeSession} disabled={isPending} className="text-sm">
        Delete this workout
      </Button>
    </div>
  );
}
