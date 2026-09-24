"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_ICONS: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />,
  error: <XCircle className="size-5 shrink-0 text-red-500" />,
  warning: <AlertTriangle className="size-5 shrink-0 text-amber-500" />,
  info: <Info className="size-5 shrink-0 text-indigo-500" />,
};

const TOAST_BORDER: Record<ToastType, string> = {
  success: "rgba(16,185,129,0.4)",
  error: "rgba(239,68,68,0.4)",
  warning: "rgba(245,158,11,0.4)",
  info: "rgba(99,102,241,0.4)",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const subscribe = useCallback(() => () => {}, []);
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (type: ToastType, message: string) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted && (
        <div
          className="pointer-events-none fixed left-4 right-4 top-4 z-[100] mx-auto flex w-auto max-w-sm flex-col gap-2"
          role="region"
          aria-live="polite"
        >
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[var(--foreground)]"
                style={{
                  background: "var(--glass-strong)",
                  border: `1px solid ${TOAST_BORDER[t.type]}`,
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  boxShadow: "var(--shadow)",
                }}
              >
                {TOAST_ICONS[t.type]}
                <span className="flex-1">{t.message}</span>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss"
                  className="rounded p-0.5 text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                >
                  <XCircle className="size-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}