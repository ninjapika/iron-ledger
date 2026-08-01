import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getLoggedExercises } from "@/lib/actions/history";
import { ExerciseProgressView } from "@/components/history/exercise-progress-view";

export default async function ProgressPage() {
  const user = await requireCurrentUser();
  const exercises = await getLoggedExercises(user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/history" className="text-text-muted hover:text-text">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="font-display text-2xl uppercase tracking-wide">Exercise Progress</h1>
      </div>
      <ExerciseProgressView exercises={exercises} />
    </div>
  );
}
