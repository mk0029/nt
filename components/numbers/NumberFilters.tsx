"use client";

import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import type { NumberFilters as NumberFiltersType } from "@/types/number";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

interface NumberFiltersProps {
  filters: Omit<NumberFiltersType, "perPage">;
  onFilterChange: (patch: Partial<Omit<NumberFiltersType, "perPage">>) => void;
  places: string[];
  includedInOptions: string[];
}

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "accepted", label: "Accepted" },
  { value: "not_accepted", label: "Not accepted" },
  { value: "unknown", label: "Unknown" },
];

const SORT_OPTIONS = [
  { value: "updatedAt", label: "Recently updated" },
  { value: "createdAt", label: "Recently added" },
  { value: "name", label: "Name" },
  { value: "phoneNumber", label: "Phone number" },
  { value: "callStatus", label: "Status" },
];

export function NumberFilters({ filters, onFilterChange, places, includedInOptions }: NumberFiltersProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeFilterCount =
    (filters.status !== "all" ? 1 : 0) +
    (filters.place ? 1 : 0) +
    (filters.includedIn ? 1 : 0);

  const handleReset = () => {
    onFilterChange({ status: "all", place: "", includedIn: "", sort: "updatedAt", page: 1 });
    setMobileOpen(false);
  };

  const handleApply = () => setMobileOpen(false);

  const filterControls = (
    close: () => void
  ) => (
    <div className="flex flex-1 flex-col gap-4 p-5">
      <Select
        label="Status"
        value={filters.status}
        onChange={(v) => onFilterChange({ status: v as typeof filters.status, page: 1 })}
        options={STATUS_OPTIONS}
      />

      <Select
        label="Place"
        value={filters.place}
        onChange={(v) => onFilterChange({ place: v, page: 1 })}
        options={[{ value: "", label: "All places" }, ...places.map((p) => ({ value: p, label: p }))]}
      />

      <Select
        label="Included in"
        value={filters.includedIn}
        onChange={(v) => onFilterChange({ includedIn: v, page: 1 })}
        options={[{ value: "", label: "All lists" }, ...includedInOptions.map((p) => ({ value: p, label: p }))]}
      />

      <Select
        label="Sort by"
        value={filters.sort}
        onChange={(v) => onFilterChange({ sort: v as typeof filters.sort })}
        options={SORT_OPTIONS}
      />

      <div className="mt-auto flex gap-2 pt-1">
        <Button variant="secondary" size="md" className="flex-1" onClick={handleReset}>
          Reset
        </Button>
        <Button variant="primary" size="md" className="flex-1" onClick={() => { handleApply(); close(); }}>
          Apply
        </Button>
      </div>
    </div>
  );

  return (
    <GlassCard className="p-4">
      <div className="hidden items-center gap-3 lg:grid lg:grid-cols-[minmax(220px,1fr)_180px_180px_180px_160px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden />
          <Input
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
            placeholder="Search name, place, phone…"
            className="pl-9"
            aria-label="Search numbers"
          />
        </div>

        <Select
          value={filters.status}
          onChange={(v) => onFilterChange({ status: v as typeof filters.status, page: 1 })}
          aria-label="Filter by status"
          options={STATUS_OPTIONS}
        />

        <Select
          value={filters.place}
          onChange={(v) => onFilterChange({ place: v, page: 1 })}
          aria-label="Filter by place"
          options={[{ value: "", label: "All places" }, ...places.map((p) => ({ value: p, label: p }))]}
        />

        <Select
          value={filters.includedIn}
          onChange={(v) => onFilterChange({ includedIn: v, page: 1 })}
          aria-label="Filter by included in"
          options={[{ value: "", label: "All lists" }, ...includedInOptions.map((p) => ({ value: p, label: p }))]}
        />

        <Select
          value={filters.sort}
          onChange={(v) => onFilterChange({ sort: v as typeof filters.sort })}
          aria-label="Sort by"
          options={SORT_OPTIONS}
        />
      </div>

      <div className="flex items-center gap-2 lg:hidden">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden />
          <Input
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
            placeholder="Search numbers…"
            className="pl-9"
            aria-label="Search numbers"
          />
        </div>
        <Button variant="secondary" size="md" onClick={() => setMobileOpen(true)} className="relative" aria-label="Open filters">
          <SlidersHorizontal className="size-4" aria-hidden />
          {activeFilterCount > 0 && (
            <span
              className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ background: "#6366f1" }}
            >
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      <Dialog
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title="Filters"
        maxWidth="sm"
        mobileFullHeight
      >
        {filterControls}
      </Dialog>
    </GlassCard>
  );
}