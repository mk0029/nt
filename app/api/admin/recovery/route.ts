import { NextRequest, NextResponse } from "next/server";
import { sanityClientRead, sanityClientWrite } from "@/sanity/client";
import { requireAdmin } from "@/lib/security";
import { createRecoveryCode } from "@/lib/recovery";
import { z } from "zod";

const generateSchema = z.object({
  userId: z.string().min(1, "userId is required"),
});

interface ForgotUser {
  _id: string;
  email: string;
  lockLastFailedAt: string | null;
  createdAt: string | null;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const users = await sanityClientRead
    .fetch<ForgotUser[]>(
      `*[_type == "user" && securityState == "forgot"] | order(_createdAt asc) {
        _id, email, lockLastFailedAt, createdAt
      }`
    )
    .catch(() => [] as ForgotUser[]);

  return NextResponse.json({ users: users ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  if (!sanityClientWrite) {
    return NextResponse.json({ error: "Sanity is not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const user = await sanityClientRead.fetch<{ _id: string; email: string; securityState: string } | null>(
    `*[_type == "user" && _id == $id][0] { _id, email, securityState }`,
    { id: parsed.data.userId }
  );

  if (!user || user.securityState !== "forgot") {
    return NextResponse.json({ error: "Only forgot accounts can receive a recovery code" }, { status: 400 });
  }

  const { code, expiresAt } = await createRecoveryCode(
    user._id,
    `${auth.session.email} (admin)`
  );

  // The plaintext code is returned exactly once, to the authenticated admin.
  return NextResponse.json({ userId: user._id, email: user.email, code, expiresAt });
}