import Link from "next/link";
import { Dumbbell, ClipboardList } from "lucide-react";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getActiveLiveSession } from "@/lib/actions/workouts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StartLiveWorkoutButton } from "@/components/workout/start-live-workout-button";

export default async function LogPage() {
  const user = await requireCurrentUser();
  const active = await getActiveLiveSession(user.id);

  if (active) {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="mb-4 text-text-muted">You have a workout already in progress.</p>
        <Link href={`/log/live/${active.id}`}>
          <Button className="w-full">Resume Live Workout</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl uppercase tracking-wide">Log a Workout</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Dumbbell size={18} className="text-accent-strength" />
              Live Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-text-muted">
              Log sets as you go, with a rest timer between them. Best while you&apos;re actually training.
            </p>
            <StartLiveWorkoutButton />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList size={18} className="text-accent-cardio" />
              Log Afterward
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-text-muted">
              Already trained and just want it on record? Enter the whole session at once.
            </p>
            <Link href="/log/new">
              <Button variant="secondary" className="w-full">
                Log a Completed Workout
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
