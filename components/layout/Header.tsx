"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Menu, Phone, Lock, Settings, Shield, Plus, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/Button";
import { ConfigurePinDialog } from "@/components/security/ConfigurePinDialog";
import { RemoveLockDialog } from "@/components/security/RemoveLockDialog";
import { clearCache, notifyNumbersChanged } from "@/lib/realtime";

interface HeaderProps {
  onImport: () => void;
  isAdmin?: boolean;
  lockEnabled?: boolean;
  onLockRequest?: () => void;
  onLockChanged?: (configured: boolean) => void;
  hideImport?: boolean;
}

export function Header({
  onImport,
  isAdmin = false,
  lockEnabled = false,
  onLockRequest,
  onLockChanged,
  hideImport = false,
}: HeaderProps) {
  const router = useRouter();
  const [pinOpen, setPinOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

const handleLogout = async () => {
    // Clearing the local cache prevents the next user on this browser from
    // hydrating this user's data; navigation remounts the tree so no stale
    // in-memory state survives.
    clearCache();
    notifyNumbersChanged();
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.push("/login");
  };

  const handleLockClick = () => {
    if (lockEnabled) onLockRequest?.();
    else setPinOpen(true);
  };

  return (
    <header
      className="sticky top-0 z-40 w-full border-b backdrop-blur-xl"
      style={{
        background: "var(--glass-strong)",
        borderColor: "var(--glass-border)",
      }}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4">
        <div className="flex items-center gap-2.5">
          <div
            className="flex size-8 items-center justify-center rounded-lg"
            style={{
              background: "rgba(99,102,241,0.2)",
              border: "1px solid rgba(99,102,241,0.3)",
            }}
          >
            <Phone className="size-4 text-indigo-500" />
          </div>
          <span className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
            Number<span className="text-indigo-500"> Response Tracker</span>
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            <ThemeToggle />
            {isAdmin && (
              <Button
                variant="secondary"
                size="icon"
                onClick={() => router.push("/admin")}
                aria-label="Admin panel"
              >
                <Shield className="size-4" aria-hidden />
              </Button>
            )}

            {lockEnabled ? (
              <>
                <Button variant="secondary" size="icon" onClick={handleLockClick} aria-label="Lock now">
                  <Lock className="size-4" aria-hidden />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => setPinOpen(true)}
                  aria-label="Screen lock settings"
                >
                  <Settings className="size-4" aria-hidden />
                </Button>
              </>
            ) : (
              <Button variant="secondary" size="icon" onClick={handleLockClick} aria-label="Set screen lock">
                <Lock className="size-4" aria-hidden />
              </Button>
            )}

            {!hideImport && (
              <Button variant="primary" size="sm" onClick={onImport}>
                <Plus className="size-4" aria-hidden />
                Import Numbers
              </Button>
            )}
            <Button variant="secondary" size="icon" onClick={handleLogout} aria-label="Log out">
              <LogOut className="size-4" aria-hidden />
            </Button>
          </div>

          <div className="flex items-center gap-2 sm:hidden">
            <Button variant="secondary" size="icon" onClick={handleLockClick} aria-label={lockEnabled ? "Lock now" : "Set screen lock"}>
              <Lock className="size-4" aria-hidden />
            </Button>
            <Button variant="secondary" size="icon" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <Menu className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </div>

      <ConfigurePinDialog
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        configured={lockEnabled}
        onChanged={onLockChanged ?? (() => undefined)}
        onRequestRemove={() => {
          setPinOpen(false);
          setRemoveOpen(true);
        }}
      />
      <RemoveLockDialog
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        onChanged={onLockChanged ?? (() => undefined)}
      />

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {sidebarOpen && (
              <>
                <motion.div
                  key="backdrop"
                  className="fixed inset-0 z-[60]"
                  style={{ background: "var(--overlay)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSidebarOpen(false)}
                  aria-hidden
                />
                <motion.aside
                  key="drawer"
                  role="dialog"
                  aria-label="Menu"
                  className="fixed inset-y-0 right-0 z-[70] flex w-72 max-w-[85vw] flex-col overflow-y-auto border-l p-4 sm:hidden"
                  style={{
                    background: "var(--glass-strong)",
                    borderColor: "var(--glass-border)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                  }}
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", stiffness: 400, damping: 34 }}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex size-8 items-center justify-center rounded-lg"
                        style={{
                          background: "rgba(99,102,241,0.2)",
                          border: "1px solid rgba(99,102,241,0.3)",
                        }}
                      >
                        <Phone className="size-4 text-indigo-500" />
                      </div>
                      <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                        Number Response Tracker
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSidebarOpen(false)}
                      aria-label="Close menu"
                      className="rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                    >
                      <X className="size-5" />
                    </button>
                  </div>

                  <nav className="flex flex-col gap-1">
                    {!hideImport && (
                      <button
                        type="button"
                        onClick={() => {
                          setSidebarOpen(false);
                          onImport();
                        }}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]"
                      >
                        <Plus className="size-4 text-indigo-500" aria-hidden />
                        Import Numbers
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setSidebarOpen(false);
                          router.push("/admin");
                        }}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]"
                      >
                        <Shield className="size-4 text-indigo-500" aria-hidden />
                        Admin panel
                      </button>
                    )}
                    {lockEnabled && (
                      <button
                        type="button"
                        onClick={() => {
                          setSidebarOpen(false);
                          setPinOpen(true);
                        }}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]"
                      >
                        <Settings className="size-4 text-indigo-500" aria-hidden />
                        Screen lock settings
                      </button>
                    )}

                    <div
                      className="mt-2 flex items-center justify-between border-t px-3 py-3"
                      style={{ borderColor: "var(--glass-border)" }}
                    >
                      <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                        Theme
                      </span>
                      <ThemeToggle />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSidebarOpen(false);
                        void handleLogout();
                      }}
                      className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-[var(--surface-hover)]"
                    >
                      <LogOut className="size-4" aria-hidden />
                      Log out
                    </button>
                  </nav>
                </motion.aside>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </header>
  );
}