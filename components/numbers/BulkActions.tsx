"use client";

import { useState } from "react";
import { BarChart3, CheckCircle2, HelpCircle, Trash2, XCircle } from "lucide-react";
import type { CallStatus, NumberStats } from "@/types/number";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { STAT_ITEMS } from "./NumberStats";

const STATUS_BUTTONS: { status: CallStatus; label: string; icon: React.ReactNode }[] = [
  { status: "accepted", label: "Accepted", icon: <CheckCircle2 className="size-3.5" aria-hidden /> },
  { status: "not_accepted", label: "Not accepted", icon: <HelpCircle className="size-3.5" aria-hidden /> },
  { status: "declined", label: "Declined", icon: <XCircle className="size-3.5" aria-hidden /> },
  { status: "unknown", label: "Unknown", icon: <HelpCircle className="size-3.5" aria-hidden /> },
];

interface BulkActionsProps {
  selectedCount: number;
  selectedIds: string[];
  stats: NumberStats;
  statsLoading: boolean;
  onBulkStatus: (ids: string[], status: CallStatus) => void;
  onBulkDelete: (ids: string[]) => void;
  onClear: () => void;
}

export function BulkActions({
  selectedCount,
  selectedIds,
  stats,
  statsLoading,
  onBulkStatus,
  onBulkDelete,
  onClear,
}: BulkActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [busy, setBusy] = useState<CallStatus | "delete" | null>(null);

  const run = async (fn: () => void, kind: CallStatus | "delete") => {
    setBusy(kind);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = () => {
    setDeleteOpen(false);
    void run(() => onBulkDelete(selectedIds), "delete");
  };

  return (
    <GlassCard
      className="p-3"
      role="toolbar"
      aria-label="Bulk actions"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-1 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          {selectedCount} selected
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            disabled={busy !== null}
            onClick={() => setStatsOpen(true)}
          >
            <BarChart3 className="size-3.5" aria-hidden />
            Stats
          </Button>
          {STATUS_BUTTONS.map(({ status, label, icon }) => (
            <Button
              key={status}
              variant="secondary"
              size="sm"
              loading={busy === status}
              disabled={busy !== null && busy !== status}
              onClick={() => void run(() => onBulkStatus(selectedIds, status), status)}
            >
              {icon}
              {label}
            </Button>
          ))}
          <Button
            variant="danger"
            size="sm"
            loading={busy === "delete"}
            disabled={busy !== null && busy !== "delete"}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" aria-hidden />
            Delete
          </Button>
          <Button variant="ghost" size="sm" disabled={busy !== null} onClick={onClear}>
            Clear
          </Button>
        </div>
      </div>

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete selected numbers"
        maxWidth="sm"
      >
        {(close) => (
          <div className="p-5">
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              This will permanently delete {selectedCount} number(s). This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" size="md" onClick={close}>
                Cancel
              </Button>
              <Button variant="danger" size="md" onClick={handleDelete}>
                Delete {selectedCount}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        title="Statistics"
        maxWidth="sm"
      >
        {(close) => (
          <div className="p-5">
            <div className="space-y-2">
              {STAT_ITEMS.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: "var(--surface-hover)" }}
                >
                  <span className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    <span style={{ color: item.color }}>{item.icon}</span>
                    {item.label}
                  </span>
                  <span className="text-lg font-bold" style={{ color: item.color }}>
                    {statsLoading ? "…" : stats[item.key].toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <Button variant="secondary" size="md" onClick={close}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </GlassCard>
  );
}