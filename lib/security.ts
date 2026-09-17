import { NextRequest, NextResponse } from "next/server";
import { sanityClientRead, sanityClientWrite } from "@/sanity/client";
import { getSession } from "@/lib/session";
import { clearSessionCookie } from "@/lib/auth";
import { invalidateAllUserSessions } from "@/lib/session";
import type { SessionPayload } from "@/lib/auth";
import type { SecurityState } from "@/types/security";

export const MAX_FAILED_ATTEMPTS = parseInt(
  process.env.SCREEN_LOCK_MAX_ATTEMPTS ?? "5",
  10
) || 5;
export const COOLDOWN_BASE_MS = 15_000;
export const COOLDOWN_CAP_MS = 300_000;

export interface UserSecurityDoc {
  _id: string;
  email: string;
  securityState: SecurityState;
  lockPinHash: string | null;
  lockFailedAttempts: number;
  lockLastFailedAt: string | null;
  lockCooldownUntil: string | null;
  lastUnlockedAt: string | null;
  lastLockedAt: string | null;
}

export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return admins.some((a) => a.toLowerCase() === email.toLowerCase());
}

export function cooldownForAttempt(attemptNumber: number): number {
  const backoff = COOLDOWN_BASE_MS * 2 ** (attemptNumber - 1);
  return Math.min(COOLDOWN_CAP_MS, backoff);
}

export async function fetchUserSecurity(userId: string): Promise<UserSecurityDoc | null> {
  return sanityClientRead
    .fetch<UserSecurityDoc | null>(
      `*[_type == "user" && _id == $userId][0] {
        _id, email, securityState, lockPinHash,
        lockFailedAttempts, lockLastFailedAt, lockCooldownUntil,
        lastUnlockedAt, lastLockedAt
      }`,
      { userId }
    )
    .catch(() => null);
}

export type AuthResult =
  | { ok: true; session: SessionPayload; user: UserSecurityDoc }
  | { ok: false; response: NextResponse };

function unauthorized(withCookieClear = false) {
  const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (withCookieClear) res.cookies.set(clearSessionCookie());
  return res;
}

/**
 * Requires a valid server-side session AND an account that is not stuck in the
 * "forgot" recovery state. Does NOT require the screen lock to be open — used
 * by the security endpoints (lock/unlock/pin) and /api/auth/me.
 */
export async function requireUser(request: NextRequest): Promise<AuthResult> {
  const session = await getSession(request);
  if (!session) return { ok: false, response: unauthorized() };

  const user = await fetchUserSecurity(session.sub);
  if (!user) return { ok: false, response: unauthorized(true) };

  if (user.securityState === "forgot") {
    const res = NextResponse.json({ error: "Account requires recovery", code: "forgot" }, { status: 403 });
    res.cookies.set(clearSessionCookie());
    return { ok: false, response: res };
  }

  return { ok: true, session, user };
}

/**
 * Full gate for protected data APIs: session + account existence + security
 * state + authorization. The screen lock state is enforced server-side here,
 * so an unlocked-looking client means nothing.
 */
export async function requireActive(request: NextRequest): Promise<AuthResult> {
  const base = await requireUser(request);
  if (!base.ok) return base;

  const { user } = base;
  // A "locked" flag without a stored PIN is stale/meaningless (e.g. lock was
  // disabled); treat it as active so data stays available.
  if (user.lockPinHash && user.securityState === "locked") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Screen locked", code: "locked" },
        { status: 423 }
      ),
    };
  }

  return base;
}

export async function requireAdmin(request: NextRequest): Promise<AuthResult> {
  const base = await requireUser(request);
  if (!base.ok) return base;
  if (!isAdminEmail(base.user.email)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return base;
}

/**
 * Records a failed screen-lock attempt. Returns the new attempt state, or
 * marks the account "forgot" (and invalidates every session) once the maximum
 * number of attempts is reached. Detection of "forgot" can never be delayed by
 * the client — the transition happens server-side on this call.
 */
export async function recordFailedAttempt(user: UserSecurityDoc) {
  const newAttempts = (user.lockFailedAttempts || 0) + 1;
  const now = new Date().toISOString();

  if (newAttempts >= MAX_FAILED_ATTEMPTS) {
    await markForgot(user._id);
    return { forgot: true, attemptsLeft: 0 };
  }

  const cooldownMs = cooldownForAttempt(newAttempts);
  const cooldownUntil = new Date(Date.now() + cooldownMs).toISOString();

  await sanityClientWrite?.patch(user._id).set({
    lockFailedAttempts: newAttempts,
    lockLastFailedAt: now,
    lockCooldownUntil: cooldownUntil,
  }).commit();

  return {
    forgot: false,
    attemptsLeft: MAX_FAILED_ATTEMPTS - newAttempts,
    retryAfterSeconds: Math.ceil(cooldownMs / 1000),
  };
}

export async function markForgot(userId: string): Promise<void> {
  if (!sanityClientWrite) return;
  await sanityClientWrite
    .patch(userId)
    .set({
      securityState: "forgot",
      lockFailedAttempts: 0,
      lockCooldownUntil: null,
    })
    .commit();
  await invalidateAllUserSessions(userId);
}

export function forgotResponse() {
  const res = NextResponse.json(
    { error: "Account requires recovery", code: "forgot" },
    { status: 403 }
  );
  res.cookies.set(clearSessionCookie());
  return res;
}