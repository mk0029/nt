"use client";

import { useState } from "react";
import { useNumbers } from "@/hooks/useNumbers";
import { ProtectedApp, useProtected } from "@/components/security/ProtectedApp";
import { Header } from "@/components/layout/Header";
import { NumberFilters } from "@/components/numbers/NumberFilters";
import { NumberList } from "@/components/numbers/NumberList";
import { BulkActions } from "@/components/numbers/BulkActions";
import { ImportNumbersModal } from "@/components/numbers/ImportNumbersModal";
import { NumberDetailsModal } from "@/components/numbers/NumberDetailsModal";
import { useToast } from "@/components/ui/Toast";
import type { MobileNumber, CallStatus } from "@/types/number";

function NumbersDashboard() {
  const ctx = useProtected();
  const { toast } = useToast();
  const {
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
  } = useNumbers();

  const [importOpen, setImportOpen] = useState(false);
  const [detailsRecord, setDetailsRecord] = useState<MobileNumber | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleStatusChange = async (id: string, newStatus: CallStatus) => {
    try {
      await toggleCallStatus(id, newStatus);
    } catch {
      toast("error", "Failed to update status");
    }
  };

  const handleBulkStatus = async (ids: string[], status: CallStatus) => {
    try {
      await bulkUpdateStatus(ids, status);
      toast("success", `Marked ${ids.length} as ${status.replace("_", " ")}`);
    } catch {
      toast("error", "Bulk update failed");
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      await bulkDelete(ids);
      setSelected(new Set());
      toast("success", `Deleted ${ids.length} numbers`);
    } catch {
      toast("error", "Bulk delete failed");
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = records.every((r) => next.has(r._id));
      records.forEach((r) => {
        if (allSelected) next.delete(r._id);
        else next.add(r._id);
      });
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  return (
    <>
      <Header
        onImport={() => setImportOpen(true)}
        isAdmin={ctx.user.isAdmin}
      />

      <main className="mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col gap-2.5 overflow-hidden px-3 py-3 md:px-6 md:py-4">
        <NumberFilters
          filters={filters}
          onFilterChange={updateFilter}
          places={facets.places}
          includedInOptions={facets.includedIn}
        />

        {selected.size > 0 && (
          <BulkActions
            selectedCount={selected.size}
            selectedIds={Array.from(selected)}
            stats={stats}
            statsLoading={statsLoading}
            onBulkStatus={handleBulkStatus}
            onBulkDelete={handleBulkDelete}
            onClear={clearSelection}
          />
        )}

        <div className="flex min-h-0 flex-1 flex-col">
          <NumberList
            records={records}
            total={total}
            loading={loading}
            filters={filters}
            selected={selected}
            onToggleSelect={toggleSelect}
            onSelectAllVisible={selectAllVisible}
            onOpenDetails={setDetailsRecord}
            onToggleStatus={handleStatusChange}
            onImport={() => setImportOpen(true)}
          />
        </div>
      </main>

      <ImportNumbersModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={importNumbers}
      />

      <NumberDetailsModal
        record={detailsRecord}
        onClose={() => setDetailsRecord(null)}
        onSave={updateContact}
        onDelete={deleteContact}
      />
    </>
  );
}

export default function NumbersPage() {
  return (
    <ProtectedApp>
      <NumbersDashboard />
    </ProtectedApp>
  );
}