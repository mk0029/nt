import { NextRequest, NextResponse } from "next/server";
import { sanityClientRead, sanityClientWrite } from "@/sanity/client";
import { sessionCookie } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { verifyRecoveryCode } from "@/lib/recovery";
import { z } from "zod";

const recoverSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  otp: z.string().trim().min(1, "Recovery code is required"),
});

export async function POST(request: NextRequest) {
  if (!sanityClientWrite) {
    return NextResponse.json({ error: "Authentication is not configured" }, { status: 503 });
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = recoverSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { email, otp } = parsed.data;

    const user = await sanityClientRead.fetch<{
      _id: string;
      email: string;
      securityState: string;
      lockPinHash: string | null;
    } | null>(
      `*[_type == "user" && email == $email][0] { _id, email, securityState, lockPinHash }`,
      { email }
    );

    // Only "forgot" accounts can use recovery.
    if (!user || user.securityState !== "forgot") {
      return NextResponse.json({ error: "Invalid or expired recovery code" }, { status: 401 });
    }

    const result = await verifyRecoveryCode(user._id, otp);
    if (!result.ok) {
      return NextResponse.json({ error: "Invalid or expired recovery code" }, { status: 401 });
    }

    await sanityClientWrite
      .patch(user._id)
      .set({
        securityState: "active",
        lockFailedAttempts: 0,
        lockCooldownUntil: null,
      })
      .commit();

    const token = await createSession(request, user._id, user.email);
    const res = NextResponse.json({
      user: { id: user._id, email },
      lock: { enabled: Boolean(user.lockPinHash), state: "active" },
    });
    res.cookies.set(sessionCookie(token));
    return res;
  } catch (error) {
    console.error("[POST /api/auth/recover]", error);
    return NextResponse.json({ error: "Recovery failed" }, { status: 500 });
  }
}