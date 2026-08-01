export interface ThemePreset {
  id: string;
  label: string;
  blurb: string;
  swatch: [string, string, string, string]; // strength, cardio, highlight, bg — for the picker preview
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "graphite-rust",
    label: "Graphite Rust",
    blurb: "Muted, editorial, flat — square corners, no glow, on purpose.",
    swatch: ["#c1502e", "#6c8ebf", "#d4a373", "#131313"],
  },
  {
    id: "neon-static",
    label: "Neon Static",
    blurb: "Cyberpunk grid, scanlines, cut corners, electric magenta and cyan.",
    swatch: ["#ff2e88", "#00e5ff", "#f5ff33", "#08060f"],
  },
  {
    id: "gotham-watch",
    label: "Gotham Watch",
    blurb: "Near-black and gunmetal, one gold accent, a slow searchlight sweep.",
    swatch: ["#a3231f", "#4c6b8a", "#f0c419", "#060607"],
  },
  {
    id: "glacier-drift",
    label: "Glacier Drift",
    blurb: "Frosted glass surfaces over a slowly drifting ice-blue aurora.",
    swatch: ["#ff8f6b", "#5ec8ea", "#bfe9ff", "#0a141b"],
  },
];

const THEME_IDS = THEME_PRESETS.map((t) => t.id);

export function isValidTheme(id: string): boolean {
  return THEME_IDS.includes(id);
}

/** Deterministic "theme of the day" — same theme all day, rotates daily. */
export function autoThemeForDate(date: Date): string {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86_400_000
  );
  return THEME_IDS[dayOfYear % THEME_IDS.length];
}
