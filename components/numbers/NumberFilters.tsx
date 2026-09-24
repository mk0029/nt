"use client";

import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import type {
  CallStatus,
  NumberFilters as NumberFiltersType,
} from "@/types/number";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

interface NumberFiltersProps {
  filters: NumberFiltersType;
  onFilterChange: (patch: Partial<NumberFiltersType>) => void;
  places: string[];
  includedInOptions: string[];
}

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "accepted", label: "Accepted" },
  { value: "not_accepted", label: "Not accepted" },
  { value: "declined", label: "Declined" },
  { value: "unknown", label: "Unknown" },
];

const STATUS_CHECKBOXES: { value: CallStatus; label: string }[] = [
  { value: "accepted", label: "Accepted" },
  { value: "not_accepted", label: "Not accepted" },
  { value: "declined", label: "Declined" },
  { value: "unknown", label: "Unknown" },
];

function StatusCheckboxes({
  value,
  onToggle,
}: {
  value: CallStatus[];
  onToggle: (status: CallStatus, checked: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {STATUS_CHECKBOXES.map((o) => (
        <label
          key={o.value}
          className="flex cursor-pointer items-center gap-2 text-sm text-[var(--foreground)]">
          <input
            type="checkbox"
            checked={value.includes(o.value)}
            onChange={(e) => onToggle(o.value, e.target.checked)}
            className="size-4 shrink-0 cursor-pointer rounded"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

const SORT_OPTIONS = [
  { value: "updatedAt", label: "Recently updated" },
  { value: "createdAt", label: "Recently added" },
  { value: "name", label: "Name" },
  { value: "phoneNumber", label: "Phone number" },
  { value: "callStatus", label: "Status" },
];

export function NumberFilters({
  filters,
  onFilterChange,
  places,
  includedInOptions,
}: NumberFiltersProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeFilterCount =
    (filters.status.length > 0 ? 1 : 0) +
    (filters.place ? 1 : 0) +
    (filters.includedIn ? 1 : 0);

  const toggleStatus = (status: CallStatus, checked: boolean) => {
    const next = checked
      ? [...filters.status, status]
      : filters.status.filter((s) => s !== status);
    onFilterChange({ status: next });
  };

  const handleReset = () => {
    onFilterChange({
      status: [],
      place: "",
      includedIn: "",
      sort: "updatedAt",
    });
    setMobileOpen(false);
  };

  const handleApply = () => setMobileOpen(false);

  const filterControls = (close: () => void) => (
    <div className="flex flex-1 flex-col gap-4 p-5">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[var(--foreground)]">
          Status
        </span>
        <StatusCheckboxes value={filters.status} onToggle={toggleStatus} />
      </div>

      <Select
        label="Place"
        value={filters.place}
        onChange={(v) => onFilterChange({ place: v })}
        options={[
          { value: "", label: "All places" },
          ...places.map((p) => ({ value: p, label: p })),
        ]}
      />

      <Select
        label="Included in"
        value={filters.includedIn}
        onChange={(v) => onFilterChange({ includedIn: v })}
        options={[
          { value: "", label: "All lists" },
          ...includedInOptions.map((p) => ({ value: p, label: p })),
        ]}
      />

      <Select
        label="Sort by"
        value={filters.sort}
        onChange={(v) => onFilterChange({ sort: v as typeof filters.sort })}
        options={SORT_OPTIONS}
      />

      <div className="mt-auto flex gap-2 pt-1">
        <Button
          variant="secondary"
          size="md"
          className="flex-1"
          onClick={handleReset}>
          Reset
        </Button>
        <Button
          variant="primary"
          size="md"
          className="flex-1"
          onClick={() => {
            handleApply();
            close();
          }}>
          Apply
        </Button>
      </div>
    </div>
  );

  return (
    <GlassCard className="p-3 md:p-4">
      <div className="hidden items-center gap-3 lg:grid lg:grid-cols-[minmax(220px,1fr)_180px_180px_180px_160px]">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]"
            aria-hidden
          />
          <Input
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            placeholder="Search name, place, phone…"
            className="pl-9"
            aria-label="Search numbers"
          />
        </div>

        <Select
          value={filters.status.length === 1 ? filters.status[0] : "all"}
          onChange={(v) =>
            onFilterChange({
              status: v === "all" ? [] : [v as CallStatus],
            })
          }
          aria-label="Filter by status"
          options={STATUS_OPTIONS}
        />

        <Select
          value={filters.place}
          onChange={(v) => onFilterChange({ place: v })}
          aria-label="Filter by place"
          options={[
            { value: "", label: "All places" },
            ...places.map((p) => ({ value: p, label: p })),
          ]}
        />

        <Select
          value={filters.includedIn}
          onChange={(v) => onFilterChange({ includedIn: v })}
          aria-label="Filter by included in"
          options={[
            { value: "", label: "All lists" },
            ...includedInOptions.map((p) => ({ value: p, label: p })),
          ]}
        />

        <Select
          value={filters.sort}
          onChange={(v) => onFilterChange({ sort: v as typeof filters.sort })}
          aria-label="Sort by"
          options={SORT_OPTIONS}
        />
      </div>

      <div className="flex flex-col gap-2 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]"
              aria-hidden
            />
            <Input
              value={filters.search}
              onChange={(e) => onFilterChange({ search: e.target.value })}
              placeholder="Search numbers…"
              className="pl-9"
              aria-label="Search numbers"
            />
          </div>
          <Button
            variant="secondary"
            size="md"
            onClick={() => setMobileOpen(true)}
            className="relative"
            aria-label="Open filters">
            <SlidersHorizontal className="size-4" aria-hidden />
            {activeFilterCount > 0 && (
              <span
                className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ background: "#6366f1" }}>
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        <StatusCheckboxes value={filters.status} onToggle={toggleStatus} />
      </div>

      <Dialog
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title="Filters"
        maxWidth="sm"
        mobileFullHeight>
        {filterControls}
      </Dialog>
    </GlassCard>
  );
}