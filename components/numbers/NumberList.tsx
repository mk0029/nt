"use client";

import { Phone, Plus } from "lucide-react";
import type {
  MobileNumber,
  NumberFilters as NumberFiltersType,
  CallStatus,
} from "@/types/number";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { NumberRow } from "./NumberRow";
import { NumberCard } from "./NumberCard";

interface NumberListProps {
  records: MobileNumber[];
  total: number;
  loading: boolean;
  filters: Omit<NumberFiltersType, "perPage">;
  perPage: number;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAllVisible: () => void;
  onOpenDetails: (record: MobileNumber) => void;
  onToggleStatus: (id: string, newStatus: CallStatus) => void;
  onFilterChange: (patch: Partial<Omit<NumberFiltersType, "perPage">>) => void;
  onImport: () => void;
}

const HEADER_GRID =
  "grid grid-cols-[32px_minmax(160px,1fr)_100px_120px_110px] items-center gap-3";

function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div
        className="flex size-16 items-center justify-center rounded-2xl"
        style={{ background: "var(--surface-hover)" }}>
        <Phone className="size-8" style={{ color: "var(--muted)" }} />
      </div>
      <div>
        <p
          className="text-base font-semibold"
          style={{ color: "var(--foreground)" }}>
          No mobile numbers yet
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Import your first batch by pasting a list of numbers.
        </p>
      </div>
      <Button variant="primary" size="md" onClick={onImport}>
        <Plus className="size-4" aria-hidden />
        Import Numbers
      </Button>
    </div>
  );
}

function NoResults() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <p
        className="text-base font-semibold"
        style={{ color: "var(--foreground)" }}>
        No matching numbers
      </p>
      <p className="text-sm max-w-xs" style={{ color: "var(--muted)" }}>
        Try clearing your search or adjusting the filters.
      </p>
    </div>
  );
}

export function NumberList({
  records,
  total,
  loading,
  filters,
  perPage,
  selected,
  onToggleSelect,
  onSelectAllVisible,
  onOpenDetails,
  onToggleStatus,
  onFilterChange,
  onImport,
}: NumberListProps) {
  const hasFilters =
    filters.status !== "all" ||
    !!filters.search ||
    !!filters.place ||
    !!filters.includedIn;

  return (
    <GlassCard className="flex h-full min-h-0 flex-col overflow-hidden">
      {loading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="flex-1 overflow-y-auto">
          {hasFilters ? <NoResults /> : <EmptyState onImport={onImport} />}
        </div>
      ) : (
        <>
          <div
            className={`hidden shrink-0 border-b px-4 py-2.5 text-xs font-medium uppercase tracking-wider md:grid ${HEADER_GRID}`}
            style={{
              borderColor: "var(--glass-border)",
              color: "var(--muted)",
            }}>
            <div>
              <input
                type="checkbox"
                checked={
                  records.length > 0 &&
                  records.every((r) => selected.has(r._id))
                }
                onChange={onSelectAllVisible}
                aria-label="Select all visible"
                className="size-4 cursor-pointer rounded"
              />
            </div>
            <div>Phone / Contact</div>
            <div>Status</div>
            <div>Place</div>
            <div>Last update</div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {records.map((record) => (
              <div key={record._id}>
                <div className="md:hidden">
                  <NumberCard
                    record={record}
                    selected={selected.has(record._id)}
                    onToggleSelect={() => onToggleSelect(record._id)}
                    onOpenDetails={() => onOpenDetails(record)}
                    onToggleStatus={(id, status) => onToggleStatus(id, status)}
                  />
                </div>
                <div className="hidden md:block">
                  <NumberRow
                    record={record}
                    selected={selected.has(record._id)}
                    onToggleSelect={() => onToggleSelect(record._id)}
                    onOpenDetails={() => onOpenDetails(record)}
                    onToggleStatus={(id, status) => onToggleStatus(id, status)}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && records.length > 0 && (
        <div
          className="flex shrink-0 flex-col items-center justify-between gap-3 border-t px-4 py-3 sm:flex-row"
          style={{ borderColor: "var(--glass-border)" }}>
          {/* <p className="text-sm" style={{ color: "var(--muted)" }}>
            Showing {Math.min((filters.page - 1) * perPage + 1, total)}–{Math.min(filters.page * perPage, total)} of {total.toLocaleString()}
          </p> */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={filters.page <= 1}
              onClick={() => onFilterChange({ page: filters.page - 1 })}>
              Previous
            </Button>
            <span className="text-sm" style={{ color: "var(--muted)" }}>
              Page {filters.page}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={filters.page * perPage >= total}
              onClick={() => onFilterChange({ page: filters.page + 1 })}>
              Next
            </Button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
