import type { NumberFilters, SortField } from "@/types/number";

const SORTABLE: Record<SortField, string> = {
  updatedAt: "_updatedAt",
  createdAt: "_createdAt",
  name: "name",
  phoneNumber: "normalizedPhoneNumber",
  callStatus: "callStatus",
};

export function buildWhereClause(
  filters: NumberFilters,
  userId: string
): { query: string; params: Record<string, unknown> } {
  const parts: string[] = ['_type == "mobileNumber" && userId == $userId'];
  const params: Record<string, unknown> = { userId };

  if (filters.status.length > 0) {
    parts.push("callStatus in $status");
    params.status = filters.status;
  }

  const search = filters.search.trim();
  if (search) {
    parts.push(
      "name match $s || place match $s || lastResponse match $s || includedIn match $s"
    );
    params.s = `*${search}*`;
    const digits = search.replace(/[^0-9]/g, "");
    if (digits) {
      parts.push("normalizedPhoneNumber match $d");
      params.d = `*${digits}*`;
    }
  }

  if (filters.place) {
    parts.push("place == $place");
    params.place = filters.place;
  }

  if (filters.includedIn) {
    parts.push("includedIn == $includedIn");
    params.includedIn = filters.includedIn;
  }

  return { query: parts.join(" && "), params };
}

export function buildOrder(filters: NumberFilters): string {
  const dir = filters.sortDir === "asc" ? "asc" : "desc";
  const field = SORTABLE[filters.sort];
  return `order(${field} ${dir})`;
}

export const NUMBER_FIELDS = `
  _id,
  phoneNumber,
  normalizedPhoneNumber,
  name,
  place,
  includedIn,
  callStatus,
  lastResponse,
  lastContactedAt,
  createdAt,
  updatedAt,
`;