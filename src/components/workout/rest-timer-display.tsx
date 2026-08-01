"use client";

import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/format";
import type { RestTimerApi } from "@/hooks/use-rest-timer";

const PRESETS = [30, 60, 90, 120, 150, 180, 240];

export function RestTimerDisplay({ timer }: { timer: RestTimerApi }) {
  const { secondsLeft, totalSeconds, running, start, addSeconds, stop } = timer;
  const pct = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const circumference = 2 * Math.PI * 42;
  const dashoffset = circumference * (1 - pct);
  const active = running || secondsLeft > 0;
  const urgent = running && secondsLeft > 0 && secondsLeft <= 10;

  return (
    <div
      className={cn(
        "sticky top-0 z-30 -mx-4 mb-4 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur transition-all md:-mx-8 md:px-8",
        !active && "border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-4">
        {active && (
          <div className={cn("relative h-14 w-14 shrink-0 rounded-full", urgent && "timer-urgent")}>
            <svg viewBox="0 0 96 96" className="h-14 w-14 -rotate-90">
              <circle cx="48" cy="48" r="42" fill="none" stroke="var(--border)" strokeWidth="7" />
              <circle
                cx="48"
                cy="48"
                r="42"
                fill="none"
                stroke={urgent ? "var(--accent-danger)" : "var(--accent-cardio)"}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashoffset}
                className="transition-[stroke-dashoffset,stroke] duration-1000 ease-linear"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-mono text-xs tabular text-text">
              {formatDuration(secondsLeft)}
            </div>
          </div>
        )}
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {active ? (
            <>
              <span className="mr-1 text-xs uppercase tracking-wide text-text-muted">Resting</span>
              <button
                onClick={() => addSeconds(15)}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-text hover:border-accent-cardio"
              >
                +15s
              </button>
              <button
                onClick={stop}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-text-muted hover:text-accent-danger hover:border-accent-danger"
              >
                Skip
              </button>
            </>
          ) : (
            <>
              <span className="mr-1 text-xs uppercase tracking-wide text-text-muted">Quick rest</span>
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => start(p)}
                  className="rounded-full border border-border px-2.5 py-1 text-xs text-text hover:border-accent-cardio hover:text-accent-cardio"
                >
                  {p}s
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
