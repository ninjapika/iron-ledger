"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Check } from "lucide-react";
import { setPreferredAiModel } from "@/lib/actions/ai-settings";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import type { OpenRouterModel } from "@/lib/ai/openrouter";

export function ModelPicker({ models, currentModelId }: { models: OpenRouterModel[]; currentModelId: string | null }) {
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return models;
    return models.filter((m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q));
  }, [models, query]);

  function choose(modelId: string) {
    setPendingId(modelId);
    startTransition(async () => {
      await setPreferredAiModel(modelId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search models…"
          className="pl-9"
        />
      </div>

      <div className="max-h-72 space-y-1 overflow-y-auto rounded-theme border border-border bg-surface-2/50 p-1.5">
        {filtered.length === 0 && <p className="px-3 py-4 text-center text-sm text-text-muted">No models match that search.</p>}
        {filtered.map((m) => {
          const active = m.id === currentModelId;
          const busy = isPending && pendingId === m.id;
          return (
            <button
              key={m.id}
              type="button"
              disabled={isPending}
              onClick={() => choose(m.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-theme px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed",
                active ? "bg-accent-strength/15 text-text" : "text-text-muted hover:bg-surface-2 hover:text-text"
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                  active ? "border-accent-strength bg-accent-strength text-bg" : "border-border"
                )}
              >
                {active && <Check size={11} strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{m.name}</span>
                <span className="block truncate text-xs text-text-muted">{m.id}</span>
              </span>
              <span className="shrink-0 text-right text-xs text-text-muted">
                {m.isFree ? (
                  <span className="text-accent-cardio">Free</span>
                ) : (
                  `$${m.promptPricePerMTok.toFixed(2)}/M`
                )}
                <br />
                {Math.round(m.contextLength / 1000)}K ctx
              </span>
              {busy && <span className="shrink-0 text-xs text-text-muted">Saving…</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
