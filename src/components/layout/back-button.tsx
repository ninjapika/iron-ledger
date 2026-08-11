"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/** Mobile-only — desktop always has the sidebar for navigation, so a back
 * control there would be redundant. Hidden on the dashboard itself, since
 * that's the app's home base rather than a page drilled into from
 * somewhere; every other page gets it, including nested ones like
 * /history/[id] and /programs/[id]/edit where it matters most. */
export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();

  if (pathname === "/dashboard") return null;

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Go back"
      className="sticky top-0 z-30 -ml-1.5 mb-3 flex items-center gap-1 rounded-theme px-1.5 py-1 text-xs text-text-muted transition-colors hover:text-text md:hidden"
    >
      <ChevronLeft size={18} />
      Back
    </button>
  );
}
