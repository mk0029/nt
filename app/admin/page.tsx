"use client";

import { useEffect, useState } from "react";
import { Shield, Copy, Check } from "lucide-react";
import { ProtectedApp } from "@/components/security/ProtectedApp";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/utils";

interface ForgotUser {
  _id: string;
  email: string;
  lockLastFailedAt: string | null;
  createdAt: string | null;
}

interface GeneratedCode {
  userId: string;
  email: string;
  code: string;
  expiresAt: string;
}

function AdminDashboard() {
  const { toast } = useToast();
  const [users, setUsers] = useState<ForgotUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [code, setCode] = useState<GeneratedCode | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/recovery");
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (alive) setUsers(data.users ?? []);
      } catch {
        if (alive) toast("error", "Failed to load forgot accounts");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [toast]);

  const generate = async (userId: string) => {
    setGenerating(userId);
    try {
      const res = await fetch("/api/admin/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to generate code");
      setCode(data as GeneratedCode);
      setCopied(false);
      toast("success", "Recovery code generated");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Failed to generate code");
    } finally {
      setGenerating(null);
    }
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("error", "Could not copy code");
    }
  };

  return (
    <>
      <Header
        onImport={() => undefined}
        hideImport
        isAdmin
      />

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-4 px-4 py-6 md:px-6">
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-indigo-500" aria-hidden />
          <h1 className="text-lg font-bold text-[var(--foreground)]">Admin — Account recovery</h1>
        </div>

        {code && (
          <div
            className="flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between"
            style={{
              background: "var(--glass-strong)",
              border: "1px solid rgba(99,102,241,0.4)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="min-w-0">
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                One-time recovery code for <span className="font-medium text-[var(--foreground)]">{code.email}</span> —
                expires {formatDateTime(code.expiresAt)}
              </p>
              <p className="mt-1 text-2xl font-bold tracking-[0.2em] text-[var(--foreground)]">{code.code}</p>
              <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                Show this to the user once; it is single-use and cannot be retrieved again.
              </p>
            </div>
            <Button variant="secondary" size="md" onClick={copyCode}>
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        )}

        <div
          className="rounded-2xl"
          style={{
            background: "var(--glass-strong)",
            border: "1px solid var(--glass-border)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="border-b px-5 py-4" style={{ borderColor: "var(--glass-border)" }}>
            <h2 className="text-base font-semibold text-[var(--foreground)]">Forgot accounts</h2>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : users.length === 0 ? (
            <p className="p-5 text-sm" style={{ color: "var(--muted)" }}>
              No accounts are currently in the forgot (recovery) state.
            </p>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--glass-border)" }}>
              {users.map((user) => (
                <div key={user._id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--foreground)]">{user.email}</p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      Failed at {formatDateTime(user.lockLastFailedAt)}
                      {user.createdAt ? ` · Joined ${formatDateTime(user.createdAt)}` : ""}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => generate(user._id)}
                    loading={generating === user._id}
                    disabled={generating !== null}
                  >
                    Generate code
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default function AdminPage() {
  return (
    <ProtectedApp requireAdmin>
      <AdminDashboard />
    </ProtectedApp>
  );
}