"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MobileNumber, NumberStats, NumberFilters, CallStatus } from "@/types/number";
import { readCache, writeCache, onNumbersChanged, notifyNumbersChanged, type Facets } from "@/lib/realtime";

const EMPTY_STATS: NumberStats = { total: 0, accepted: 0, notAccepted: 0, declined: 0, unknown: 0 };
const POLL_MS = 20_000;

async function assertOk(res: Response): Promise<void> {
  if (res.ok) return;
  // 401/423 mean the session or lock state changed server-side. Signal
  // ProtectedApp to re-check and show the right gate (login / lock screen).
  // Still throw so the immediate caller doesn't act on stale data.
  if (res.status === 401 || res.status === 423) {
    window.dispatchEvent(new Event("ci:lock-check"));
  }
  let detail = "";
  try {
    const body = await res.json();
    detail = body?.error ?? body?.code ?? "";
  } catch {
    /* non-JSON body */
  }
  throw new Error(`HTTP ${res.status}${detail ? ` ${detail}` : ""}`);
}

export function useNumbers() {
  const [userId, setUserId] = useState<string | null>(null);
  const [records, setRecords] = useState<MobileNumber[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<NumberStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [facets, setFacets] = useState<Facets>({ places: [], includedIn: [] });
  const [filters, setFilters] = useState<NumberFilters>({
    status: [],
    search: "",
    place: "",
    includedIn: "",
    sort: "updatedAt",
    sortDir: "desc",
  });
  const abortRef = useRef<AbortController | null>(null);
  const latestRef = useRef<AbortController | null>(null);

  // ponytail: cache is non-authoritative UX speed, never the security source.
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return;
        const { user } = await res.json();
        if (!user?.id) return;
        setUserId(user.id);
        const cache = readCache(user.id);
        if (!cache) return;
        setRecords(cache.records);
        setTotal(cache.total);
        if (cache.stats.total) setStats(cache.stats);
        if (cache.facets.places.length || cache.facets.includedIn.length) setFacets(cache.facets);
      } catch {
        // cache hydration is non-critical
      }
    };
    void init();
  }, []);

  const fetchFacets = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/numbers/facets", { signal });
      await assertOk(res);
      const data = await res.json();
      setFacets(data);
      if (userId) writeCache(userId, { facets: data });
    } catch {
      // facets are non-critical, silent fail
    }
  }, [userId]);

  const fetchStats = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/numbers/stats", { signal });
      await assertOk(res);
      const data = await res.json();
      setStats(data);
      if (userId) writeCache(userId, { stats: data });
    } catch {
      // stats are non-critical, silent fail
    } finally {
      setStatsLoading(false);
    }
  }, [userId]);

  const fetchNumbers = useCallback(async (filtersToFetch: NumberFilters, signal?: AbortSignal) => {
    const sp = new URLSearchParams();
    filtersToFetch.status.forEach((s) => sp.append("status", s));
    if (filtersToFetch.search) sp.set("search", filtersToFetch.search);
    if (filtersToFetch.place) sp.set("place", filtersToFetch.place);
    if (filtersToFetch.includedIn) sp.set("includedIn", filtersToFetch.includedIn);
    if (filtersToFetch.sort) sp.set("sort", filtersToFetch.sort);
    if (filtersToFetch.sortDir) sp.set("sortDir", filtersToFetch.sortDir);

    try {
      const res = await fetch(`/api/numbers?${sp.toString()}`, { signal });
      await assertOk(res);
      const data = await res.json();
      setRecords(data.records);
      setTotal(data.total);
      if (userId) writeCache(userId, { records: data.records, total: data.total });
    } catch (err) {
      if (signal?.aborted) return;
      // 401/423 mean the session or lock state changed; ProtectedApp owns
      // those transitions (redirect/lock UI), not the data layer.
      if (err instanceof Error && /^HTTP (401|423)/.test(err.message)) return;
      console.error("Failed to load numbers:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const load = async () => {
      await fetchStats();
      await fetchFacets();
    };
    void load();
  }, [fetchStats, fetchFacets]);

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const load = async () => {
      await fetchNumbers(filters, ctrl.signal);
    };
    void load();
    return () => ctrl.abort();
  }, [filters, fetchNumbers]);

  // Real-time: cross-tab (localStorage storage events, other tabs only) +
  // polling + refocus. The editing tab keeps its optimistic in-place state.
  // Latest-wins: abort any in-flight refresh so a stale response (started
  // before a status change) can't overwrite the fresh one afterwards.
  const pullLatest = useCallback(async () => {
    latestRef.current?.abort();
    const ctrl = new AbortController();
    latestRef.current = ctrl;
    await Promise.all([fetchNumbers(filters, ctrl.signal), fetchStats(ctrl.signal), fetchFacets(ctrl.signal)]);
  }, [fetchNumbers, fetchStats, fetchFacets, filters]);

  useEffect(() => {
    if (!userId) return;
    return onNumbersChanged(() => {
      void pullLatest();
    });
  }, [userId, pullLatest]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") {
        void pullLatest();
      }
    };
    document.addEventListener("visibilitychange", refresh);
    const timer = setInterval(refresh, POLL_MS);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      clearInterval(timer);
    };
  }, [pullLatest]);

  const updateFilter = useCallback((patch: Partial<NumberFilters>) => {
    setLoading(true);
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const optimisticUpdate = useCallback(
    (id: string, patch: Partial<MobileNumber>) => {
      setRecords((prev) => {
        const next = prev.map((r) => (r._id === id ? { ...r, ...patch } : r));
        if (userId) writeCache(userId, { records: next });
        return next;
      });
    },
    [userId],
  );

  const toggleCallStatus = useCallback(
    async (id: string, newStatus: CallStatus) => {
      const current = records.find((r) => r._id === id);
      if (!current || current.callStatus === newStatus) return;
      const oldStatus = current.callStatus;

      optimisticUpdate(id, { callStatus: newStatus });
      const statsPatch = (prev: NumberStats) => {
        const s = { ...prev };
        const keyMap: Record<CallStatus, keyof NumberStats> = { accepted: "accepted", not_accepted: "notAccepted", declined: "declined", unknown: "unknown" };
        s[keyMap[oldStatus]]--;
        s[keyMap[newStatus]]++;
        return s;
      };
      setStats(statsPatch);

      try {
        const res = await fetch(`/api/numbers/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callStatus: newStatus }),
        });
        await assertOk(res);
        if (userId) writeCache(userId, { stats: statsPatch(stats) });
        notifyNumbersChanged();
      } catch {
        optimisticUpdate(id, { callStatus: oldStatus });
        setStats((prev) => {
          const s = { ...prev };
          const keyMap: Record<CallStatus, keyof NumberStats> = { accepted: "accepted", not_accepted: "notAccepted", declined: "declined", unknown: "unknown" };
          s[keyMap[newStatus]]--;
          s[keyMap[oldStatus]]++;
          return s;
        });
        throw new Error("Failed to update status");
      }
    },
    [records, stats, optimisticUpdate, userId],
  );

  const updateContact = useCallback(
    async (id: string, data: Record<string, unknown>): Promise<boolean> => {
      const patch = data as Partial<MobileNumber>;
      optimisticUpdate(id, patch);
      try {
        const res = await fetch(`/api/numbers/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        await assertOk(res);
        setStatsLoading(true);
        setLoading(true);
        await Promise.all([fetchStats(), fetchNumbers(filters)]);
        notifyNumbersChanged();
        return true;
      } catch {
        optimisticUpdate(id, { ...patch, callStatus: records.find((r) => r._id === id)?.callStatus });
        return false;
      }
    },
    [optimisticUpdate, fetchStats, fetchNumbers, records, filters],
  );

  const deleteContact = useCallback(
    async (id: string): Promise<boolean> => {
      const oldRecords = records;
      const deleted = records.find((r) => r._id === id);
      setRecords((prev) => prev.filter((r) => r._id !== id));
      setTotal((prev) => prev - 1);
      if (userId) writeCache(userId, { records: records.filter((r) => r._id !== id), total: total - 1 });
      try {
        const res = await fetch(`/api/numbers/${id}`, { method: "DELETE" });
        await assertOk(res);
        if (deleted) {
          setStats((prev) => {
            const s = { ...prev };
            const keyMap: Record<CallStatus, keyof NumberStats> = { accepted: "accepted", not_accepted: "notAccepted", declined: "declined", unknown: "unknown" };
            s[keyMap[deleted.callStatus]]--;
            s.total--;
            return s;
          });
        }
        if (userId) writeCache(userId, { records: records.filter((r) => r._id !== id), total: total - 1 });
        setStatsLoading(true);
        await fetchStats();
        notifyNumbersChanged();
        return true;
      } catch {
        setRecords(oldRecords);
        setTotal(total);
        return false;
      }
    },
    [records, total, userId, fetchStats],
  );

  const bulkUpdateStatus = useCallback(
    async (ids: string[], callStatus: CallStatus): Promise<boolean> => {
      setRecords((prev) => {
        const next = prev.map((r) => (ids.includes(r._id) ? { ...r, callStatus } : r));
        if (userId) writeCache(userId, { records: next });
        return next;
      });
      try {
        const res = await fetch("/api/numbers/bulk", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids, callStatus }),
        });
        await assertOk(res);
        setLoading(true);
        await fetchNumbers(filters);
        setStatsLoading(true);
        fetchStats();
        notifyNumbersChanged();
        return true;
      } catch {
        return false;
      }
    },
    [filters, fetchNumbers, fetchStats, userId],
  );

  const bulkDelete = useCallback(
    async (ids: string[]): Promise<boolean> => {
      setRecords((prev) => {
        const next = prev.filter((r) => !ids.includes(r._id));
        if (userId) writeCache(userId, { records: next });
        return next;
      });
      setTotal((prev) => prev - ids.length);
      try {
        const res = await fetch("/api/numbers/bulk", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        await assertOk(res);
        setLoading(true);
        await fetchNumbers(filters);
        setStatsLoading(true);
        fetchStats();
        notifyNumbersChanged();
        return true;
      } catch {
        return false;
      }
    },
    [filters, fetchNumbers, fetchStats, userId],
  );

  const importNumbers = useCallback(
    async (numbers: { phoneNumber: string; normalizedPhoneNumber: string }[]): Promise<boolean> => {
      try {
        const res = await fetch("/api/numbers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ numbers }),
        });
        await assertOk(res);
        setStatsLoading(true);
        setLoading(true);
        await Promise.all([fetchStats(), fetchNumbers({ ...filters })]);
        notifyNumbersChanged();
        return true;
      } catch {
        return false;
      }
    },
    [filters, fetchNumbers, fetchStats],
  );

  const refresh = useCallback(() => {
    setLoading(true);
    void pullLatest();
  }, [pullLatest]);

  return {
    records,
    total,
    stats,
    loading,
    statsLoading,
    filters,
    facets,
    updateFilter,
    toggleCallStatus,
    updateContact,
    deleteContact,
    bulkUpdateStatus,
    bulkDelete,
    importNumbers,
    refresh,
  };
}