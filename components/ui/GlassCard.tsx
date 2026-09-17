"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, hover, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl",
        hover &&
          "transition-all duration-200 hover:scale-[1.01] cursor-pointer",
        className
      )}
      style={{
        background: "var(--glass)",
        border: "1px solid var(--glass-border)",
        backdropFilter: "blur(16px)",
        boxShadow: "var(--shadow)",
        WebkitBackdropFilter: "blur(16px)",
      }}
      {...props}
    >
      {children}
    </div>
  )
);
GlassCard.displayName = "GlassCard";