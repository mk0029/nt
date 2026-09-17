import { NextRequest, NextResponse } from "next/server";
import { sanityClientWrite } from "@/sanity/client";
import { requireUser } from "@/lib/security";

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  // Without a stored PIN there is nothing to screen-lock with; don't record a
  // locked state that would later trap the user behind the lock screen.
  if (!auth.user.lockPinHash) {
    return NextResponse.json({ state: "active" });
  }

  if (!sanityClientWrite) {
    return NextResponse.json({ error: "Security is not configured" }, { status: 503 });
  }

  await sanityClientWrite
    .patch(auth.user._id)
    .set({ securityState: "locked", lastLockedAt: new Date().toISOString() })
    .commit()
    .catch(() => undefined);

  return NextResponse.json({ state: "locked" });
}