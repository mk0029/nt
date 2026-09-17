"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        className={cn(
          "w-full rounded-xl px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition-colors duration-200",
          "placeholder:text-[var(--muted)] focus:ring-2 focus:ring-indigo-500/50",
          error && "focus:ring-red-500/50",
          className
        )}
        style={{
          background: "var(--input-bg)",
          border: `1px solid ${error ? "rgba(239,68,68,0.5)" : "var(--glass-border)"}`,
        }}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
);
Textarea.displayName = "Textarea";