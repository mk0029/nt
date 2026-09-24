"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useToast } from "@/components/ui/Toast";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.code === "forgot") {
          router.push(`/recover?email=${encodeURIComponent(email)}`);
          return;
        }
        throw new Error(data?.error ?? "Login failed");
      }
      toast("success", "Welcome back!");
      router.push("/numbers?fresh=1");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Login failed");
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
            <Phone className="size-6 text-indigo-500" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold text-[var(--foreground)]">Sign in</h1>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Access your saved numbers
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
            autoFocus
          />
          <PasswordInput
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
          <Button type="submit" size="md" className="w-full" loading={busy} disabled={busy}>
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: "var(--muted)" }}>
          No account?{" "}
          <Link href="/signup" className="font-medium text-indigo-500 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}