"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  mobileFullHeight?: boolean;
  renderChildren?: (close: () => void) => ReactNode;
  children?: (close: () => void) => ReactNode;
}

const maxWidthStyles: Record<NonNullable<DialogProps["maxWidth"]>, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

// Literal classes so Tailwind generates the responsive variants too.
const desktopWidthStyles: Record<
  NonNullable<DialogProps["maxWidth"]>,
  string
> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

export function Dialog({
  open,
  onClose,
  title,
  maxWidth = "md",
  mobileFullHeight = false,
  renderChildren,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement;
      dialog.showModal();
      document.body.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
      document.body.style.overflow = "";
      previouslyFocusedRef.current?.focus?.();
    }
  }, [open]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = ref.current;
    // Clicks inside the card land on child elements; clicks on the backdrop
    // land on the <dialog> itself, outside its bounding box.
    if (!dialog || e.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const inside =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    if (!inside) dialog.close();
  };

  const render = (close: () => void) => {
    if (renderChildren) return renderChildren(close);
    if (children) return children(close);
    return null;
  };

  return (
    <dialog
      ref={ref}
      className={
        mobileFullHeight
          ? // Fill the viewport edge-to-edge on mobile; normal sheet on sm+.
            `m-0 h-[100dvh] w-full max-w-none rounded-none p-0 sm:m-auto sm:h-auto sm:w-auto sm:rounded-2xl ${desktopWidthStyles[maxWidth]}`
          : `m-auto rounded-2xl p-0 ${maxWidthStyles[maxWidth]}`
      }
      style={{
        background: "transparent",
        border: "none",
        colorScheme: "dark",
      }}
      onClose={onClose}
      onClick={handleBackdropClick}>
      <style>{`
        dialog::backdrop {
          background: var(--overlay);
          backdrop-filter: blur(8px);
        }
        dialog[open] {
          animation: dialogIn 0.2s ease-out;
        }
        @keyframes dialogIn {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div
        className={[
          "flex flex-col overflow-hidden grow",
          mobileFullHeight
            ? "h-full max-h-none rounded-none sm:h-auto sm:max-h-[88dvh] sm:rounded-2xl"
            : "max-h-[88dvh] rounded-2xl",
        ].join(" ")}
        style={{
          background: "var(--glass-strong)",
          border: "1px solid var(--glass-border)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "var(--shadow)",
        }}>
        {title && (
          <div
            className="flex items-center justify-between border-b px-5 py-4"
            style={{ borderColor: "var(--glass-border)" }}>
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]">
              <X className="size-5" />
            </button>
          </div>
        )}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {render(onClose)}
        </div>
      </div>
    </dialog>
  );
}
