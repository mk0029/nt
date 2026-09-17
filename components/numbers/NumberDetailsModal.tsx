"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Check, Copy, MessageCircle, Phone } from "lucide-react";
import { updateNumberSchema, type UpdateNumberValues } from "@/lib/validation";
import type { MobileNumber } from "@/types/number";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { DeleteNumberDialog } from "./DeleteNumberDialog";
import { formatPhoneNumber } from "@/lib/normalizePhone";

interface NumberDetailsModalProps {
  record: MobileNumber | null;
  onClose: () => void;
  onSave: (id: string, data: Record<string, unknown>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export function NumberDetailsModal({ record, onClose, onSave, onDelete }: NumberDetailsModalProps) {
  const [copied, setCopied] = useState(false);

  const copyNumber = async () => {
    if (!record) return;
    await navigator.clipboard.writeText(record.normalizedPhoneNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UpdateNumberValues>({
    resolver: zodResolver(updateNumberSchema),
    defaultValues: {
      name: "",
      place: "",
      includedIn: "",
      lastResponse: "",
      notes: "",
      callStatus: "unknown",
      lastContactedAt: "",
    },
  });

  useEffect(() => {
    if (record) {
      reset({
        name: record.name || "",
        place: record.place || "",
        includedIn: record.includedIn || "",
        lastResponse: record.lastResponse || "",
        notes: record.notes || "",
        callStatus: record.callStatus ?? "unknown",
        lastContactedAt: record.lastContactedAt || "",
      });
    }
  }, [record, reset]);

  const onSubmit = async (values: UpdateNumberValues) => {
    if (!record) return;
    const data: Record<string, unknown> = {
      callStatus: values.callStatus ?? record.callStatus,
      name: values.name || undefined,
      place: values.place || undefined,
      includedIn: values.includedIn || undefined,
      lastResponse: values.lastResponse || undefined,
      notes: values.notes || undefined,
      lastContactedAt: values.lastContactedAt || undefined,
    };
    const ok = await onSave(record._id, data);
    if (ok) onClose();
  };

  return (
    <Dialog
      open={record !== null}
      onClose={onClose}
      title={record ? formatPhoneNumber(record.normalizedPhoneNumber) : undefined}
      maxWidth="md"
      mobileFullHeight
    >
      {(close) => (
        <div className="flex flex-col gap-4 p-5">
          {record && (
            <div className="flex items-center justify-between gap-2">
              <div
                className="flex size-9 items-center justify-center rounded-lg"
                style={{ background: "var(--surface-hover)" }}
              >
                <AlertTriangle className="size-4 text-amber-500" aria-hidden />
              </div>
              <DeleteNumberDialog
                record={record}
                onDelete={async () => {
                  const ok = await onDelete(record._id);
                  if (ok) onClose();
                  return ok;
                }}
              />
            </div>
          )}

          {record && (
            <div className="grid grid-cols-3 gap-2">
              <a
                href={`tel:${record.normalizedPhoneNumber}`}
                className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
                style={{ background: "var(--glass-strong)", color: "var(--foreground)", border: "1px solid var(--glass-border)" }}
              >
                <Phone className="size-4" aria-hidden /> Call
              </a>
              <a
                href={`https://wa.me/${record.normalizedPhoneNumber.replace("+", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
                style={{ background: "var(--glass-strong)", color: "var(--foreground)", border: "1px solid var(--glass-border)" }}
              >
                <MessageCircle className="size-4" aria-hidden /> WhatsApp
              </a>
              <button
                type="button"
                onClick={copyNumber}
                className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
                style={{ background: "var(--glass-strong)", color: "var(--foreground)", border: "1px solid var(--glass-border)" }}
              >
                {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Name" placeholder="Full name" error={errors.name?.message} {...register("name")} />
              <Input label="Place" placeholder="City / area" error={errors.place?.message} {...register("place")} />
            </div>

            <Input
              label="Included in"
              placeholder="e.g. Wedding list, 2026 drive"
              error={errors.includedIn?.message}
              {...register("includedIn")}
            />

            <Controller
              name="callStatus"
              control={control}
              render={({ field }) => (
                <Select
                  label="Call status"
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: "accepted", label: "Accepted" },
                    { value: "not_accepted", label: "Not accepted" },
                    { value: "unknown", label: "Unknown" },
                  ]}
                />
              )}
            />

            <Input
              label="Last response"
              placeholder="What did they say?"
              error={errors.lastResponse?.message}
              {...register("lastResponse")}
            />

            <Input
              label="Last contacted at"
              type="datetime-local"
              {...register("lastContactedAt")}
            />

            <Textarea
              label="Notes"
              rows={4}
              placeholder="Anything to remember about this person"
              error={errors.notes?.message}
              {...register("notes")}
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" size="md" type="button" onClick={close}>
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit" loading={isSubmitting}>
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      )}
    </Dialog>
  );
}