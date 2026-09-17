import { createHash, randomBytes } from "crypto";
import { sanityClientRead, sanityClientWrite } from "@/sanity/client";

export const RECOVERY_OTP_TTL_MS =
  (parseInt(process.env.RECOVERY_OTP_TTL_MINUTES ?? "30", 10) || 30) * 60 * 1000;
export const RECOVERY_OTP_MAX_ATTEMPTS = parseInt(
  process.env.RECOVERY_OTP_MAX_ATTEMPTS ?? "5",
  10
) || 5;

const CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_LENGTH = 8;

interface RecoveryCodeDoc {
  _id: string;
  userId: string;
  codeHash: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
  usedAt: string | null;
  attempts: number;
  generatedBy: string | null;
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function generateRecoveryCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CHARS[bytes[i] % CHARS.length];
  }
  return out;
}

/** Creates a fresh, single-use recovery code for a user. Returns the plaintext code exactly once. */
export async function createRecoveryCode(
  userId: string,
  generatedBy: string | null
): Promise<{ code: string; expiresAt: string }> {
  const code = generateRecoveryCode();
  const now = Date.now();

  await sanityClientWrite!.create({
    _type: "recoveryCode",
    userId,
    codeHash: hashRecoveryCode(code),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + RECOVERY_OTP_TTL_MS).toISOString(),
    used: false,
    usedAt: null,
    attempts: 0,
    generatedBy,
  });

  return { code, expiresAt: new Date(now + RECOVERY_OTP_TTL_MS).toISOString() };
}

export function isCodeExpired(code: RecoveryCodeDoc): boolean {
  return Boolean(code.expiresAt) && new Date(code.expiresAt).getTime() <= Date.now();
}

/**
 * Verifies an admin-generated recovery code for a forgot user. The code is
 * consumed on success; any failure consumes one attempt so brute force is
 * bounded server-side.
 */
export async function verifyRecoveryCode(
  userId: string,
  submittedCode: string
): Promise<{ ok: true } | { ok: false }> {
  const code = await sanityClientRead
    .fetch<RecoveryCodeDoc | null>(
      `*[_type == "recoveryCode" && userId == $userId] | order(_createdAt desc) [0] {
        _id, userId, codeHash, createdAt, expiresAt, used, usedAt, attempts, generatedBy
      }`,
      { userId }
    )
    .catch(() => null);

  if (!code || code.used || isCodeExpired(code) || code.attempts >= RECOVERY_OTP_MAX_ATTEMPTS) {
    return { ok: false };
  }

  const expected = hashRecoveryCode(submittedCode.trim().toUpperCase());
  const match = expected === code.codeHash;

  await sanityClientWrite?.patch(code._id).set({ attempts: code.attempts + 1 }).commit();

  if (!match) {
    if (code.attempts + 1 >= RECOVERY_OTP_MAX_ATTEMPTS) {
      // burn the code so no further guesses are possible against it
      await sanityClientWrite?.patch(code._id).set({ used: true, usedAt: new Date().toISOString() }).commit();
    }
    return { ok: false };
  }

  await sanityClientWrite?.patch(code._id).set({
    used: true,
    usedAt: new Date().toISOString(),
  }).commit();
  return { ok: true };
}