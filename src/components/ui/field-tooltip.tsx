"use client";

import { useLayoutEffect, useState, useSyncExternalStore, type RefObject } from "react";
import { createPortal } from "react-dom";

/** A small, transient callout anchored under a field — e.g. "that name's
 * already taken." Portaled to <body> for the same reason ExercisePicker's
 * dropdown is (see src/components/workout/exercise-picker.tsx): anything
 * absolutely-positioned inside a `.rounded-theme` ancestor gets silently
 * clipped by that element's theme clip-path the moment it overflows. */
export function FieldTooltip({
  message,
  anchorRef,
  tone = "danger",
}: {
  message: string | null;
  anchorRef: RefObject<HTMLElement | null>;
  tone?: "danger" | "highlight";
}) {
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useLayoutEffect(() => {
    if (!message || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setCoords({ top: rect.bottom + 6, left: rect.left });
  }, [message, anchorRef]);

  if (!mounted || !message) return null;

  return createPortal(
    <div
      role="status"
      className={
        "tooltip-pop fixed z-[100] max-w-[260px] rounded-lg border px-3 py-1.5 text-xs shadow-lg shadow-black/30 " +
        (tone === "danger" ? "border-accent-danger/50 bg-surface-2 text-text" : "border-accent-highlight/50 bg-surface-2 text-text")
      }
      style={{ top: coords.top, left: coords.left }}
    >
      {message}
    </div>,
    document.body
  );
}
