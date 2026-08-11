"use client";

import { useState, useTransition, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

/** A button that asks before doing the thing, instead of a native
 * `window.confirm()` (which reads as an out-of-theme browser dialog next
 * to everything else in the app). `onConfirm` can be a plain async
 * function or a server action bound with its arguments via `.bind(null,
 * ...)` — if it redirects, that throw is deliberately left unswallowed
 * here so navigation still happens. */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = "Confirm",
  title,
  description,
  variant = "ghost",
  className,
}: {
  onConfirm: () => Promise<void>;
  children: React.ReactNode;
  confirmLabel?: string;
  title: string;
  description: string;
  variant?: "ghost" | "danger";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  function confirm() {
    startTransition(async () => {
      await onConfirm();
      setOpen(false);
    });
  }

  return (
    <>
      <Button type="button" variant={variant} className={className} onClick={() => setOpen(true)}>
        {children}
      </Button>
      {mounted &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4"
            onClick={() => !isPending && setOpen(false)}
          >
            <div
              className="tooltip-pop w-full max-w-sm rounded-theme border border-border bg-surface p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-lg uppercase tracking-wide text-text">{title}</h3>
              <p className="mt-1.5 text-sm text-text-muted">{description}</p>
              <div className="mt-5 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="button" variant="danger" onClick={confirm} disabled={isPending}>
                  {isPending ? "Working…" : confirmLabel}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
