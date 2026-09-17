import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sanityClientWrite } from "@/sanity/client";
import { requireUser, recordFailedAttempt } from "@/lib/security";
import { z } from "zod";

const unlockSchema = z.object({
  pin: z.string().min(1, "PIN is required"),
});

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  if (!sanityClientWrite) {
    return NextResponse.json({ error: "Security is not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = unlockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "PIN is required" }, { status: 400 });
  }
  const { pin } = parsed.data;

  const user = auth.user;

  if (!user.lockPinHash) {
    // No lock configured, nothing to verify — treat as already unlocked.
    return NextResponse.json({ state: "active" });
  }

  const cooldown = user.lockCooldownUntil
    ? new Date(user.lockCooldownUntil).getTime()
    : 0;
  const now = Date.now();

  if (cooldown > now) {
    return NextResponse.json(
      {
        error: "Too many attempts. Try again later.",
        retryAfterSeconds: Math.ceil((cooldown - now) / 1000),
        attemptsLeft: 0,
      },
      { status: 429 }
    );
  }

  const valid = await bcrypt.compare(pin, user.lockPinHash);

  if (!valid) {
    const result = await recordFailedAttempt(user);
    if (result.forgot) {
      // Sessions were invalidated server-side and the account moved to "forgot".
      // The client cannot prevent or defer this transition.
      const res = NextResponse.json(
        { error: "Too many failed attempts. Your account has been locked for recovery.", code: "forgot" },
        { status: 403 }
      );
      res.cookies.set({
        name: "session",
        value: "",
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        maxAge: 0,
      });
      return res;
    }
    return NextResponse.json(
      {
        error: "Incorrect PIN",
        attemptsLeft: result.attemptsLeft,
        retryAfterSeconds: result.retryAfterSeconds,
      },
      { status: 401 }
    );
  }

  await sanityClientWrite
    .patch(user._id)
    .set({
      securityState: "active",
      lockFailedAttempts: 0,
      lockCooldownUntil: null,
      lastUnlockedAt: new Date().toISOString(),
    })
    .commit();

  return NextResponse.json({ state: "active" });
}