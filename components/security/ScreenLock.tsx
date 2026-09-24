"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";

export interface UnlockResult {
  error?: string;
  attemptsLeft?: number;
  retryAfterSeconds?: number;
  forgot?: boolean;
}

interface ScreenLockProps {
  onUnlock: (pin: string) => Promise<UnlockResult | null>;
}

export function ScreenLock({ onUnlock }: ScreenLockProps) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryIn, setRetryIn] = useState(0);

  useEffect(() => {
    if (retryIn <= 0) return;
    const t = setTimeout(() => setRetryIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [retryIn]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pin || busy || retryIn > 0) return;
    setBusy(true);
    setError(null);
    try {
      const result = await onUnlock(pin);
      // null = success (parent already switched phase)
      if (result?.forgot) {
        // parent is hard-redirecting to recovery; keep UI quiet
      } else if (result && result.retryAfterSeconds) {
        setRetryIn(result.retryAfterSeconds);
        setError(result.error ?? "Too many attempts. Try again later.");
      } else if (result) {
        setError(result.error ?? "Incorrect PIN");
      }
      setPin("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="absolute inset-0 flex min-h-[100dvh] items-center justify-center px-4"
      style={{ background: "var(--surface)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          background: "var(--glass-strong)",
          border: "1px solid var(--glass-border)",
          backdropFilter: "blur(20px)",
          boxShadow: "var(--shadow)",
        }}
      >
        <div className="mb-8 flex flex-col items-center gap-3">
          <div
            className="flex size-12 items-center justify-center rounded-xl"
            style={{
              background: "rgba(99,102,241,0.2)",
              border: "1px solid rgba(99,102,241,0.3)",
            }}
          >
            <Lock className="size-6 text-indigo-500" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold text-[var(--foreground)]">Screen locked</h1>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Enter your PIN to continue
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <PasswordInput
            label="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            required
            autoFocus
            autoComplete="off"
            disabled={busy}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button type="submit" size="md" className="w-full" loading={busy} disabled={busy || retryIn > 0}>
            {retryIn > 0 ? `Try again in ${retryIn}s` : "Unlock"}
          </Button>
        </form>
      </div>
    </div>
  );
}