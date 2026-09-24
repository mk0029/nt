"use client";

import { forwardRef, useCallback, useId, useState, type ReactNode } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: ReactNode;
}

interface SelectProps {
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  ({ label, value, onChange, options, className, placeholder = "Select…", disabled, "aria-label": ariaLabel }, ref) => {
    const id = useId();
    const selected = options.find((o) => o.value === value);

    // Popovers portaled to document.body render BELOW a native <dialog> because
    // dialogs live in the browser's top layer (above every z-index). Mount the
    // dropdown inside the nearest dialog so it shows above the modal. We cannot
    // match `dialog[open]`: this Select mounts before the dialog's effect calls
    // showModal(), so at ref time the open attribute isn't set yet.
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
    const setContainerRef = useCallback((node: HTMLDivElement | null) => {
      if (!node) return;
      const host = node.closest("dialog");
      setPortalTarget(host ?? document.body);
    }, []);

    return (
      <div className="w-full" ref={setContainerRef}>
        {label && (
          <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
            {label}
          </label>
        )}
        <SelectPrimitive.Root value={value} onValueChange={onChange} disabled={disabled}>
          <SelectPrimitive.Trigger
            ref={ref}
            id={id}
            aria-label={ariaLabel ?? label}
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-xl px-3 text-sm text-[var(--foreground)] outline-none transition-colors duration-200",
              "data-[placeholder]:text-[var(--muted)] focus:ring-2 focus:ring-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-50",
              className
            )}
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <span className="truncate">{selected ? selected.label : placeholder}</span>
            <ChevronDown className="size-4 shrink-0 text-[var(--muted)]" aria-hidden />
          </SelectPrimitive.Trigger>
          <SelectPrimitive.Portal container={portalTarget ?? undefined}>
            <SelectPrimitive.Content
              position="popper"
              sideOffset={6}
              className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl p-1 shadow-lg"
              style={{
                background: "var(--glass-strong)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <SelectPrimitive.Viewport>
                {options.map((o) => (
                  <SelectPrimitive.Item
                    key={o.value}
                    value={o.value}
                    className="flex cursor-pointer select-none items-center justify-between rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-colors data-[highlighted]:bg-[var(--surface-hover)]"
                  >
                    <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                    <SelectPrimitive.ItemIndicator>
                      <Check className="size-4 text-indigo-500" aria-hidden />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
      </div>
    );
  }
);
Select.displayName = "Select";