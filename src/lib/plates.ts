export interface PlateEntry {
  weightKg: number;
  count: number; // total individual plates owned, not pairs
}

/** Parses "20x2, 10x4, 5x2" into structured plate entries. Also accepts a
 * bare "20, 10, 5" (count defaults to 2 — one pair) for backwards
 * compatibility with the old flat-list format. */
export function parsePlatesInput(raw: string): PlateEntry[] {
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [weightStr, countStr] = part.split(/x/i).map((s) => s.trim());
      const weightKg = Number.parseFloat(weightStr);
      const count = countStr ? Number.parseInt(countStr, 10) : 2;
      return { weightKg, count };
    })
    .filter((p) => Number.isFinite(p.weightKg) && p.weightKg > 0 && Number.isFinite(p.count) && p.count > 0);
}

export function formatPlatesForInput(plates: PlateEntry[]): string {
  return plates.map((p) => `${p.weightKg}x${p.count}`).join(", ");
}

/** Every achievable *per-side* load from the plates available, loading
 * symmetrically (the only way a barbell actually works) — so a single
 * 20kg plate doesn't count, but two do, one per side. */
export function achievablePerSideLoads(plates: PlateEntry[]): number[] {
  const pairs: number[] = [];
  for (const p of plates) {
    const pairCount = Math.floor(p.count / 2);
    for (let i = 0; i < pairCount; i++) pairs.push(p.weightKg);
  }

  let sums = new Set<number>([0]);
  for (const w of pairs) {
    const next = new Set(sums);
    for (const s of sums) next.add(Math.round((s + w) * 100) / 100);
    sums = next;
  }
  return [...sums].sort((a, b) => a - b);
}

/** Every total loaded weight (bar + plates on both sides) achievable from
 * what's on hand. */
export function achievableBarLoads(barWeightKg: number, plates: PlateEntry[]): number[] {
  return achievablePerSideLoads(plates).map((perSide) => Math.round((barWeightKg + perSide * 2) * 100) / 100);
}
