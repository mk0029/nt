"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { CallStatus } from "@/types/number";
import { cn } from "@/lib/utils";

const STATUS_META: Record<CallStatus, { label: string; color: string }> = {
  accepted: { label: "Accepted", color: "#10b981" },
  not_accepted: { label: "Not accepted", color: "#f59e0b" },
  declined: { label: "Declined", color: "#ef4444" },
  unknown: { label: "Unknown", color: "#6b7280" },
};

export function StatusPill({ status }: { status: CallStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
      style={{ background: `${meta.color}1a`, color: meta.color }}>
      <span
        className="size-1.5 rounded-full "
        style={{ background: meta.color }}
      />
      <span className="hidden md:inline-block">{meta.label}</span>
    </span>
  );
}

interface StatusSwitchProps {
  status: CallStatus;
  onChange: (status: CallStatus) => void;
  disabled?: boolean;
  className?: string;
}

const ORDER: CallStatus[] = ["unknown", "not_accepted", "accepted", "declined"];

export function StatusSwitch({
  status,
  onChange,
  disabled,
  className,
}: StatusSwitchProps) {
  const [pressed, setPressed] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    const next = ORDER[(ORDER.indexOf(status) + 1) % ORDER.length];
    setPressed(true);
    setTimeout(() => setPressed(false), 200);
    onChange(next);
  };

  return (
    <div className={cn("inline-flex", className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={`Current: ${STATUS_META[status].label}. Click to mark ${ORDER[(ORDER.indexOf(status) + 1) % ORDER.length].replace("_", " ")}`}
        title={`${STATUS_META[status].label} — click to mark ${ORDER[(ORDER.indexOf(status) + 1) % ORDER.length].replace("_", " ")}`}
        className="inline-flex items-center gap-0.5 rounded-full p-0.5 transition-transform disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          background: "var(--surface-hover)",
          border: "1px solid var(--glass-border)",
        }}>
        {ORDER.map((opt, i) => {
          const meta = STATUS_META[opt];
          const active = opt === status;
          return (
            <motion.span
              key={opt}
              className={cn(
                "relative flex size-5 items-center justify-center rounded-full md:size-6",
                i < ORDER.indexOf(status) && "opacity-60",
              )}
              animate={active ? { scale: pressed ? 0.85 : 1.1 } : { scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              style={{ background: active ? meta.color : "transparent" }}>
              <span
                className="size-2 rounded-full"
                style={{
                  background: active ? "#fff" : meta.color,
                  opacity: active ? 1 : 0.6,
                }}
              />
            </motion.span>
          );
        })}
      </button>
    </div>
  );
}
