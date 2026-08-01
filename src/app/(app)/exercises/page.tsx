import { requireCurrentUser } from "@/lib/auth/current-user";
import { getExerciseCatalog } from "@/lib/data/exercises";
import { CATEGORY_LABELS } from "@/lib/data/exercise-labels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddExerciseForm } from "@/components/exercises/add-exercise-form";
import { ExerciseRow } from "@/components/exercises/exercise-row";

export default async function ExercisesPage() {
  const user = await requireCurrentUser();
  const catalog = await getExerciseCatalog(user.id);

  const byCategory = new Map<string, typeof catalog>();
  for (const ex of catalog) {
    if (!byCategory.has(ex.category)) byCategory.set(ex.category, []);
    byCategory.get(ex.category)!.push(ex);
  }

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

      {[...byCategory.entries()].map(([category, list]) => (
        <div key={category}>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
            {CATEGORY_LABELS[category] ?? category}
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((ex) => (
              <ExerciseRow key={ex.id} id={ex.id} name={ex.name} category={ex.category} equipment={ex.equipment} trackingType={ex.trackingType} isCustom={ex.isCustom} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
