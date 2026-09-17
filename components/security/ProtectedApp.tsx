"use client";

import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ScreenLock, type UnlockResult } from "./ScreenLock";
import { clearCache, notifyNumbersChanged, onNumbersChanged } from "@/lib/realtime";
import type { MeResponse } from "@/types/security";

export const INACTIVITY_LOCK_MS = 300000;

type Phase = "checking" | "unlocked" | "locked" | "guest" | "forgot";

// Survives client-side (SPA) navigation between protected routes, keyed to the
// logged-in user, so switching pages does not re-lock but switching accounts
// cannot inherit an unlocked state. It resets on any real page load (refresh,
// new tab, direct URL), which is exactly when the lock must be re-enforced.
let unlockSession = { userId: "", active: false };

export interface ProtectedContext {
  user: MeResponse["user"];
  lockEnabled: boolean;
  lockNow: () => void;
  refreshLock: () => Promise<void>;
}

interface ProtectedAppProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

const ProtectedContext = createContext<ProtectedContext | null>(null);

export function useProtected(): ProtectedContext {
  const ctx = useContext(ProtectedContext);
  if (!ctx) throw new Error("useProtected must be used within <ProtectedApp>");
  return ctx;
}

function Splash() {
  return (
    <div
      className="flex min-h-[100dvh] items-center justify-center"
      style={{ background: "var(--surface)" }}
    >
      <Loader2 className="size-6 animate-spin text-indigo-500" aria-hidden />
    </div>
  );
}

function ProtectedCore({ children, requireAdmin }: ProtectedAppProps) {
  const router = useRouter();
  const sp = useSearchParams();

  const [phase, setPhase] = useState<Phase>("checking");
  const [me, setMe] = useState<MeResponse | null>(null);
  const emailRef = useRef<string>("");
  const userIdRef = useRef<string>("");

  const enabledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lockNow = useCallback(() => {
    // Nothing to lock when a PIN isn't configured; a stale "locked" server
    // state with no stored hash must not trap the user behind the lock screen.
    if (!enabledRef.current) return;
    unlockSession.active = false;
    setPhase("locked");
    // Best effort: the server is the authority for the locked state. Even if
    // this request never lands, data APIs stay gated by the server-side state.
    fetch("/api/security/lock", { method: "POST", keepalive: true }).catch(() => undefined);
    // Tell other open tabs to re-check the server lock state immediately.
    notifyNumbersChanged();
  }, []);

  const refreshLock = useCallback(async () => {
    const res = await fetch("/api/auth/me").catch(() => null);
    if (!res) return;
    if (res.status === 401) {
      setPhase("guest");
      return;
    }
    if (res.status === 403) {
      setPhase("forgot");
      return;
    }
    const data = (await res.json().catch(() => null)) as MeResponse | null;
    if (!data?.user) return;
    setMe(data);
    enabledRef.current = Boolean(data.lock?.enabled);
    emailRef.current = data.user.email;
    userIdRef.current = data.user.id;
  }, []);

  const applyServerState = useCallback(async () => {
    const res = await fetch("/api/auth/me").catch(() => null);
    if (!res) return;
    if (res.status === 401) {
      setPhase("guest");
      return;
    }
    if (res.status === 403) {
      setPhase("forgot");
      return;
    }
    const data = (await res.json().catch(() => null)) as MeResponse | null;
    if (!data?.user) return;
    setMe(data);
    enabledRef.current = Boolean(data.lock?.enabled);
    emailRef.current = data.user.email;
    userIdRef.current = data.user.id;
    // Only lock when a PIN is configured; otherwise a stale flag must not trap the user.
    if (data.lock?.enabled && data.lock?.state === "locked") setPhase("locked");
  }, []);

  // Authenticate + decide the initial lock state. A fresh page load always
  // locks when a PIN is configured (refresh / direct URL / new tab cannot
  // bypass), except for the navigation right after a successful login.
  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetch("/api/auth/me");
      if (!alive) return;

      if (res.status === 401) {
        setPhase("guest");
        return;
      }

      if (res.status === 403) {
        // The account is in the "forgot" recovery state.
        setPhase("forgot");
        return;
      }

      const data = (await res.json().catch(() => null)) as MeResponse | null;
      if (!alive) return;
      if (!data?.user) {
        setPhase("guest");
        return;
      }

      if (requireAdmin && !data.user.isAdmin) {
        router.replace("/numbers");
        return;
      }

      setMe(data);
      enabledRef.current = Boolean(data.lock?.enabled);
      emailRef.current = data.user.email;
      userIdRef.current = data.user.id;

      const justLoggedIn = sp.get("fresh") === "1";
      if (justLoggedIn) {
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete("fresh");
          window.history.replaceState(null, "", url.toString());
        } catch {
          /* ignore */
        }
      }

      if (data.lock?.enabled && data.lock?.state === "locked") {
        setPhase("locked");
        return;
      }
      const alreadyUnlocked =
        (unlockSession.userId === data.user.id && unlockSession.active) || justLoggedIn;
      if (data.lock?.enabled && !alreadyUnlocked) {
        unlockSession = { userId: data.user.id, active: false };
        setPhase("locked");
        return;
      }
      unlockSession = { userId: data.user.id, active: true };
      setPhase("unlocked");
    })();

    return () => {
      alive = false;
    };
  }, [requireAdmin, router, sp]);

  // React to lock/unlock done in another tab or a 401/423 from a data API:
