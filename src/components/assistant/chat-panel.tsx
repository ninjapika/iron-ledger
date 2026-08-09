"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Search, History, ListTree, Ruler, Check, X, Loader2, ChevronDown } from "lucide-react";
import { sendMessage, approveAction, rejectAction } from "@/lib/actions/ai-chat";
import { Button } from "@/components/ui/button";
import { ModelPicker } from "@/components/settings/model-picker";
import type { aiMessages, aiPendingActions } from "@/db/schema";
import type { OpenRouterModel } from "@/lib/ai/openrouter";

type Message = typeof aiMessages.$inferSelect;
type PendingAction = typeof aiPendingActions.$inferSelect;

const READ_TOOL_LABELS: Record<string, { label: string; icon: typeof Search }> = {
  search_exercises: { label: "Searched exercises", icon: Search },
  get_recent_workouts: { label: "Checked recent workouts", icon: History },
  get_current_programs: { label: "Checked your programs", icon: ListTree },
  get_body_metrics: { label: "Checked body metrics", icon: Ruler },
};

export function ChatPanel({
  conversationId,
  initialMessages,
  initialActions,
  models,
  currentModelId,
}: {
  conversationId: string;
  initialMessages: Message[];
  initialActions: PendingAction[];
  models: OpenRouterModel[];
  currentModelId: string | null;
}) {
  // No local copy of the server data — initialMessages/initialActions come
  // straight from props on every router.refresh(). Copying them into
  // useState once and never syncing was the bug behind messages "vanishing
  // until the reply arrived": the copy just never updated with fresh data,
  // it only ever reflected whatever was on the page at first load.
  const messages = initialMessages;
  const actions = initialActions;

  // The one piece that DOES need local state: the user's own message,
  // shown the instant they hit send rather than waiting for the full
  // round trip (which includes the model's reply) before it appears.
  const [optimisticText, setOptimisticText] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length, optimisticText]);

  const actionByToolCallId = new Map(actions.map((a) => [a.toolCallId, a]));
  const currentModel = models.find((m) => m.id === currentModelId);

  function submit() {
    const text = input.trim();
    if (!text || isPending) return;
    setError(null);
    setInput("");
    setOptimisticText(text);
    startTransition(async () => {
      const result = await sendMessage(conversationId, text);
      if (result?.error) setError(result.error);
      router.refresh();
      setOptimisticText(null); // the real message is now in initialMessages
    });
  }

  function respond(actionId: string, approve: boolean) {
    setError(null);
    startTransition(async () => {
      const result = approve ? await approveAction(actionId) : await rejectAction(actionId);
      if (result?.error) setError(result.error);
      router.refresh();
    });
  }

  function switchModel() {
    setModelMenuOpen(false);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-theme border border-border bg-surface-2">
      <div className="relative border-b border-border">
        <button
          type="button"
          onClick={() => setModelMenuOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-2 text-xs text-text-muted hover:text-text"
        >
          <span>
            Model: <span className="text-text">{currentModel?.name ?? currentModelId ?? "unknown"}</span>
          </span>
          <ChevronDown size={14} className={modelMenuOpen ? "rotate-180" : ""} />
        </button>
        {modelMenuOpen && (
          <div className="absolute left-0 right-0 top-full z-10 max-h-96 overflow-y-auto rounded-b-theme border border-t-0 border-border bg-surface-2 p-3 shadow-lg">
            <ModelPicker models={models} currentModelId={currentModelId} onSelect={switchModel} />
          </div>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && !optimisticText && (
          <p className="text-center text-sm text-text-muted">
            Tell it what you did, ask about your trends, or have it draft a program.
          </p>
        )}

        {messages.map((m) => {
          if (m.role === "user") {
            return (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[80%] rounded-theme bg-accent-strength/15 px-3 py-2 text-sm text-text">{m.content}</div>
              </div>
            );
          }

          if (m.role === "assistant") {
            if (!m.content) return null; // pure tool-call turn — nothing to show directly
            return (
              <div key={m.id} className="flex flex-col items-start gap-1">
                {m.reasoning && (
                  <details className="max-w-[80%] rounded-theme border border-border bg-surface/50 px-3 py-1.5 text-xs text-text-muted open:pb-2">
                    <summary className="cursor-pointer select-none">Show thinking</summary>
                    <p className="mt-1.5 whitespace-pre-wrap">{m.reasoning}</p>
                  </details>
                )}
                <div className="max-w-[80%] whitespace-pre-wrap rounded-theme bg-surface px-3 py-2 text-sm text-text">{m.content}</div>
              </div>
            );
          }

          // role === "tool"
          const action = m.toolCallId ? actionByToolCallId.get(m.toolCallId) : undefined;
          if (action) {
            if (action.status === "pending") {
              return <ActionCard key={m.id} action={action} disabled={isPending} onRespond={respond} />;
            }
            return (
              <div key={m.id} className="flex items-center gap-2 px-1 text-xs text-text-muted">
                {action.status === "approved" ? (
                  <Check size={13} className="text-accent-strength" />
                ) : (
                  <X size={13} className="text-accent-danger" />
                )}
                <span>{action.status === "approved" ? action.summary : `Declined: ${action.summary}`}</span>
              </div>
            );
          }

          const readInfo = m.toolName ? READ_TOOL_LABELS[m.toolName] : undefined;
          if (!readInfo) return null;
          const Icon = readInfo.icon;
          return (
            <div key={m.id} className="flex items-center gap-2 px-1 text-xs text-text-muted">
              <Icon size={13} />
              <span>{readInfo.label}</span>
            </div>
          );
        })}

        {optimisticText && (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-theme bg-accent-strength/15 px-3 py-2 text-sm text-text opacity-70">{optimisticText}</div>
          </div>
        )}

        {isPending && (
          <div className="flex items-center gap-2 px-1 text-xs text-text-muted">
            <Loader2 size={13} className="animate-spin" />
            <span>Thinking…</span>
          </div>
        )}
      </div>

      {error && <p className="border-t border-border px-4 py-2 text-sm text-accent-danger">{error}</p>}

      <div className="flex items-end gap-2 border-t border-border p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="What did you do today?"
          rows={1}
          className="max-h-32 flex-1 resize-none rounded-theme border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-strength"
        />
        <Button type="button" onClick={submit} disabled={isPending || !input.trim()}>
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
}

function ActionCard({
  action,
  disabled,
  onRespond,
}: {
  action: PendingAction;
  disabled: boolean;
  onRespond: (actionId: string, approve: boolean) => void;
}) {
  return (
    <div className="rounded-theme border border-accent-strength/40 bg-accent-strength/5 p-3">
      <p className="text-sm text-text">{action.summary}</p>
      <div className="mt-2 flex gap-2">
        <Button type="button" disabled={disabled} onClick={() => onRespond(action.id, true)}>
          Approve
        </Button>
        <Button type="button" variant="secondary" disabled={disabled} onClick={() => onRespond(action.id, false)}>
          Reject
        </Button>
      </div>
    </div>
  );
}
