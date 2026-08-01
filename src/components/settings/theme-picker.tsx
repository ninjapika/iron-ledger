"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { THEME_PRESETS } from "@/lib/theme";
import { updateThemeSettings } from "@/lib/actions/settings";
import { cn } from "@/lib/cn";

export function ThemePicker({
  currentTheme,
  autoRotate,
}: {
  currentTheme: string;
  autoRotate: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function choose(themeId: string) {
    startTransition(async () => {
      await updateThemeSettings(themeId, autoRotate);
      router.refresh();
    });
  }

  function toggleAutoRotate() {
    startTransition(async () => {
      await updateThemeSettings(currentTheme, !autoRotate);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {THEME_PRESETS.map((t) => (
          <button
            key={t.id}
            disabled={isPending || autoRotate}
            onClick={() => choose(t.id)}
            className={cn(
              "rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              currentTheme === t.id && !autoRotate ? "border-accent-strength" : "border-border hover:border-text-muted"
            )}
          >
            <div className="mb-2 flex gap-1.5">
              {t.swatch.map((c, i) => (
                <div key={i} className="h-6 w-6 rounded-full border border-black/20" style={{ backgroundColor: c }} />
              ))}
            </div>
            <p className="text-sm font-medium">{t.label}</p>
            <p className="text-xs text-text-muted">{t.blurb}</p>
          </button>
        ))}
      </div>

      <label className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Auto-rotate daily</p>
          <p className="text-xs text-text-muted">A different theme picks itself each day.</p>
        </div>
        <input
          type="checkbox"
          checked={autoRotate}
          disabled={isPending}
          onChange={toggleAutoRotate}
          className="h-5 w-9 shrink-0 accent-[var(--accent-strength)]"
        />
      </label>
    </div>
  );
}
