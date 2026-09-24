"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Check,
  Copy,
  MessageCircle,
  Phone,
  UserPlus,
} from "lucide-react";
import {
  updateNumberSchema,
  CALL_STATUSES,
  type UpdateNumberValues,
} from "@/lib/validation";
import { downloadVCard } from "@/lib/vcard";
import type { MobileNumber } from "@/types/number";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DeleteNumberDialog } from "./DeleteNumberDialog";
import { formatPhoneNumber } from "@/lib/normalizePhone";

interface ResponsePreset {
  _id: string;
  text: string;
}

const STATUS_LABELS: Record<string, string> = {
  accepted: "Accepted",
  not_accepted: "Not accepted",
  declined: "Declined",
  unknown: "Unknown",
};

interface NumberDetailsModalProps {
  record: MobileNumber | null;
  onClose: () => void;
  onSave: (id: string, data: Record<string, unknown>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export function NumberDetailsModal({ record, onClose, onSave, onDelete }: NumberDetailsModalProps) {
  const [copied, setCopied] = useState(false);
  const [presets, setPresets] = useState<ResponsePreset[]>([]);

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
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UpdateNumberValues>({
    resolver: zodResolver(updateNumberSchema),
    defaultValues: {
      name: "",
      place: "",
      includedIn: "",
      lastResponse: "",
      callStatus: "unknown",
      lastContactedAt: "",
    },
  });

  useEffect(() => {
    if (!record) return;
    let alive = true;
    reset({
      name: record.name || "",
      place: record.place || "",
      includedIn: record.includedIn || "",
      lastResponse: record.lastResponse || "",
      callStatus: record.callStatus ?? "unknown",
      lastContactedAt: record.lastContactedAt
        ? new Date(
            new Date(record.lastContactedAt).getTime() -
              new Date(record.lastContactedAt).getTimezoneOffset() * 60000
          )
            .toISOString()
            .slice(0, 16)
        : "",
    });
    fetch("/api/presets", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { presets: [] }))
      .then((data) => {
        if (alive) setPresets(data.presets ?? []);
      })
      .catch(() => setPresets([]));
    return () => {
      alive = false;
    };
  }, [record, reset]);

  const onSubmit = async (values: UpdateNumberValues) => {
    if (!record) return;
    const data: Record<string, unknown> = {
      callStatus: values.callStatus ?? record.callStatus,
      name: values.name || undefined,
      place: values.place || undefined,
      includedIn: values.includedIn || undefined,
      lastResponse: values.lastResponse || undefined,
      lastContactedAt: new Date().toISOString(),
    };
    const ok = await onSave(record._id, data);
    if (ok) onClose();
  };

  return (
    <Dialog
      open={record !== null}
      onClose={onClose}
      title={
        record ? formatPhoneNumber(record.normalizedPhoneNumber) : undefined
      }
      maxWidth="md"
      mobileFullHeight>
      {(close) => (
        <div className="flex flex-col gap-3.5 px-5 py-4 sm:gap-4 sm:px-6 sm:py-5">
          {record && (
            <div className="flex items-center justify-between gap-2">
              <div
                className="flex size-9 items-center justify-center rounded-lg"
                style={{ background: "var(--surface-hover)" }}>
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
            <div className="flex w-full gap-2">
              <a
                href={`tel:${record.normalizedPhoneNumber}`}
                aria-label="Call"
                title="Call"
                className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
                style={{
                  background: "var(--glass-strong)",
                  color: "var(--foreground)",
                  border: "1px solid var(--glass-border)",
                }}>
                <Phone className="size-4" aria-hidden />
              </a>
              <a
                href={`https://wa.me/${record.normalizedPhoneNumber.replace("+", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                title="WhatsApp"
                className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
                style={{
                  background: "var(--glass-strong)",
                  color: "var(--foreground)",
                  border: "1px solid var(--glass-border)",
                }}>
                <MessageCircle className="size-4" aria-hidden />
              </a>
              <button
                type="button"
                onClick={() => record && downloadVCard(record)}
                aria-label="Save contact"
                title="Save contact"
                className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
                style={{
                  background: "var(--glass-strong)",
                  color: "var(--foreground)",
                  border: "1px solid var(--glass-border)",
                }}>
                <UserPlus className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={copyNumber}
                aria-label="Copy number"
                title="Copy number"
                className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
                style={{
                  background: "var(--glass-strong)",
                  color: "var(--foreground)",
                  border: "1px solid var(--glass-border)",
                }}>
                {copied ? (
                  <Check className="size-4" aria-hidden />
                ) : (
                  <Copy className="size-4" aria-hidden />
                )}
              </button>
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Name"
                placeholder="Full name"
                error={errors.name?.message}
                {...register("name")}
              />
              <Input
                label="Place"
                placeholder="City / area"
                error={errors.place?.message}
                {...register("place")}
              />
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
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    Call status
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {CALL_STATUSES.map((status) => {
                      const active = field.value === status;
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => field.onChange(status)}
                          className="rounded-lg px-2 py-1.5 text-xs font-medium transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
                          style={{
                            background: active
                              ? "rgba(99,102,241,0.15)"
                              : "var(--surface-hover)",
                            border: active
                              ? "1px solid rgba(99,102,241,0.5)"
                              : "1px solid var(--glass-border)",
                            color: "var(--foreground)",
                          }}
                          aria-pressed={active}>
                          {STATUS_LABELS[status]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            />

            <Input
              label="Last response"
              placeholder="What did they say?"
              error={errors.lastResponse?.message}
              {...register("lastResponse")}
            />

            {presets.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => setValue("lastResponse", p.text)}
                    className="rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-[var(--surface-hover)]"
                    style={{
                      borderColor: "var(--glass-border)",
                      color: "var(--muted)",
                    }}>
                    {p.text}
                  </button>
                ))}
              </div>
            )}

            <Input
              label="Last contacted at"
              type="datetime-local"
              {...register("lastContactedAt")}
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="secondary"
                size="md"
                type="button"
                onClick={close}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                loading={isSubmitting}>
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      )}
    </Dialog>
  );
}