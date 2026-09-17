"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

function RecoveryForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState(sp.get("email") ?? "");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Recovery failed");
      toast("success", "Account recovered. Welcome back!");
      router.push("/numbers?fresh=1");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Recovery failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4">
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
            <Link2 className="size-6 text-indigo-500" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold text-[var(--foreground)]">Account recovery</h1>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Enter the one-time code provided by an administrator
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
          <Input
            type="text"
            label="Recovery code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.toUpperCase())}
            placeholder="XXXXXXXX"
            required
            autoComplete="off"
            autoFocus
            maxLength={16}
          />
          <Button type="submit" size="md" className="w-full" loading={busy} disabled={busy}>
            Recover account
          </Button>
        </form>
      </div>
    </main>
  );
}

export default function RecoverPage() {
  return (
    <Suspense fallback={null}>
      <RecoveryForm />
    </Suspense>
  );
}