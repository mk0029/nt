import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sanityClientRead, sanityClientWrite } from "@/sanity/client";
import { sessionCookie, clearSessionCookie } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { forgotResponse } from "@/lib/security";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  if (!sanityClientWrite) {
    return NextResponse.json({ error: "Authentication is not configured" }, { status: 503 });
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const user = await sanityClientRead.fetch<{
      _id: string;
      email: string;
      passwordHash: string;
      securityState: string;
      lockPinHash: string | null;
    } | null>(
      `*[_type == "user" && email == $email][0] { _id, email, passwordHash, securityState, lockPinHash }`,
      { email }
    );

    const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // The server is the authority: a "forgot" account can never pass normal login.
    if (user.securityState === "forgot") {
      const res = forgotResponse();
      res.cookies.set(clearSessionCookie());
      return res;
    }

    const token = await createSession(request, user._id, user.email);
    const res = NextResponse.json({
      user: { id: user._id, email },
      lock: { enabled: Boolean(user.lockPinHash), state: user.securityState },
    });
    res.cookies.set(sessionCookie(token));
    return res;
  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}