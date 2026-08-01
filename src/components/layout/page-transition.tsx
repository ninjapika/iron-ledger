"use client";

import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // key={pathname} forces a remount on navigation, which is what re-triggers
  // the CSS animation — a plain re-render wouldn't restart it.
  return (
    <div key={pathname} className="page-in">
      {children}
    </div>
  );
}
