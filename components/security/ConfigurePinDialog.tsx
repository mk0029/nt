"use client";

import { useState, type FormEvent } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useToast } from "@/components/ui/Toast";

interface ConfigurePinDialogProps {
  open: boolean;
  onClose: () => void;
  /** Whether a screen-lock PIN is already configured. */
  configured: boolean;
  onChanged: (configured: boolean) => void;
  /** Called instead of a local remove button — opens the dedicated disable modal. */
  onRequestRemove?: () => void;
}

export function ConfigurePinDialog({
  open,
  onClose,
  configured,
  onChanged,
  onRequestRemove,
}: ConfigurePinDialogProps) {
  const { toast } = useToast();
  const [currentPin, setCurrentPin] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryIn, setRetryIn] = useState(0);

  const applyError = (status: number, data: Record<string, unknown>) => {
    if (data.code === "forgot") {
      // Full reload: server invalidated every session and moved the account to
      // recovery — no SPA state should survive.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intentional full reset after lockout
      window.location.assign("/recover");
      return;
    }
    if (status === 429) {
      setError(data.error as string);
      setRetryIn((data.retryAfterSeconds as number) ?? 30);
      return;
    }
    setError((data.error as string) ?? "Something went wrong");
  };

  const handleSet = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || retryIn > 0) return;
    if (pin.length < 4) {
      setError("PIN must be at least 4 characters");
      return;
    }
    if (pin !== confirm) {
      setError("PINs do not match");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/security/pin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, currentPin: currentPin || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        applyError(res.status, data);
        return;
      }
      toast("success", configured ? "Screen lock PIN updated" : "Screen lock enabled");
      setPin("");
      setConfirm("");
      setCurrentPin("");
      onChanged(true);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = () => {
    if (busy || retryIn > 0) return;
    setError(null);
    onRequestRemove?.();
  };

  return (
    <Dialog open={open} onClose={onClose} title={configured ? "Screen lock settings" : "Enable screen lock"} maxWidth="sm">
      {() => (
        <div className="p-5">
          <p className="mb-4 text-sm" style={{ color: "var(--muted)" }}>
            {configured
              ? "Change your PIN, or disable the screen lock."
              : "Set a PIN. The lock protects this device when you leave the app, and the server verifies it on every unlock."}
          </p>

          <form onSubmit={handleSet} className="space-y-4">
            {configured && (
              <PasswordInput
                label="Current PIN"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="••••"
                autoComplete="off"
                required
              />
            )}
            <PasswordInput
              label={configured ? "New PIN" : "PIN"}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="At least 4 characters"
              autoComplete="off"
              minLength={4}
              required
            />
            <PasswordInput
              label="Confirm PIN"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat the PIN"
              autoComplete="off"
              minLength={4}
              required
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <Button type="submit" size="md" className="w-full" loading={busy} disabled={busy || retryIn > 0}>
              {configured ? "Save new PIN" : "Enable screen lock"}
            </Button>
          </form>

          {configured && (
            <Button
              variant="danger"
              size="sm"
              className="mt-3 w-full"
              onClick={handleRemove}
              disabled={busy || retryIn > 0}
            >
              Disable screen lock…
            </Button>
          )}
        </div>
      )}
    </Dialog>
  );
}