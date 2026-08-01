import type { Metadata } from "next";
import "@fontsource/manrope/400";
import "@fontsource/manrope/500";
import "@fontsource/manrope/600";
import "@fontsource/manrope/700";
import "@fontsource/big-shoulders-display/500";
import "@fontsource/big-shoulders-display/600";
import "@fontsource/big-shoulders-display/700";
import "@fontsource/big-shoulders-display/800";
import "@fontsource/ibm-plex-mono/400";
import "@fontsource/ibm-plex-mono/500";
import "@fontsource/ibm-plex-mono/600";
import "@fontsource/bebas-neue/400";
import "@fontsource/orbitron/500";
import "@fontsource/orbitron/700";
import "@fontsource/orbitron/900";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth/current-user";
import { autoThemeForDate, isValidTheme } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Iron Ledger",
  description: "A private strength, cardio and program tracker.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  let theme = "graphite-rust";
  if (user) {
    theme =
      user.settings.autoRotateTheme || !isValidTheme(user.settings.themePreset)
        ? autoThemeForDate(new Date())
        : user.settings.themePreset;
  }

  return (
    <html lang="en" data-theme={theme} className="h-full antialiased">
      <body className="min-h-full">
        {/* Background FX — one shared structure for all four themes, pure
            CSS toggles which layers are visible/animated (see globals.css).
            Fixed behind everything; .app-shell in each layout stacks the
            real content above it. */}
        <div className="theme-fx" aria-hidden="true">
          <div className="fx-layer fx-grain" />
          <div className="fx-layer fx-grid" />
          <div className="fx-layer fx-scanline" />
          <div className="fx-layer fx-flicker" />
          <div className="fx-layer fx-vignette" />
          <div className="fx-layer fx-spotlight" />
          <div className="fx-layer fx-aurora" />
        </div>
        {children}
      </body>
    </html>
  );
}
