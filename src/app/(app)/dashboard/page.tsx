import Link from "next/link";
import { Flame, Dumbbell, TrendingUp, Footprints, History } from "lucide-react";
import { requireCurrentUser } from "@/lib/auth/current-user";
import {
  getSummaryStats,
  getWeeklyVolume,
  getTopExercises,
  get1RMTrend,
  getMuscleBalance,
  getBodyWeightTrend,
  getCardioTrend,
  getTodaysActivity,
  getMonthActivity,
} from "@/lib/data/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VolumeChart } from "@/components/charts/volume-chart";
import { OneRmTrend } from "@/components/charts/one-rm-trend";
import { MuscleBalanceChart } from "@/components/charts/muscle-balance-chart";
import { BodyWeightTrendChart } from "@/components/charts/bodyweight-trend-chart";
import { CardioTrendChart } from "@/components/charts/cardio-trend-chart";
import { TodayCard } from "@/components/dashboard/today-card";
import { cn } from "@/lib/cn";

const ACCENT_CLASSES = {
  strength: { text: "text-accent-strength", bg: "bg-accent-strength/15" },
  cardio: { text: "text-accent-cardio", bg: "bg-accent-cardio/15" },
  highlight: { text: "text-accent-highlight", bg: "bg-accent-highlight/15" },
};

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  index,
  pulse,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  accent: keyof typeof ACCENT_CLASSES;
  index: number;
  pulse?: boolean;
}) {
  const colors = ACCENT_CLASSES[accent];
  return (
    <Card className="stagger-in flex items-center gap-3 px-5 py-4" style={{ animationDelay: `${index * 60}ms` }}>
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", colors.bg)}>
        <Icon size={18} className={cn(colors.text, pulse && "flame-active")} />
      </div>
      <div>
        <p className="font-display text-2xl tabular leading-none">{value}</p>
        <p className="text-xs text-text-muted">{label}</p>
      </div>
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const tz = user.settings.timezone;

  const now = new Date();
  const [stats, monthActivity, weeklyVolume, topExercises, muscleBalance, bodyWeight, cardio, today] = await Promise.all([
    getSummaryStats(user.id, tz),
    getMonthActivity(user.id, tz, now.getFullYear(), now.getMonth()),
    getWeeklyVolume(user.id, tz, 12),
    getTopExercises(user.id, 4),
    getMuscleBalance(user.id, 28),
    getBodyWeightTrend(user.id, tz, 180),
    getCardioTrend(user.id, tz, 90),
    getTodaysActivity(user.id, tz),
  ]);

  const oneRmOptions = await Promise.all(
    topExercises.map(async (e) => ({
      exerciseId: e.exerciseId,
      name: e.name,
      points: await get1RMTrend(user.id, tz, e.exerciseId),
    }))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="font-display text-3xl uppercase tracking-wide">
            Welcome back{user.profile?.displayName ? `, ${user.profile.displayName}` : ""}
          </h1>
        </div>
        <Link
          href="/history"
          className="flex shrink-0 items-center gap-1.5 rounded-theme border border-border px-3 py-2 text-xs text-text-muted transition-colors hover:border-accent-strength/50 hover:text-text"
        >
          <History size={14} />
          Workout History
        </Link>
      </div>

      <TodayCard today={today} monthActivity={monthActivity} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Flame} label="Day streak" value={String(stats.currentStreakDays)} accent="highlight" index={0} pulse={stats.currentStreakDays > 0} />
        <StatCard icon={Dumbbell} label="Total workouts" value={String(stats.totalWorkouts)} accent="strength" index={1} />
        <StatCard icon={TrendingUp} label="This week's volume" value={`${Math.round(stats.weekVolumeKg).toLocaleString()} kg`} accent="strength" index={2} />
        <StatCard icon={Footprints} label="This week's distance" value={`${stats.weekCardioKm.toFixed(1)} km`} accent="cardio" index={3} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <VolumeChart data={weeklyVolume} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Estimated 1RM</CardTitle>
          </CardHeader>
          <CardContent>
            <OneRmTrend options={oneRmOptions} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Muscle Balance (28d)</CardTitle>
          </CardHeader>
          <CardContent>
            <MuscleBalanceChart data={muscleBalance} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cardio &amp; Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <CardioTrendChart data={cardio} />
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Bodyweight</CardTitle>
          </CardHeader>
          <CardContent>
            <BodyWeightTrendChart data={bodyWeight} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
