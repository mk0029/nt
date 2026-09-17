import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sanityClientWrite, sanityClientRead } from "@/sanity/client";
import { sessionCookie } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(request: NextRequest) {
  if (!sanityClientWrite) {
    return NextResponse.json({ error: "Sanity is not configured" }, { status: 503 });
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const existing = await sanityClientRead.fetch<{ _id: string } | null>(
      `*[_type == "user" && email == $email][0] { _id }`,
      { email }
    );
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    const user = await sanityClientWrite.create({
      _type: "user",
      email,
      passwordHash,
      securityState: "active",
      lockFailedAttempts: 0,
      createdAt: now,
    });

    const token = await createSession(request, user._id, email);
    const res = NextResponse.json({ user: { id: user._id, email } });
    res.cookies.set(sessionCookie(token));
    return res;
  } catch (error) {
    console.error("[POST /api/auth/signup]", error);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}