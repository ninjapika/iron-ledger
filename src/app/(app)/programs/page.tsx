import Link from "next/link";
import { FileUp, ListPlus } from "lucide-react";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getPrograms } from "@/lib/actions/programs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ProgramsPage() {
  const user = await requireCurrentUser();
  const list = await getPrograms(user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl uppercase tracking-wide">Programs</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileUp size={18} className="text-accent-strength" />
              Import from DAREBEE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-text-muted">Upload a program PDF — Gemini reads it into a day-by-day plan.</p>
            <Link href="/programs/import">
              <Button className="w-full">Upload PDF</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListPlus size={18} className="text-accent-cardio" />
              Build your own
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-text-muted">Lay out your own days, exercises, sets and reps.</p>
            <Link href="/programs/new">
              <Button variant="secondary" className="w-full">
                Build a Program
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        {list.length === 0 && <p className="text-sm text-text-muted">No programs yet.</p>}
        {list.map((p) => (
          <Link
            key={p.id}
            href={`/programs/${p.id}`}
            className="card-interactive glow-interactive flex items-center justify-between rounded-theme border border-border bg-surface px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-strength/40"
          >
            <div>
              <p className="font-medium">{p.name}</p>
              {p.description && <p className="text-sm text-text-muted">{p.description}</p>}
            </div>
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] uppercase tracking-wide text-text-muted">
              {p.source}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
