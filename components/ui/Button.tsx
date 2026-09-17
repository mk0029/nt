"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff",
    boxShadow: "0 8px 24px rgba(99, 102, 241, 0.35)",
  },
  secondary: {
    background: "var(--glass-strong)",
    color: "var(--foreground)",
    border: "1px solid var(--glass-border)",
  },
  ghost: {
    color: "var(--foreground)",
  },
  danger: {
    background: "#ef4444",
    color: "#fff",
    boxShadow: "0 8px 24px rgba(239, 68, 68, 0.3)",
  },
  outline: {
    background: "transparent",
    color: "var(--foreground)",
    border: "1px solid var(--glass-border)",
  },
};

const sizeStyles: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
  icon: "size-10",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "active:scale-[0.98]",
        sizeStyles[size],
        className
      )}
      style={variant !== "ghost" ? variantStyles[variant] : { color: "var(--foreground)" }}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
);
Button.displayName = "Button";