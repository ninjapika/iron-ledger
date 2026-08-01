"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { updateExercise, deleteExercise } from "@/lib/actions/workouts";
import { Input, Select } from "@/components/ui/field";
import { EQUIPMENT_LABELS } from "@/lib/data/exercise-labels";

interface ExerciseRowProps {
  id: string;
  name: string;
  category: string;
  equipment: string;
  trackingType: string;
  isCustom: boolean;
}

export function ExerciseRow({ id, name, category, equipment, trackingType }: ExerciseRowProps) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draftName, setDraftName] = useState(name);
  const [draftCategory, setDraftCategory] = useState(category);
  const [draftEquipment, setDraftEquipment] = useState(equipment);
  const [draftTracking, setDraftTracking] = useState(trackingType);

  function save() {
    startTransition(async () => {
      await updateExercise(id, draftName.trim(), draftCategory, draftEquipment, draftTracking);
      setEditing(false);
    });
  }

  function remove() {
    if (!confirm(`Delete "${name}"?`)) return;
    startTransition(async () => {
      const result = await deleteExercise(id);
      if (result.error) setError(result.error);
    });
  }

  if (editing) {
    return (
      <div className="space-y-2 rounded-theme border border-accent-strength/50 bg-surface p-3 text-sm">
        <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Select value={draftCategory} onChange={(e) => setDraftCategory(e.target.value)} className="flex-1">
            <option value="push">Push</option>
            <option value="pull">Pull</option>
            <option value="legs">Legs</option>
            <option value="core">Core</option>
            <option value="full_body">Full Body</option>
            <option value="cardio">Cardio</option>
            <option value="skill">Skill</option>
          </Select>
          <Select value={draftEquipment} onChange={(e) => setDraftEquipment(e.target.value)} className="flex-1">
            <option value="dumbbell">Dumbbell</option>
            <option value="barbell">Barbell</option>
            <option value="ez_bar">EZ Curl Bar</option>
            <option value="band">Resistance Band</option>
            <option value="bodyweight">Bodyweight</option>
            <option value="cardio">Cardio</option>
          </Select>
          <Select value={draftTracking} onChange={(e) => setDraftTracking(e.target.value)} className="flex-1">
            <option value="reps">Reps-based</option>
            <option value="duration">Time-based</option>
          </Select>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={() => setEditing(false)} className="flex items-center gap-1 text-xs text-text-muted hover:text-text">
            <X size={14} /> Cancel
          </button>
          <button onClick={save} disabled={isPending} className="flex items-center gap-1 text-xs text-accent-strength">
            <Check size={14} /> Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between rounded-theme border border-border bg-surface px-3 py-2 text-sm">
        <span>{name}</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-muted">
            {EQUIPMENT_LABELS[equipment] ?? equipment}
            {trackingType === "duration" && " · timed"}
          </span>
          <button onClick={() => setEditing(true)} className="text-text-muted hover:text-text">
            <Pencil size={13} />
          </button>
          <button onClick={remove} disabled={isPending} className="text-text-muted hover:text-accent-danger">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-accent-danger">{error}</p>}
    </div>
  );
}
