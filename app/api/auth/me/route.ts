import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/security";
import { isAdminEmail } from "@/lib/security";
import type { MeResponse } from "@/types/security";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const { session, user } = auth;
  const body: MeResponse = {
    user: {
      id: session.sub,
      email: session.email,
      isAdmin: isAdminEmail(session.email),
    },
    lock: {
      enabled: Boolean(user.lockPinHash),
      state: user.securityState,
    },
  };
  return NextResponse.json(body);
}