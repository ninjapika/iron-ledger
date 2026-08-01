import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getSessionDetail } from "@/lib/actions/history";
import { SessionEditor } from "@/components/history/session-editor";
import { formatDurationHuman } from "@/lib/format";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireCurrentUser();
  const detail = await getSessionDetail(user.id, id);
  if (!detail) notFound();

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
          {detail.session.timeOfDay ? ` · ${detail.session.timeOfDay}` : ""}
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
      <SessionEditor sessionId={detail.session.id} initialNotes={detail.session.notes ?? ""} sets={detail.sets} />
    </div>
  );
}
