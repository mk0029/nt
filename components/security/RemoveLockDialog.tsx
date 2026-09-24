"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useToast } from "@/components/ui/Toast";

interface RemoveLockDialogProps {
  open: boolean;
  onClose: () => void;
  onChanged: (configured: boolean) => void;
}

/** Dedicated modal for disabling the screen lock. Reasons with the user
 *  first, clears the stored PIN server-side, and confirms without touching
 *  the change-PIN flow. */
export function RemoveLockDialog({ open, onClose, onChanged }: RemoveLockDialogProps) {
  const { toast } = useToast();
  const [currentPin, setCurrentPin] = useState("");
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
    if (!currentPin || busy || retryIn > 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/security/pin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === "forgot") {
          // Server invalidated sessions and moved the account to recovery.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intentional full reset after lockout
          window.location.assign("/recover");
          return;
        }
        if (res.status === 429) {
          setError(data.error as string);
          setRetryIn((data.retryAfterSeconds as number) ?? 30);
          return;
        }
        setError((data.error as string) ?? "Could not disable the screen lock");
        return;
      }
      toast("success", "Screen lock disabled");
      setCurrentPin("");
      onChanged(false);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Disable screen lock" maxWidth="sm">
      {() => (
        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}
            >
              <AlertTriangle className="size-4 text-red-500" aria-hidden />
            </div>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Your current PIN will be permanently deleted and the screen lock will no longer be
              required when you use the app on this device.
            </p>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <PasswordInput
            label="Current PIN"
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value)}
            placeholder="••••"
            required
            disabled={busy || retryIn > 0}
            autoComplete="off"
          />
          <Button type="submit" variant="danger" size="md" className="w-full" loading={busy} disabled={busy || retryIn > 0}>
            {retryIn > 0 ? `Try again in ${retryIn}s` : "Disable screen lock"}
          </Button>
        </form>
      )}
    </Dialog>
  );
}