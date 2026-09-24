export type CallStatus = "accepted" | "not_accepted" | "declined" | "unknown";

export interface MobileNumber {
  _id: string;
  phoneNumber: string;
  normalizedPhoneNumber: string;
  name?: string;
  place?: string;
  includedIn?: string;
  callStatus: CallStatus;
  lastResponse?: string;
  lastContactedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NumberStats {
  total: number;
  accepted: number;
  notAccepted: number;
  declined: number;
  unknown: number;
}

export type SortField = "updatedAt" | "createdAt" | "name" | "phoneNumber" | "callStatus";
export type SortDirection = "asc" | "desc";

export interface NumberFilters {
  status: CallStatus[];
  search: string;
  place: string;
  includedIn: string;
  sort: SortField;
  sortDir: SortDirection;
}