// re-read the server state and show the correct gate.
  useEffect(() => {
    const onLockCheck = () => void applyServerState();
    window.addEventListener("ci:lock-check", onLockCheck);
    const unsubscribe = onNumbersChanged(onLockCheck);
    return () => {
      window.removeEventListener("ci:lock-check", onLockCheck);
      unsubscribe();
    };
  }, [applyServerState]);

  // Redirect uncertain phases to the right page. On lockout, also wipe the
  // plaintext number cache so the next session can't hydrate stale data.
  useEffect(() => {
    if (phase === "guest") {
      clearCache();
      router.replace("/login");
    } else if (phase === "forgot") {
      clearCache();
      const url = new URL("/recover", window.location.origin);
      if (emailRef.current) url.searchParams.set("email", emailRef.current);
      router.replace(`${url.pathname}?${url.searchParams.toString()}`);
    }
  }, [phase, router]);

  // Lifecycle + inactivity lock, only active while unlocked and a PIN is set.
  useEffect(() => {
    if (phase !== "unlocked" || !enabledRef.current) return;

    const resetInactivity = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(lockNow, INACTIVITY_LOCK_MS);
    };

    const onVisibility = () => {
      if (document.hidden) lockNow();
      else void applyServerState();
    };
    const onPageHide = () => lockNow();
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) void applyServerState();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("pointerdown", resetInactivity, { passive: true });
    window.addEventListener("keydown", resetInactivity);
    window.addEventListener("scroll", resetInactivity, { passive: true });
    resetInactivity();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("pointerdown", resetInactivity);
      window.removeEventListener("keydown", resetInactivity);
      window.removeEventListener("scroll", resetInactivity);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, lockNow, applyServerState]);

  const handleUnlock = useCallback(
    async (pinValue: string): Promise<UnlockResult | null> => {
      const res = await fetch("/api/security/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinValue }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (res.ok) {
        unlockSession = { userId: userIdRef.current, active: true };
        setPhase("unlocked");
        return null;
      }

      if (data.code === "forgot") {
        clearCache();
        const url = new URL("/recover", window.location.origin);
        if (emailRef.current) url.searchParams.set("email", emailRef.current);
        window.location.assign(url.toString());
        return { error: "Account requires recovery", forgot: true };
      }

      if (res.status === 429) {
        return {
          error: (data.error as string) ?? "Too many attempts",
          retryAfterSeconds: (data.retryAfterSeconds as number) ?? 30,
          attemptsLeft: (data.attemptsLeft as number) ?? 0,
        };
      }

      return {
        error: (data.error as string) ?? "Incorrect PIN",
        attemptsLeft: data.attemptsLeft as number | undefined,
      };
    },
    []
  );

  if (phase === "checking" || phase === "guest" || phase === "forgot" || !me) {
    return <Splash />;
  }

  if (phase === "locked") {
    return <ScreenLock onUnlock={handleUnlock} />;
  }

  return (
    <ProtectedContext.Provider
      value={{
        user: me.user,
        lockEnabled: Boolean(me.lock.enabled),
        lockNow,
        refreshLock,
      }}
    >
      {children}
    </ProtectedContext.Provider>
  );
}

export function ProtectedApp(props: ProtectedAppProps) {
  return (
    <Suspense fallback={<Splash />}>
      <ProtectedCore {...props} />
    </Suspense>
  );
}