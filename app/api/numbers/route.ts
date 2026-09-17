import { NextRequest, NextResponse } from "next/server";
import { sanityClientRead, sanityClientWrite } from "@/sanity/client";
import { requireActive } from "@/lib/security";
import {
  buildOrder,
  buildWhereClause,
  NUMBER_FIELDS,
} from "@/sanity/queries";
import type { MobileNumber, NumberFilters } from "@/types/number";

const MAX_PER_PAGE = 100;

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
    const sp = request.nextUrl.searchParams;
    const filters: NumberFilters = {
      status: (sp.get("status") as NumberFilters["status"]) || "all",
      search: sp.get("search") || "",
      place: sp.get("place") || "",
      includedIn: sp.get("includedIn") || "",
      sort: (sp.get("sort") as NumberFilters["sort"]) || "updatedAt",
      sortDir: sp.get("sortDir") === "asc" ? "asc" : "desc",
      page: Math.max(1, parseInt(sp.get("page") || "1", 10) || 1),
      perPage: Math.min(
        MAX_PER_PAGE,
        Math.max(1, parseInt(sp.get("perPage") || "50", 10) || 50)
      ),
    };

    const { query, params } = buildWhereClause(filters, auth.session.sub);
    const start = (filters.page - 1) * filters.perPage;

    const [records, total] = await Promise.all([
      sanityClientRead.fetch<MobileNumber[]>(
        `*[${query}] | ${buildOrder(filters)} [${start}...${start + filters.perPage}] { ${NUMBER_FIELDS} }`,
        params
      ),
      sanityClientRead.fetch<number>(`count(*[${query}])`, params),
    ]);

    return NextResponse.json({ records: records ?? [], total: total ?? 0 });
  } catch (error) {
    console.error("[GET /api/numbers]", error);
    return NextResponse.json(
      { error: "Failed to fetch numbers" },
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
    const numbers = body?.numbers as
      | { phoneNumber: string; normalizedPhoneNumber: string }[]
      | undefined;

    if (!Array.isArray(numbers) || numbers.length === 0) {
      return NextResponse.json({ error: "No numbers provided" }, { status: 400 });
    }

    const existing = await sanityClientRead.fetch<string[]>(
      `*[_type == "mobileNumber" && userId == $userId].normalizedPhoneNumber`,
      { userId: auth.session.sub }
    );
    const existingSet = new Set(existing);

    const now = new Date().toISOString();
    const toCreate = numbers.filter((n) => {
      const normalized = n.normalizedPhoneNumber;
      if (!normalized || existingSet.has(normalized)) return false;
      existingSet.add(normalized);
      return true;
    });

    if (toCreate.length > 0) {
      const tx = sanityClientWrite.transaction();
      for (const num of toCreate) {
        tx.create({
          _type: "mobileNumber",
          userId: auth.session.sub,
          phoneNumber: num.phoneNumber,
          normalizedPhoneNumber: num.normalizedPhoneNumber,
          callStatus: "unknown",
          createdAt: now,
          updatedAt: now,
        });
      }
      await tx.commit();
    }

    return NextResponse.json({
      imported: toCreate.length,
      duplicates: numbers.length - toCreate.length,
    });
  } catch (error) {
    console.error("[POST /api/numbers]", error);
    return NextResponse.json(
      { error: "Failed to import numbers" },
      { status: 500 }
    );
  }
}