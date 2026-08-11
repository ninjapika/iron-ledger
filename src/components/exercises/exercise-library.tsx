"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ExerciseRow } from "@/components/exercises/exercise-row";
import { Input, Select } from "@/components/ui/field";
import { CATEGORY_LABELS, EQUIPMENT_LABELS } from "@/lib/data/exercise-labels";

export interface LibraryExercise {
  id: string;
  name: string;
  category: string;
  equipment: string;
  trackingType: string;
  isCustom: boolean;
}

type GroupBy = "category" | "equipment";

const scrollRowClasses =
  "flex gap-2 overflow-x-auto pb-2 snap-x snap-proximity [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [scrollbar-width:thin]";

export function ExerciseLibrary({ catalog }: { catalog: LibraryExercise[] }) {
  const [query, setQuery] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("category");

  const q = query.trim().toLowerCase();

  // While actively searching, a flat, alphabetised match list reads far
  // better than horizontally-scrolling group rows — you want to scan
  // results top-to-bottom, not hunt sideways through whichever category
  // happened to match. Grouped/horizontal browsing only makes sense when
  // there's no query narrowing things down yet.
  const searchResults = useMemo(() => {
    if (!q) return null;
    return catalog.filter((ex) => ex.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog, q]);

  const grouped = useMemo(() => {
    const labels = groupBy === "category" ? CATEGORY_LABELS : EQUIPMENT_LABELS;
    const byGroup = new Map<string, LibraryExercise[]>();
    for (const ex of catalog) {
      const key = ex[groupBy];
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key)!.push(ex);
    }
    for (const list of byGroup.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    // Sort the groups themselves by their display label so the order stays
    // stable and alphabetical regardless of which group a given catalog row
    // happened to be inserted under first.
    return [...byGroup.entries()].sort((a, b) => (labels[a[0]] ?? a[0]).localeCompare(labels[b[0]] ?? b[0]));
  }, [catalog, groupBy]);

  const labels = groupBy === "category" ? CATEGORY_LABELS : EQUIPMENT_LABELS;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises…"
            className="pl-9"
            aria-label="Search exercises"
          />
        </div>
        <div className="w-40">
          <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} aria-label="Sort by">
            <option value="category">Muscle group</option>
            <option value="equipment">Equipment</option>
          </Select>
        </div>
      </div>

      {searchResults ? (
        searchResults.length === 0 ? (
          <p className="text-sm text-text-muted">No exercises match &ldquo;{query.trim()}&rdquo;.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {searchResults.map((ex) => (
              <ExerciseRow key={ex.id} {...ex} />
            ))}
          </div>
        )
      ) : (
        grouped.map(([key, list]) => (
          <div key={key}>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
              {labels[key] ?? key}
            </h2>
            <div className={scrollRowClasses}>
              {list.map((ex) => (
                <div key={ex.id} className="w-64 shrink-0 snap-start">
                  <ExerciseRow {...ex} />
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
