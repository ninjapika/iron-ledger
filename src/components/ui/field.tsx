import { InputHTMLAttributes, SelectHTMLAttributes, LabelHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("block text-xs font-medium uppercase tracking-wide text-text-muted mb-1.5", className)}
      {...props}
    />
  )
);
Label.displayName = "Label";

const fieldBase =
  "w-full rounded-theme border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-muted/60 focus:border-accent-strength focus:shadow-[var(--glow-soft)] outline-none transition-all";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldBase, className)} {...props} />
  )
);
Input.displayName = "Input";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(fieldBase, className)} {...props}>
      {children}
    </select>
  )
);
Select.displayName = "Select";

export function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-accent-danger">{children}</p>;
}
