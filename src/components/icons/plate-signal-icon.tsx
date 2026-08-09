import { SVGProps } from "react";

/** A weight plate with a signal fanning off it — Iron Ledger's own mark for
 * "this connects out to a model provider," instead of a generic plug/link
 * glyph. Drawn by hand to match lucide-react's stroke-icon conventions
 * (round caps/joins, currentColor, 24x24 viewBox) so it sits next to the
 * rest of the icon set without looking imported. */
export function PlateSignalIcon({ size = 20, strokeWidth = 2, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="8.5" cy="15.5" r="6" />
      <circle cx="8.5" cy="15.5" r="1.4" fill="currentColor" stroke="none" />
      <path d="M9.15 8.03 A7.5 7.5 0 0 1 15.97 14.85" />
      <path d="M9.33 6.04 A9.5 9.5 0 0 1 17.96 14.67" />
      <path d="M9.5 4.04 A11.5 11.5 0 0 1 19.96 14.5" />
    </svg>
  );
}
