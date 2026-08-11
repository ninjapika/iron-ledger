import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getSessionDetail } from "@/lib/actions/history";
import { getExerciseCatalog } from "@/lib/data/exercises";
import { SessionEditor } from "@/components/history/session-editor";
import { formatDurationHuman } from "@/lib/format";
import { guessTimeOfDay } from "@/lib/time-of-day";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireCurrentUser();
  const [detail, exercises] = await Promise.all([getSessionDetail(user.id, id), getExerciseCatalog(user.id)]);
  if (!detail) notFound();

  // Derived fresh from the stored instant + the user's *current* timezone
  // setting, rather than trusted from the timeOfDay column — that column
  // was computed once at logging time, and anything logged before the
  // server-local-time fix in guessTimeOfDay (see lib/tz.ts) has a stale,
  // possibly-wrong value baked in. Recomputing here fixes those old rows
  // too, with no migration needed.
  const timeOfDay = guessTimeOfDay(detail.session.date, user.settings.timezone);

  // Duration only means anything for a live-tracked session — a "logged"
  // (after-the-fact) entry has createdAt/finishedAt essentially identical,
  // so showing a bogus "0m total" there would be actively misleading.
  const totalSec =
    detail.session.mode === "live" && detail.session.finishedAt
      ? Math.round((detail.session.finishedAt.getTime() - detail.session.createdAt.getTime()) / 1000)
      : null;
  const restSec = detail.sets.reduce((sum, s) => sum + (s.restTakenSec ?? 0), 0);
  const activeSec = totalSec !== null ? Math.max(0, totalSec - restSec) : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-text-muted">
          {detail.session.date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          {` · ${timeOfDay}`}
        </p>
        <h1 className="font-display text-2xl uppercase tracking-wide">
          {detail.programContext ? `${detail.programContext.programName} — ${detail.programContext.dayTitle}` : "Edit Workout"}
        </h1>
        {totalSec !== null && activeSec !== null && (
          <p className="mt-1 text-xs text-text-muted">
            {formatDurationHuman(totalSec)} total · {formatDurationHuman(activeSec)} active · {formatDurationHuman(restSec)} rest
          </p>
        )}
      </div>
      <SessionEditor sessionId={detail.session.id} initialNotes={detail.session.notes ?? ""} sets={detail.sets} exercises={exercises} />
    </div>
  );
}
