import { HTMLAttributes, Ref } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds hover lift + the theme's glow — use for genuinely clickable
   * cards (nav-like links, program cards), not static content panels. */
  interactive?: boolean;
  /** React 19 accepts ref as a plain prop on function components — no
   * forwardRef needed. Typed explicitly (rather than via
   * ComponentProps<"div">) so the rest of the file's existing prop-typing
   * style doesn't have to change. Used by auto-animate's useAutoAnimate(),
   * which needs a ref straight onto the list container it's animating. */
  ref?: Ref<HTMLDivElement>;
}

export function Card({ className, interactive, ref, ...props }: CardProps) {
  return (
    <div
      ref={ref}
      className={cn(
        // card-interactive drives the per-theme hover flourish (rule line,
        // glitch nudge, signal flash, light sweep) — applied to every card
        // since it's hover-only and harmless on static ones; the heavier
        // lift+glow below stays opt-in via the `interactive` prop.
        "card-interactive rounded-theme border border-border bg-surface transition-[box-shadow,transform,border-color] duration-200",
        interactive && "glow-interactive hover:-translate-y-0.5 hover:border-accent-strength/40 cursor-pointer",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pt-4 pb-2", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-display text-lg uppercase tracking-wide text-text", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ref, ...props }: HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }) {
  return <div ref={ref} className={cn("px-5 pb-5", className)} {...props} />;
}
