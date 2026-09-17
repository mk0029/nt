export type CallStatus = "accepted" | "not_accepted" | "unknown";

export interface MobileNumber {
  _id: string;
  phoneNumber: string;
  normalizedPhoneNumber: string;
  name?: string;
  place?: string;
  includedIn?: string;
  callStatus: CallStatus;
  lastResponse?: string;
  notes?: string;
  lastContactedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NumberStats {
  total: number;
  accepted: number;
  notAccepted: number;
  unknown: number;
}

export type SortField = "updatedAt" | "createdAt" | "name" | "phoneNumber" | "callStatus";
export type SortDirection = "asc" | "desc";

export interface NumberFilters {
  status: CallStatus | "all";
  search: string;
  place: string;
  includedIn: string;
  sort: SortField;
  sortDir: SortDirection;
  page: number;
  perPage: number;
}