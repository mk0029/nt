"use client";

import { ChevronRight } from "lucide-react";
import type { CallStatus, MobileNumber } from "@/types/number";
import { StatusSwitch } from "@/components/ui/StatusSwitch";
import { formatPhoneNumber } from "@/lib/normalizePhone";

interface NumberRowProps {
  record: MobileNumber;
  selected: boolean;
  onToggleSelect: () => void;
  onOpenDetails: () => void;
  onToggleStatus: (id: string, newStatus: CallStatus) => void;
}

const ROW_GRID =
  "grid grid-cols-[32px_minmax(160px,1fr)_100px_120px_110px] items-center gap-3";

export function NumberRow({
  record,
  selected,
  onToggleSelect,
  onOpenDetails,
  onToggleStatus,
}: NumberRowProps) {
  return (
    <div
      className={`hidden border-b px-4 py-3 transition-colors last:border-b-0 md:grid ${ROW_GRID}`}
      style={{
        borderColor: "var(--glass-border)",
        background: selected ? "rgba(99,102,241,0.06)" : "transparent",
      }}>
      <div>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          aria-label={`Select ${formatPhoneNumber(record.normalizedPhoneNumber)}`}
          className="size-4 cursor-pointer rounded"
        />
      </div>
      <div className="min-w-0">
        <button
          type="button"
          onClick={onOpenDetails}
          className="group flex items-center gap-1 text-left text-sm font-semibold text-indigo-600 hover:underline">
          <span className="dark:text-white text-black truncate ">
            {formatPhoneNumber(record.normalizedPhoneNumber)}
            {record.name ? ` — ${record.name}` : ""}
          </span>
          <ChevronRight
            className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          />
        </button>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <StatusSwitch
          status={record.callStatus}
          onChange={(status) => onToggleStatus(record._id, status)}
        />
      </div>
      <div className="truncate text-sm" style={{ color: "var(--muted)" }}>
        {record.place || "—"}
      </div>
      <div className="text-sm" style={{ color: "var(--muted)" }}>
        {new Date(record.updatedAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        })}
      </div>
    </div>
  );
}
