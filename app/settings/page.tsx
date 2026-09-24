"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, LogOut, MessageSquare, Plus, Palette, Trash2 } from "lucide-react";
import { ProtectedApp, useProtected } from "@/components/security/ProtectedApp";
import { Header } from "@/components/layout/Header";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useTheme } from "@/components/providers/ThemeProvider";
import { ConfigurePinDialog } from "@/components/security/ConfigurePinDialog";
import { RemoveLockDialog } from "@/components/security/RemoveLockDialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GlassCard } from "@/components/ui/GlassCard";
import { useToast } from "@/components/ui/Toast";
import { clearCache, notifyNumbersChanged } from "@/lib/realtime";

interface ResponsePreset {
  _id: string;
  text: string;
}

function SettingsPage() {
  const ctx = useProtected();
  const { toast } = useToast();
  const router = useRouter();
  const { theme } = useTheme();
  const [pinOpen, setPinOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [presets, setPresets] = useState<ResponsePreset[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleLogout = async () => {
    // Clearing the local cache prevents the next user on this browser from
    // hydrating this user's data; navigation remounts the tree so no stale
    // in-memory state survives.
    clearCache();
    notifyNumbersChanged();
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.push("/login");
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/presets", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (alive) setPresets(data.presets ?? []);
      } catch {
        if (alive) toast("error", "Failed to load shortcuts");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [toast]);

  const addPreset = async () => {
    const value = text.trim();
    if (!value) return;
    setSaving(true);
    try {
      const res = await fetch("/api/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to save");
      setPresets((prev) => [...prev, data.preset]);
      setText("");
      toast("success", "Shortcut saved");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const deletePreset = async (id: string) => {
    try {
      const res = await fetch(`/api/presets/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setPresets((prev) => prev.filter((p) => p._id !== id));
      toast("success", "Shortcut deleted");
    } catch {
      toast("error", "Failed to delete");
    }
  };

  return (
    <>
      <Header
        onImport={() => undefined}
        hideImport
        isAdmin={ctx.user.isAdmin}
      />

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-4 py-4 md:space-y-6 md:px-6 md:py-6">
        <div className="flex items-center gap-3">
          <Link
            href="/numbers"
            aria-label="Back to numbers"
            title="Back to numbers"
            className="inline-flex size-9 items-center justify-center rounded-xl transition-colors hover:bg-[var(--surface-hover)]"
            style={{ border: "1px solid var(--glass-border)", color: "var(--foreground)" }}
          >
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[var(--foreground)]">Settings</h1>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Manage your preferences
            </p>
          </div>
        </div>

        <GlassCard className="overflow-hidden">
          <div
            className="flex items-center gap-2 border-b px-5 py-4"
            style={{ borderColor: "var(--glass-border)" }}
          >
            <Palette className="size-4 text-indigo-500" aria-hidden />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Preferences
            </h2>
          </div>

          <div className="flex flex-col gap-2 p-5">
            <div className="flex items-center justify-between gap-4 rounded-xl px-4 py-3"
              style={{ background: "var(--surface-hover)", border: "1px solid var(--glass-border)" }}
            >
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  Theme
                </p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  {theme === "dark" ? "Dark" : "Light"} mode
                </p>
              </div>
              <ThemeToggle />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl px-4 py-3"
              style={{ background: "var(--surface-hover)", border: "1px solid var(--glass-border)" }}
            >
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  Screen lock
                </p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  {ctx.lockEnabled
                    ? "Lock code is set"
                    : "Lock code is not set"}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {ctx.lockEnabled && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={ctx.lockNow}>
                    <Lock className="size-3.5" aria-hidden />
                    Lock now
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPinOpen(true)}>
                  {ctx.lockEnabled ? "Change PIN" : "Set up"}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl px-4 py-3"
              style={{ background: "var(--surface-hover)", border: "1px solid var(--glass-border)" }}
            >
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  Sign out
                </p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Log out from this device
                </p>
              </div>
              <Button variant="danger" size="sm" onClick={() => void handleLogout()}>
                <LogOut className="size-3.5" aria-hidden />
                Log out
              </Button>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="overflow-hidden">
          <div
            className="flex items-center gap-2 border-b px-5 py-4"
            style={{ borderColor: "var(--glass-border)" }}
          >
            <MessageSquare className="size-4 text-indigo-500" aria-hidden />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Response shortcuts
            </h2>
          </div>

          <div className="space-y-4 p-5">
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Save short responses here to quickly fill the Last response field
              when you update a number.
            </p>

            <div className="flex items-center gap-2">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void addPreset();
                  }
                }}
                placeholder="e.g. Will come, thanks"
                aria-label="New shortcut text"
              />
              <Button
                variant="primary"
                size="md"
                onClick={addPreset}
                loading={saving}
                disabled={!text.trim()}>
                <Plus className="size-4" aria-hidden />
                Add
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              {loading ? (
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  Loading…
                </p>
              ) : presets.length === 0 ? (
                <p
                  className="rounded-xl px-4 py-6 text-center text-sm"
                  style={{ background: "var(--surface-hover)", color: "var(--muted)" }}
                >
                  No shortcuts yet. Add one above.
                </p>
              ) : (
                presets.map((p) => (
                  <div
                    key={p._id}
                    className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                    style={{
                      background: "var(--surface-hover)",
                      border: "1px solid var(--glass-border)",
                    }}>
                    <span className="min-w-0 truncate text-sm" style={{ color: "var(--foreground)" }}>
                      {p.text}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void deletePreset(p._id)}
                      aria-label="Delete shortcut">
                      <Trash2 className="size-4 text-red-400" aria-hidden />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </GlassCard>
      </main>

      <ConfigurePinDialog
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        configured={ctx.lockEnabled}
        onChanged={() => void ctx.refreshLock()}
        onRequestRemove={() => {
          setPinOpen(false);
          setRemoveOpen(true);
        }}
      />
      <RemoveLockDialog
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        onChanged={() => void ctx.refreshLock()}
      />
    </>
  );
}

export default function SettingsRoute() {
  return (
    <ProtectedApp>
      <SettingsPage />
    </ProtectedApp>
  );
}