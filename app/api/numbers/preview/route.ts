import { NextRequest, NextResponse } from "next/server";
import { sanityClientRead } from "@/sanity/client";
import { requireActive } from "@/lib/security";

export async function POST(request: NextRequest) {
  if (!sanityClientRead) {
    return NextResponse.json(
      { error: "Sanity is not configured" },
      { status: 503 }
    );
  }

  const auth = await requireActive(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const numbers = body?.numbers as string[] | undefined;

    if (!Array.isArray(numbers)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const normalized = numbers.map((n) => String(n).trim()).filter(Boolean);

    const existing = await sanityClientRead
      .fetch<string[]>(
        `*[_type == "mobileNumber" && userId == $userId].normalizedPhoneNumber`,
        { userId: auth.session.sub }
      )
      .catch(() => [] as string[]);

    const existingSet = new Set(existing);
    const duplicates = normalized.filter((n) => existingSet.has(n));

    return NextResponse.json({ duplicates });
  } catch (error) {
    console.error("[POST /api/numbers/preview]", error);
    return NextResponse.json(
      { error: "Failed to check duplicates" },
      { status: 500 }
    );
  }
}