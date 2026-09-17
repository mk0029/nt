export type SecurityState = "active" | "locked" | "forgot";

export interface LockInfo {
  enabled: boolean;
  state: SecurityState;
}

export interface MeUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

export interface MeResponse {
  user: MeUser;
  lock: LockInfo;
}