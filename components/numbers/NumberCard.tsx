"use client";

import type { CallStatus, MobileNumber } from "@/types/number";
import { StatusSwitch, StatusPill } from "@/components/ui/StatusSwitch";
import { formatPhoneNumber } from "@/lib/normalizePhone";

interface NumberCardProps {
  record: MobileNumber;
  selected: boolean;
  onToggleSelect: () => void;
  onOpenDetails: () => void;
  onToggleStatus: (id: string, newStatus: CallStatus) => void;
}

export function NumberCard({
  record,
  selected,
  onToggleSelect,
  onOpenDetails,
  onToggleStatus,
}: NumberCardProps) {
  return (
    <div
      className="flex items-center gap-2.5 border-b px-3 py-2.5 last:border-b-0"
      style={{
        borderColor: "var(--glass-border)",
        background: selected ? "rgba(99,102,241,0.06)" : "transparent",
      }}>
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggleSelect}
        aria-label={`Select ${formatPhoneNumber(record.normalizedPhoneNumber)}`}
        className="size-4 shrink-0 cursor-pointer rounded"
      />
      <button
        type="button"
        onClick={onOpenDetails}
        className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-whites">
            {formatPhoneNumber(record.normalizedPhoneNumber)}
          </p>
          <p
            className="mt-0.5 truncate text-xs"
            style={{ color: "var(--muted)" }}>
            {record.lastResponse && (
              <>{record.lastResponse} · </>
            )}
            {[
              record.name,
              record.place,
              record.lastContactedAt
                ? `contacted ${new Date(record.lastContactedAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}`
                : "",
            ]
              .filter(Boolean)
              .join(" · ") || "No details"}
          </p>
        </div>
        <StatusPill status={record.callStatus} />
      </button>
      <div className="shrink-0">
        <StatusSwitch
          status={record.callStatus}
          onChange={(status) => onToggleStatus(record._id, status)}
        />
      </div>
    </div>
  );
}
