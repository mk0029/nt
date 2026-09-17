"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { MobileNumber } from "@/types/number";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { formatPhoneNumber } from "@/lib/normalizePhone";

interface DeleteNumberDialogProps {
  record: MobileNumber;
  onDelete: () => Promise<boolean>;
}

export function DeleteNumberDialog({ record, onDelete }: DeleteNumberDialogProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleDelete = async (close: () => void) => {
    setBusy(true);
    try {
      const ok = await onDelete();
      if (ok) close();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="size-3.5" aria-hidden />
        Delete
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Delete number" maxWidth="sm">
        {(close) => (
          <div className="p-5">
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              This will permanently delete{" "}
              <span className="font-semibold" style={{ color: "var(--foreground)" }}>
                {formatPhoneNumber(record.normalizedPhoneNumber)}
              </span>
              . This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" size="md" onClick={close}>
                Cancel
              </Button>
              <Button variant="danger" size="md" loading={busy} onClick={() => handleDelete(close)}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}