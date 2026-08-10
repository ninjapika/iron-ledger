"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveOpenRouterKey, disconnectOpenRouter } from "@/lib/actions/ai-settings";
import type { ActionResult } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { PlateSignalIcon } from "@/components/icons/plate-signal-icon";

const initialState: ActionResult = {};

export function OpenRouterCard({ connected, keyPreview }: { connected: boolean; keyPreview: string | null }) {
  const [state, formAction, pending] = useActionState(async (_: ActionResult, formData: FormData) => {
    const result = await saveOpenRouterKey(formData);
    return result ?? {};
  }, initialState);
  const [editing, setEditing] = useState(!connected);
  const [isDisconnecting, startDisconnect] = useTransition();
  const router = useRouter();

  function disconnect() {
    startDisconnect(async () => {
      await disconnectOpenRouter();
      setEditing(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-theme bg-surface-2 text-accent-strength">
          <PlateSignalIcon size={19} />
        </div>
        <div>
          <p className="text-sm font-medium text-text">OpenRouter</p>
          <p className="text-xs text-text-muted">Bring your own key — pick which model to use from the AI Assistant chat itself.</p>
        </div>
      </div>

      {connected && !editing ? (
        <div className="flex flex-wrap items-center gap-3 rounded-theme border border-border bg-surface-2 px-4 py-3">
          <span className="text-sm text-text">
            Connected — <span className="font-mono text-text-muted">{keyPreview}</span>
          </span>
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
              Change key
            </Button>
            <Button type="button" variant="danger" disabled={isDisconnecting} onClick={disconnect}>
              {isDisconnecting ? "Disconnecting…" : "Disconnect"}
            </Button>
          </div>
        </div>
      ) : (
        <form action={formAction} className="space-y-3 max-w-md">
          <div>
            <Label htmlFor="apiKey">OpenRouter API key</Label>
            <Input id="apiKey" name="apiKey" type="password" autoComplete="off" placeholder="sk-or-v1-…" required />
          </div>
          {state?.error && <p className="text-sm text-accent-danger">{state.error}</p>}
          {state?.success && <p className="text-sm text-accent-strength">Connected.</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Verifying…" : "Connect"}
            </Button>
            {connected && (
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
