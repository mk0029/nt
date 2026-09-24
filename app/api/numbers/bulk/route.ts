import { NextRequest, NextResponse } from "next/server";
import { sanityClientRead, sanityClientWrite } from "@/sanity/client";
import { requireActive } from "@/lib/security";
import type { CallStatus } from "@/types/number";

const VALID_STATUSES = new Set<CallStatus>(["accepted", "not_accepted", "declined", "unknown"]);
const CHUNK_SIZE = 500;

function isValidStatus(value: unknown): value is CallStatus {
  return typeof value === "string" && VALID_STATUSES.has(value as CallStatus);
}

async function ownedIds(ids: string[], userId: string): Promise<string[]> {
  const owned = await sanityClientRead.fetch<{ _id: string }[]>(
    `*[_type == "mobileNumber" && _id in $ids && userId == $userId] { _id }`,
    { ids, userId }
  );
  return (owned ?? []).map((r) => r._id);
}

export async function PATCH(request: NextRequest) {
  if (!sanityClientWrite) {
    return NextResponse.json(
      { error: "Sanity is not configured" },
      { status: 503 }
    );
  }

  const auth = await requireActive(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const ids = body?.ids as string[] | undefined;
    const callStatus = body?.callStatus;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }
    if (!isValidStatus(callStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const allowed = await ownedIds(ids, auth.session.sub);
    if (allowed.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    let updated = 0;

    for (let i = 0; i < allowed.length; i += CHUNK_SIZE) {
      const chunk = allowed.slice(i, i + CHUNK_SIZE);
      const tx = sanityClientWrite.transaction();
      for (const id of chunk) {
        tx.patch(id, (patch) => patch.set({ callStatus, updatedAt: now }));
      }
      await tx.commit();
      updated += chunk.length;
    }

    return NextResponse.json({ updated });
  } catch (error) {
    console.error("[PATCH /api/numbers/bulk]", error);
    return NextResponse.json(
      { error: "Failed to update numbers" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!sanityClientWrite) {
    return NextResponse.json(
      { error: "Sanity is not configured" },
      { status: 503 }
    );
  }

  const auth = await requireActive(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const ids = body?.ids as string[] | undefined;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }

    const allowed = await ownedIds(ids, auth.session.sub);
    if (allowed.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let deleted = 0;

    for (let i = 0; i < allowed.length; i += CHUNK_SIZE) {
      const chunk = allowed.slice(i, i + CHUNK_SIZE);
      const tx = sanityClientWrite.transaction();
      for (const id of chunk) {
        tx.delete(id);
      }
      await tx.commit();
      deleted += chunk.length;
    }

    return NextResponse.json({ deleted });
  } catch (error) {
    console.error("[DELETE /api/numbers/bulk]", error);
    return NextResponse.json(
      { error: "Failed to delete numbers" },
      { status: 500 }
    );
  }
}