import { NextRequest, NextResponse } from "next/server";
import { sanityClientRead } from "@/sanity/client";
import { requireActive } from "@/lib/security";
import type { NumberStats } from "@/types/number";

export async function GET(request: NextRequest) {
  if (!sanityClientRead) {
    return NextResponse.json(
      { error: "Sanity is not configured" },
      { status: 503 }
    );
  }

  const auth = await requireActive(request);
  if (!auth.ok) return auth.response;

  try {
    const where = `_type == "mobileNumber" && userId == $userId`;
    const stats = await sanityClientRead.fetch<NumberStats>(
      `{
        "total": count(*[${where}]),
        "accepted": count(*[${where} && callStatus == "accepted"]),
        "notAccepted": count(*[${where} && callStatus == "not_accepted"]),
        "unknown": count(*[${where} && callStatus == "unknown"])
      }`,
      { userId: auth.session.sub }
    );
    return NextResponse.json(stats);
  } catch (error) {
    console.error("[GET /api/numbers/stats]", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}