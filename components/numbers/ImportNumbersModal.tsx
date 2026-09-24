"use client";

import { useCallback, useMemo, useState } from "react";
import { CheckCircle2, ClipboardPaste, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Textarea } from "@/components/ui/Textarea";
import { normalizePhone, parseRawNumbers } from "@/lib/normalizePhone";

interface Candidate {
  raw: string;
  normalized: string | null;
}

interface ImportNumbersModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (
    numbers: { phoneNumber: string; normalizedPhoneNumber: string }[]
  ) => Promise<boolean>;
}

type Step = "edit" | "preview" | "importing";

export function ImportNumbersModal({ open, onClose, onImport }: ImportNumbersModalProps) {
  const [step, setStep] = useState<Step>("edit");
  const [text, setText] = useState("");
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const [lastOpen, setLastOpen] = useState(open);
  if (lastOpen !== open) {
    setLastOpen(open);
    if (!open) {
      setStep("edit");
      setText("");
      setDuplicates([]);
      setBusy(false);
    }
  }

  const candidates: Candidate[] = useMemo(() => {
     
    return parseRawNumbers(text).map((raw) => ({ raw, normalized: normalizePhone(raw, "IN") }));
  }, [text]);

  const uniqueValid = useMemo(() => {
    const seen = new Set<string>();
    const out: { phoneNumber: string; normalizedPhoneNumber: string }[] = [];
    for (const c of candidates) {
      if (c.normalized && !seen.has(c.normalized)) {
        seen.add(c.normalized);
        out.push({ phoneNumber: c.raw, normalizedPhoneNumber: c.normalized });
      }
    }
    return out;
  }, [candidates]);

  const invalidCount = candidates.filter((c) => !c.normalized).length;

  const checkDuplicates = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/numbers/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numbers: uniqueValid.map((n) => n.normalizedPhoneNumber) }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDuplicates(data.duplicates ?? []);
      setStep("preview");
    } catch {
      // fall back straight to import if preview fails
      setDuplicates([]);
      setStep("preview");
    } finally {
      setBusy(false);
    }
  }, [uniqueValid]);

  const uniqueAfterDedup = uniqueValid.filter((n) => !duplicates.includes(n.normalizedPhoneNumber));

  const handleImport = async () => {
    setStep("importing");
    setBusy(true);
    try {
      const ok = await onImport(uniqueAfterDedup);
      if (ok) {
        onClose();
      } else {
        setStep("preview");
        setBusy(false);
      }
    } catch {
      setStep("preview");
      setBusy(false);
    }
  };

  const downloadSample = () => {
    const sample = "9876543210\n+91 98111 22233\nRahul, 9012345678";
    const url = URL.createObjectURL(new Blob([sample], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample-numbers.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderEdit = (close: () => void) => (
    <div className="flex flex-col gap-4 p-5">
      <div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={"Paste numbers here, one per line…\n\n9876543210\n+91 98111 22233"}
          label="Phone numbers"
          autoFocus
        />
        <p className="mt-1.5 text-xs" style={{ color: "var(--muted)" }}>
          One per line, or separated by commas, semicolons, or spaces. Country code assumed: +91
          (India).
        </p>
      </div>

      <button
        type="button"
        onClick={downloadSample}
        className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-indigo-500 hover:underline"
      >
        <Download className="size-3.5" aria-hidden />
        Download sample format
      </button>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="md" onClick={close}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="md"
          disabled={uniqueValid.length === 0}
          loading={busy}
          onClick={checkDuplicates}
        >
          <ClipboardPaste className="size-4" aria-hidden />
          Continue
        </Button>
      </div>
    </div>
  );

  const renderPreview = () => (
    <div className="flex flex-col gap-4 p-5">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl p-3" style={{ background: "var(--surface-hover)" }}>
          <p className="text-2xl font-bold" style={{ color: "#8b5cf6" }}>
            {uniqueAfterDedup.length}
          </p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Will import
          </p>
        </div>
        <div className="rounded-xl p-3" style={{ background: "var(--surface-hover)" }}>
          <p className="text-2xl font-bold" style={{ color: "#ef4444" }}>
            {duplicates.length}
          </p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Already exist
          </p>
        </div>
        <div className="rounded-xl p-3" style={{ background: "var(--surface-hover)" }}>
          <p className="text-2xl font-bold" style={{ color: "#f59e0b" }}>
            {invalidCount}
          </p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Invalid
          </p>
        </div>
      </div>

      {invalidCount > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
            Invalid entries (will be skipped)
          </p>
          <div
            className="max-h-28 overflow-y-auto rounded-lg p-2 text-xs"
            style={{ background: "var(--input-bg)", border: "1px solid var(--glass-border)" }}
          >
            {candidates
              .filter((c) => !c.normalized)
              .slice(0, 20)
              .map((c, i) => (
                <div key={i} className="px-1 py-0.5 text-red-500">
                  {c.raw || "(empty line)"}
                </div>
              ))}
            {candidates.filter((c) => !c.normalized).length > 20 && (
              <div className="px-1 py-0.5 text-xs" style={{ color: "var(--muted)" }}>
                …and {candidates.filter((c) => !c.normalized).length - 20} more
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
        <p className="flex items-start gap-2 font-medium">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          {uniqueAfterDedup.length} new numbers will be added with status{" "}
          <span className="font-semibold">Unknown</span>.
        </p>
      </div>

      <div className="flex justify-between gap-2">
        <Button variant="secondary" size="md" onClick={() => setStep("edit")}>
          Back
        </Button>
        <Button variant="primary" size="md" onClick={handleImport} loading={busy}>
          Import {uniqueAfterDedup.length} Numbers
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog
      mobileFullHeight
      open={open}
      onClose={onClose}
      title="Import Numbers"
      maxWidth="md"
      renderChildren={step === "edit" ? renderEdit : renderPreview}
    />
  );
}