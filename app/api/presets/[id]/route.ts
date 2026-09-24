import { NextRequest, NextResponse } from "next/server";
import { sanityClientRead, sanityClientWrite } from "@/sanity/client";
import { requireActive } from "@/lib/security";

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
      `*[_type == "responsePreset" && _id == $id && userId == $userId][0] { _id }`,
      { id, userId: auth.session.sub }
    );
    if (!owned) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await sanityClientWrite.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/presets/[id]]", error);
    return NextResponse.json(
      { error: "Failed to delete preset" },
      { status: 500 }
    );
  }
}