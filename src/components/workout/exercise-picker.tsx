"use client";

import { useMemo, useState, useRef, useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/field";
import { CATEGORY_LABELS, EQUIPMENT_LABELS } from "@/lib/data/exercise-labels";
import { cn } from "@/lib/cn";

export interface ExerciseOption {
  id: string;
  name: string;
  category: string;
  equipment: string;
  trackingType: string;
}

export function ExercisePicker({
  exercises,
  onSelect,
  excludeIds = [],
  placeholder = "Add an exercise…",
  allowedCategories = null,
}: {
  exercises: ExerciseOption[];
  onSelect: (id: string) => void;
  excludeIds?: string[];
  placeholder?: string;
  /** Restricts the list to these categories (e.g. ["cardio"] when logging
   * a Cardio-type session). null/omitted means no filtering. */
  allowedCategories?: string[] | null;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // The dropdown is portaled straight to <body> (see the render below) so
  // it can never get silently clipped by an ancestor's `overflow` or the
  // theme engine's `clip-path` (every rounded-theme Card has one — see
  // globals.css — which otherwise cuts the list off wherever it happens to
  // cross the card's edge, e.g. inside the program builder's day cards).
  // Because it's portaled, it's no longer a DOM descendant of rootRef, so
  // the outside-click check below also needs its own ref, and position is
  // tracked in fixed viewport coordinates read off the input itself.
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  // "Are we hydrated on the client yet" as an external-store read rather
  // than a useState+useEffect flip — the effect version calls setState
  // unconditionally in its body, which is exactly the "should've just been
  // derived state" anti-pattern the react-hooks lint rule (rightly) flags.
  // useSyncExternalStore returns the server snapshot (false) through the
  // hydration render, then the client snapshot (true) right after —
  // subscribe is a no-op since this can only ever change once.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    function updateCoords() {
      if (!rootRef.current) return;
      const rect = rootRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom, left: rect.left, width: rect.width });
    }
    updateCoords();
    // Capture phase so this also fires for scrolling inside any nested
    // scroll container, not just the window itself.
    window.addEventListener("scroll", updateCoords, true);
    window.addEventListener("resize", updateCoords);
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [open]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = exercises.filter(
      (e) =>
        !excludeIds.includes(e.id) &&
        (q === "" || e.name.toLowerCase().includes(q)) &&
        (!allowedCategories || allowedCategories.includes(e.category))
    );
    const byCategory = new Map<string, ExerciseOption[]>();
    for (const ex of filtered) {
      if (!byCategory.has(ex.category)) byCategory.set(ex.category, []);
      byCategory.get(ex.category)!.push(ex);
    }
    return byCategory;
  }, [exercises, query, excludeIds, allowedCategories]);

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <Input
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>
      {mounted &&
        open &&
        createPortal(
          <div
            ref={dropdownRef}
            className="tooltip-pop fixed z-[100] max-h-72 overflow-y-auto rounded-md border border-border bg-surface-2 shadow-lg"
            style={{ top: coords.top + 4, left: coords.left, width: coords.width }}
          >
            {grouped.size === 0 && (
              <p className="px-3 py-3 text-sm text-text-muted">No matching exercises.</p>
            )}
            {[...grouped.entries()].map(([category, list]) => (
              <div key={category}>
                <div className="sticky top-0 bg-surface-2 px-3 pt-2 pb-1 text-[11px] uppercase tracking-wide text-text-muted">
                  {CATEGORY_LABELS[category] ?? category}
                </div>
                {list.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      onSelect(ex.id);
                      setQuery("");
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-left text-sm text-text hover:bg-bg"
                    )}
                  >
                    {ex.name}
                    <span className="text-[11px] text-text-muted">{EQUIPMENT_LABELS[ex.equipment] ?? ex.equipment}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
