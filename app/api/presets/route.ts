import { NextRequest, NextResponse } from "next/server";
import { sanityClientRead, sanityClientWrite } from "@/sanity/client";
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
    const presets = await sanityClientRead.fetch<{ _id: string; text: string }[]>(
      `*[_type == "responsePreset" && userId == $userId] | order(_createdAt asc) { _id, text }`,
      { userId: auth.session.sub }
    );
    return NextResponse.json({ presets: presets ?? [] });
  } catch (error) {
    console.error("[GET /api/presets]", error);
    return NextResponse.json(
      { error: "Failed to fetch presets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "Response is required" }, { status: 400 });
    }
    if (text.length > 200) {
      return NextResponse.json({ error: "Response is too long" }, { status: 400 });
    }

    const created = await sanityClientWrite.create({
      _type: "responsePreset",
      userId: auth.session.sub,
      text,
    });

    return NextResponse.json({ preset: { _id: created._id, text } }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/presets]", error);
    return NextResponse.json(
      { error: "Failed to save preset" },
      { status: 500 }
    );
  }
}