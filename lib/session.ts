import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { sanityClientRead, sanityClientWrite } from "@/sanity/client";
import {
  getSessionToken,
  signSession,
  verifySessionToken,
  MAX_AGE_SECONDS,
  type SessionPayload,
} from "@/lib/auth";

interface SessionDoc {
  _id: string;
  userId: string;
  jti: string;
  valid: boolean;
  expiresAt: string;
}

export async function createSession(
  request: NextRequest,
  userId: string,
  email: string
): Promise<string> {
  const jti = randomUUID();
  const now = Date.now();
  const expiresAt = new Date(now + MAX_AGE_SECONDS * 1000).toISOString();

  await sanityClientWrite!.create({
    _type: "session",
    userId,
    jti,
    expiresAt,
    createdAt: new Date(now).toISOString(),
    valid: true,
    userAgent: request.headers.get("user-agent") ?? "",
  });

  return signSession({ sub: userId, email, jti });
}

export async function invalidateSession(jti: string): Promise<void> {
  if (!sanityClientWrite || !jti) return;
  await sanityClientWrite
    .delete({ query: `*[_type == "session" && jti == $jti]`, params: { jti } })
    .catch(() => undefined);
}

export async function invalidateAllUserSessions(userId: string): Promise<void> {
  if (!sanityClientWrite) return;
  await sanityClientWrite
    .delete({
      query: `*[_type == "session" && userId == $userId]`,
      params: { userId },
    })
    .catch(() => undefined);
}

/**
 * Full server-side session validation: JWT signature/expiry AND a live session
 * document. A valid JWT alone is never sufficient.
 */
export async function getSession(request: NextRequest): Promise<SessionPayload | null> {
  const token = getSessionToken(request);
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload || !payload.jti) return null;

  const session = await sanityClientRead
    .fetch<SessionDoc | null>(
      `*[_type == "session" && jti == $jti][0] { _id, userId, jti, valid, expiresAt }`,
      { jti: payload.jti }
    )
    .catch(() => null);

  if (!session || session.valid !== true) return null;
  if (session.expiresAt && new Date(session.expiresAt).getTime() <= Date.now()) return null;
  if (session.userId !== payload.sub) return null;

  return payload;
}