"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Search, History, ListTree, Ruler, Check, X, Loader2 } from "lucide-react";
import { sendMessage, approveAction, rejectAction } from "@/lib/actions/ai-chat";
import { Button } from "@/components/ui/button";
import type { aiMessages, aiPendingActions } from "@/db/schema";

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
}: {
  conversationId: string;
  initialMessages: Message[];
  initialActions: PendingAction[];
}) {
  const [messages] = useState(initialMessages);
  const [actions] = useState(initialActions);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  const actionByToolCallId = new Map(actions.map((a) => [a.toolCallId, a]));

  function submit() {
    const text = input.trim();
    if (!text || isPending) return;
    setError(null);
    setInput("");
    startTransition(async () => {
      const result = await sendMessage(conversationId, text);
      if (result?.error) setError(result.error);
      router.refresh();
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

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-theme border border-border bg-surface-2">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
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
              <div key={m.id} className="flex justify-start">
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
