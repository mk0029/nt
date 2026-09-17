import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, getSessionToken, verifySessionToken } from "@/lib/auth";
import { invalidateSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const token = getSessionToken(request);
  if (token) {
    const payload = await verifySessionToken(token);
    if (payload?.jti) await invalidateSession(payload.jti);
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(clearSessionCookie());
  return res;
}