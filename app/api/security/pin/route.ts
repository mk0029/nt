import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sanityClientWrite } from "@/sanity/client";
import { requireUser, recordFailedAttempt } from "@/lib/security";
import { z } from "zod";

const setPinSchema = z.object({
  pin: z.string().min(4, "PIN must be at least 4 characters").max(128),
  currentPin: z.string().optional(),
});

const removePinSchema = z.object({
  currentPin: z.string().min(1, "Current PIN is required"),
});

export async function PUT(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  if (!sanityClientWrite) {
    return NextResponse.json({ error: "Security is not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = setPinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid PIN" },
      { status: 400 }
    );
  }
  const { pin, currentPin } = parsed.data;

  const user = auth.user;

  // Changing/removing an existing PIN requires the current PIN as proof.
  if (user.lockPinHash) {
    const currentValid = await bcrypt.compare(currentPin ?? "", user.lockPinHash);
    if (!currentValid) {
      const result = await recordFailedAttempt(user);
      if (result.forgot) {
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
        { error: "Incorrect current PIN", attemptsLeft: result.attemptsLeft, retryAfterSeconds: result.retryAfterSeconds },
        { status: 401 }
      );
    }
  }

  await sanityClientWrite
    .patch(user._id)
    .set({
      lockPinHash: await bcrypt.hash(pin, 10),
      securityState: "active",
      lockFailedAttempts: 0,
      lockCooldownUntil: null,
    })
    .commit();

  return NextResponse.json({ configured: true });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  if (!sanityClientWrite) {
    return NextResponse.json({ error: "Security is not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = removePinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Current PIN is required" }, { status: 400 });
  }

  const user = auth.user;
  const valid = await bcrypt.compare(parsed.data.currentPin, user.lockPinHash ?? "");
  if (!valid) {
    const result = await recordFailedAttempt(user);
    if (result.forgot) {
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
      { error: "Incorrect current PIN", attemptsLeft: result.attemptsLeft, retryAfterSeconds: result.retryAfterSeconds },
      { status: 401 }
    );
  }

  await sanityClientWrite
    .patch(user._id)
    .set({
      lockPinHash: "",
      securityState: "active",
      lockFailedAttempts: 0,
      lockCooldownUntil: null,
    })
    .commit();

  return NextResponse.json({ configured: false });
}