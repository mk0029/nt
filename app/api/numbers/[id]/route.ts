import { NextRequest, NextResponse } from "next/server";
import { sanityClientRead, sanityClientWrite } from "@/sanity/client";
import { requireActive } from "@/lib/security";
import type { CallStatus } from "@/types/number";

const VALID_STATUSES = new Set<CallStatus>(["accepted", "not_accepted", "declined", "unknown"]);

function toCallStatus(value: unknown): CallStatus {
  if (typeof value === "string" && VALID_STATUSES.has(value as CallStatus)) {
    return value as CallStatus;
  }
  throw new Error(`Invalid callStatus: ${String(value)}`);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!sanityClientWrite) {
    return NextResponse.json(
      { error: "Sanity is not configured" },
      { status: 503 }
    );
  }

  const auth = await requireActive(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const owned = await sanityClientRead.fetch<{ _id: string } | null>(
      `*[_type == "mobileNumber" && _id == $id && userId == $userId][0] { _id }`,
      { id, userId: auth.session.sub }
    );
    if (!owned) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();

    const patch: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (body.callStatus !== undefined) {
      patch.callStatus = toCallStatus(body.callStatus);
    }
    if (body.name !== undefined) patch.name = body.name || undefined;
    if (body.place !== undefined) patch.place = body.place || undefined;
    if (body.includedIn !== undefined)
      patch.includedIn = body.includedIn || undefined;
    if (body.lastResponse !== undefined)
      patch.lastResponse = body.lastResponse || undefined;
    if (body.lastContactedAt !== undefined)
      patch.lastContactedAt = body.lastContactedAt || undefined;

    const updated = await sanityClientWrite
      .patch(id)
      .set(patch)
      .commit({ returnFirst: true });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/numbers/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update number" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!sanityClientWrite) {
    return NextResponse.json(
      { error: "Sanity is not configured" },
      { status: 503 }
    );
  }

  const auth = await requireActive(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const owned = await sanityClientRead.fetch<{ _id: string } | null>(
      `*[_type == "mobileNumber" && _id == $id && userId == $userId][0] { _id }`,
      { id, userId: auth.session.sub }
    );
    if (!owned) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await sanityClientWrite.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/numbers/[id]]", error);
    return NextResponse.json(
      { error: "Failed to delete number" },
      { status: 500 }
    );
  }
}