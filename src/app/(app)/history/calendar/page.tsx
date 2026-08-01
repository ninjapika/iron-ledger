import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getActiveMonths, getMonthActivity } from "@/lib/data/dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarHeatmap } from "@/components/charts/calendar-heatmap";

export default async function CalendarGalleryPage() {
  const user = await requireCurrentUser();
  const months = await getActiveMonths(user.id, user.settings.timezone);

  const monthData = await Promise.all(
    months.map((m) => getMonthActivity(user.id, user.settings.timezone, m.year, m.month))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/history" className="text-text-muted hover:text-text">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="font-display text-2xl uppercase tracking-wide">Consistency Calendar</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {monthData.map((m) => (
          <Card key={`${m.year}-${m.month}`}>
            <CardContent className="pt-5">
              <CalendarHeatmap data={m} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
