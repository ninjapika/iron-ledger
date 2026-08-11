import { requireCurrentUser } from "@/lib/auth/current-user";
import { getExerciseCatalog } from "@/lib/data/exercises";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddExerciseForm } from "@/components/exercises/add-exercise-form";
import { ExerciseLibrary } from "@/components/exercises/exercise-library";

export default async function ExercisesPage() {
  const user = await requireCurrentUser();
  const catalog = await getExerciseCatalog(user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl uppercase tracking-wide">Exercise Library</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add a custom exercise</CardTitle>
        </CardHeader>
        <CardContent>
          <AddExerciseForm />
        </CardContent>
      </Card>

      <ExerciseLibrary catalog={catalog} />
    </div>
  );
}
