import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "btn-primary bg-gradient-to-br from-accent-strength to-accent-strength/80 text-bg font-semibold shadow-[var(--glow-soft)] hover:brightness-110 hover:shadow-[var(--glow)] active:scale-[0.97] active:brightness-95",
  secondary:
    "bg-surface-2 text-text border border-border hover:border-accent-strength/50 active:scale-[0.97]",
  ghost: "bg-transparent text-text-muted hover:text-text hover:bg-surface-2 active:scale-[0.97]",
  danger: "bg-accent-danger text-bg font-semibold hover:brightness-110 active:scale-[0.97]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-theme px-4 py-2 text-sm transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100",
          variantClasses[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
