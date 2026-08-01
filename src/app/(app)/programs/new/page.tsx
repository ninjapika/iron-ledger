import { requireCurrentUser } from "@/lib/auth/current-user";
import { getExerciseCatalog } from "@/lib/data/exercises";
import { CustomProgramBuilder } from "@/components/programs/custom-program-builder";

export default async function NewProgramPage() {
  const user = await requireCurrentUser();
  const catalog = await getExerciseCatalog(user.id);
  const options = catalog.map((e) => ({ id: e.id, name: e.name, category: e.category, equipment: e.equipment, trackingType: e.trackingType }));

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl uppercase tracking-wide">Build a Program</h1>
      <CustomProgramBuilder exercises={options} />
    </div>
  );
}
