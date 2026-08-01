import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getProgramWithDays, archiveProgram, resetProgramProgress } from "@/lib/actions/programs";
import { startLiveWorkout } from "@/lib/actions/workouts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const TYPE_COLOR: Record<string, string> = {
  strength: "text-type-strength",
  cardio: "text-type-cardio",
  skill: "text-type-skill",
  rest: "text-text-muted",
};

export default async function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireCurrentUser();
  const program = await getProgramWithDays(user.id, id);
  if (!program) notFound();

  const completedCount = program.days.filter((d) => d.completedAt && d.type !== "rest").length;
  const totalCount = program.days.filter((d) => d.type !== "rest").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-wide">{program.name}</h1>
          {program.description && <p className="mt-1 text-sm text-text-muted">{program.description}</p>}
          {totalCount > 0 && (
            <p className="mt-1 text-xs text-text-muted">
              {completedCount} of {totalCount} days completed
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {program.source === "custom" && (
            <Link href={`/programs/${program.id}/edit`} className="text-xs text-text-muted hover:text-text">
              Edit
            </Link>
          )}
          {completedCount > 0 && (
            <form action={async () => { "use server"; await resetProgramProgress(program.id); }}>
              <Button type="submit" variant="ghost" className="text-xs">
                Reset Progress
              </Button>
            </form>
          )}
          <form action={async () => { "use server"; await archiveProgram(program.id); }}>
            <Button type="submit" variant="ghost" className="text-xs">
              Archive
            </Button>
          </form>
        </div>
      </div>

      <div className="space-y-3">
        {program.days.map((day) => {
          const done = !!day.completedAt && day.type !== "rest";
          return (
            <Card key={day.id} className={cn(done && "border-accent-strength/40 bg-accent-strength/5")}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  {done && <CheckCircle2 size={16} className="text-accent-strength" />}
                  {day.title || `Day ${day.dayIndex}`}
                  <span className={cn("text-[10px] font-normal uppercase tracking-wide", TYPE_COLOR[day.type])}>
                    {day.type}
                  </span>
                </CardTitle>
                <div className="flex items-center gap-2">
                  {day.type === "cardio" && (
                    <Link href="/cardio" className="text-xs text-text-muted hover:text-text">
                      or log a run
                    </Link>
                  )}
                  {day.type !== "rest" && (
                    <form action={async () => { "use server"; await startLiveWorkout(day.id, program.id); }}>
                      <Button type="submit" variant={done ? "secondary" : "primary"} className="text-xs">
                        {done ? "Do Again" : "Start Workout"}
                      </Button>
                    </form>
                  )}
                </div>
              </CardHeader>
              {day.exercises.length > 0 && (
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    {day.exercises.map((ex) => (
                      <li key={ex.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded bg-surface-2 px-3 py-1.5">
                        <span className="font-medium">{ex.displayName}</span>
                        {ex.sets && <span className="text-text-muted">{ex.sets} sets</span>}
                        {ex.reps && <span className="text-text-muted">× {ex.reps}</span>}
                        {ex.rounds && <span className="text-text-muted">{ex.rounds} rounds</span>}
                        {ex.durationSec && <span className="text-text-muted">{ex.durationSec}s</span>}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
