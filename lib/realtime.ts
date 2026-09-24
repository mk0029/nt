"use client";

import type { MobileNumber, NumberStats } from "@/types/number";

export interface Facets {
  places: string[];
  includedIn: string[];
}

export interface LocalCache {
  userId: string;
  records: MobileNumber[];
  total: number;
  stats: NumberStats;
  facets: Facets;
  ts: number;
}

const CACHE_PREFIX = "ci:cache:";
const NUDGE_KEY = "ci:rt";

function cacheKey(userId: string): string {
  return `${CACHE_PREFIX}${userId}`;
}

export function readCache(userId: string): LocalCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalCache;
    if (parsed.userId !== userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCache(userId: string, patch: Partial<Omit<LocalCache, "userId" | "ts">>) {
  if (typeof window === "undefined") return;
  try {
    const prev = readCache(userId) ?? { userId, records: [], total: 0, stats: { total: 0, accepted: 0, notAccepted: 0, declined: 0, unknown: 0 }, facets: { places: [], includedIn: [] } };
    localStorage.setItem(cacheKey(userId), JSON.stringify({ ...prev, ...patch, ts: Date.now() }));
  } catch {
    // cache is best-effort; quota/failure must not break the app
  }
}

export function clearCache(userId?: string) {
  if (typeof window === "undefined") return;
  try {
    if (userId) {
      localStorage.removeItem(cacheKey(userId));
      return;
    }
    const prefixRe = new RegExp(`^${CACHE_PREFIX}`);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && prefixRe.test(key)) localStorage.removeItem(key);
    }
  } catch {
    // best-effort
  }
}

type RealtimeHandler = () => void;

// Cross-tab updates via localStorage `storage` events only. Those fire in
// *other* tabs, never the writer, so the tab that made the change keeps its
// optimistic in-place state (no jump, no flicker) while other tabs refresh.
export function onNumbersChanged(handler: RealtimeHandler): () => void {
  if (typeof window === "undefined") return () => {};
  const handleStorage = (e: StorageEvent) => {
    if (e.key === NUDGE_KEY) handler();
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener("storage", handleStorage);
  };
}

export function notifyNumbersChanged() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NUDGE_KEY, String(Date.now()));
  } catch {
    // best-effort
  }
}