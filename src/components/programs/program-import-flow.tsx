"use client";

import { useState, useTransition } from "react";
import { UploadCloud, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/field";
import { saveParsedProgram } from "@/lib/actions/programs";
import type { ParsedProgram, ParsedProgramDay } from "@/lib/ai/gemini";

export function ProgramImportFlow() {
  const [stage, setStage] = useState<"upload" | "reviewing">("upload");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedProgram | null>(null);
  const [fileName, setFileName] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/programs/parse", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse PDF");
      setParsed(data.parsed);
      setFileName(data.fileName);
      setStage("reviewing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setUploading(false);
    }
  }

  function updateDay(index: number, patch: Partial<ParsedProgramDay>) {
    setParsed((p) => {
      if (!p) return p;
      const days = [...p.days];
      days[index] = { ...days[index], ...patch };
      return { ...p, days };
    });
  }

  function removeDay(index: number) {
    setParsed((p) => (p ? { ...p, days: p.days.filter((_, i) => i !== index) } : p));
  }

  function save() {
    if (!parsed) return;
    startTransition(async () => {
      await saveParsedProgram(parsed, fileName);
    });
  }

  if (stage === "upload") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import a DAREBEE Program</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-text-muted">
            Upload the program PDF as-is. Gemini reads it and pulls out the day-by-day structure —
            you review and edit everything before it&apos;s saved.
          </p>
          <label
            className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border py-10 text-text-muted hover:border-accent-strength/50 hover:text-text"
          >
            {uploading ? <Loader2 className="animate-spin" size={28} /> : <UploadCloud size={28} />}
            <span className="text-sm">{uploading ? "Reading PDF…" : "Click to choose a PDF"}</span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </label>
          {error && <p className="mt-3 text-sm text-accent-danger">{error}</p>}
        </CardContent>
      </Card>
    );
  }

  if (!parsed) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Review before saving</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="p-name">Program name</Label>
            <Input id="p-name" value={parsed.name} onChange={(e) => setParsed({ ...parsed, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="p-desc">Description</Label>
            <Input
              id="p-desc"
              value={parsed.description}
              onChange={(e) => setParsed({ ...parsed, description: e.target.value })}
            />
          </div>
          <p className="text-xs text-text-muted">
            Parsed from <span className="text-text">{fileName}</span> — edit anything that looks off.
          </p>
        </CardContent>
      </Card>

      {parsed.days.map((day, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div className="flex flex-1 items-center gap-2">
              <Input
                value={day.title}
                onChange={(e) => updateDay(i, { title: e.target.value })}
                className="max-w-[220px]"
              />
              <Select
                value={day.type}
                onChange={(e) => updateDay(i, { type: e.target.value as ParsedProgramDay["type"] })}
                className="max-w-[140px]"
              >
                <option value="strength">Strength</option>
                <option value="cardio">Cardio</option>
                <option value="skill">Skill</option>
                <option value="rest">Rest</option>
              </Select>
            </div>
            <button onClick={() => removeDay(i)} className="text-text-muted hover:text-accent-danger">
              <Trash2 size={16} />
            </button>
          </CardHeader>
          <CardContent>
            {day.exercises.length === 0 ? (
              <p className="text-sm text-text-muted">No exercises on this day.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {day.exercises.map((ex, j) => (
                  <li key={j} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded bg-surface-2 px-3 py-1.5">
                    <span className="font-medium">{ex.freeText}</span>
                    {ex.sets && <span className="text-text-muted">{ex.sets} sets</span>}
                    {ex.reps && <span className="text-text-muted">× {ex.reps}</span>}
                    {ex.rounds && <span className="text-text-muted">{ex.rounds} rounds</span>}
                    {ex.durationSec && <span className="text-text-muted">{ex.durationSec}s</span>}
                    {ex.restSec && <span className="text-text-muted">rest {ex.restSec}s</span>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}

      {error && <p className="text-sm text-accent-danger">{error}</p>}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => setStage("upload")}>
          Start over
        </Button>
        <Button onClick={save} disabled={isPending}>
          {isPending ? "Saving…" : "Save Program"}
        </Button>
      </div>
    </div>
  );
}
