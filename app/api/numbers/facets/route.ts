import { NextRequest, NextResponse } from "next/server";
import { sanityClientRead } from "@/sanity/client";
import { requireActive } from "@/lib/security";

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
    const params = { userId: auth.session.sub };
    const [places, includedIn] = await Promise.all([
      sanityClientRead.fetch<string[]>(
        `array::unique(*[${where} && defined(place)].place) | order(@ asc)`,
        params
      ),
      sanityClientRead.fetch<string[]>(
        `array::unique(*[${where} && defined(includedIn)].includedIn) | order(@ asc)`,
        params
      ),
    ]);

    return NextResponse.json({
      places: places ?? [],
      includedIn: includedIn ?? [],
    });
  } catch (error) {
    console.error("[GET /api/numbers/facets]", error);
    return NextResponse.json(
      { error: "Failed to fetch facets" },
      { status: 500 }
    );
  }
}