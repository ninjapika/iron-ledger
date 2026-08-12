"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";

/** Wraps server-rendered list children in an auto-animating container.
 * Lets a plain Server Component page keep its data-fetching + .map() as
 * server code, without converting the whole page (or duplicating its
 * list markup) into a client component just to get a ref onto the list. */
export function AnimatedList({ children, className }: { children: React.ReactNode; className?: string }) {
  const [ref] = useAutoAnimate();
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
