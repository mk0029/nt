"use client";

import { useEffect, useRef } from "react";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { Hash, CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import type { NumberStats } from "@/types/number";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/Skeleton";

interface StatItem {
  key: keyof NumberStats;
  label: string;
  icon: React.ReactNode;
  color: string;
}

export const STAT_ITEMS: StatItem[] = [
  { key: "total", label: "Total Numbers", icon: <Hash className="size-4" />, color: "#8b5cf6" },
  { key: "accepted", label: "Accepted", icon: <CheckCircle2 className="size-4" />, color: "#10b981" },
  { key: "notAccepted", label: "Not Accepted", icon: <XCircle className="size-4" />, color: "#f59e0b" },
  { key: "declined", label: "Declined", icon: <XCircle className="size-4" />, color: "#ef4444" },
  { key: "unknown", label: "Unknown", icon: <HelpCircle className="size-4" />, color: "#6b7280" },
];

function AnimatedCounter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { duration: 800 });

  useEffect(() => {
    if (inView) mv.set(value);
    else mv.set(0);
  }, [inView, mv, value]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (latest) => {
      if (ref.current) ref.current.textContent = Math.round(latest).toLocaleString();
    });
    return unsubscribe;
  }, [spring]);

  return <span ref={ref} aria-label={value.toLocaleString()} />;
}

export function NumberStats({ stats, loading }: { stats: NumberStats; loading?: boolean }) {
  if (loading) {
    return (
<div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {STAT_ITEMS.map((item) => (
          <GlassCard key={item.key} className="p-4">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </GlassCard>
        ))}
      </div>
    );
  }

  return (
<div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {STAT_ITEMS.map((item) => (
          <GlassCard key={item.key} className="p-4">
          <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--muted)" }}>
            <span style={{ color: item.color }}>{item.icon}</span>
            {item.label}
          </div>
          <motion.div
            key={stats[item.key]}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-2 text-xl font-bold sm:text-2xl"
            style={{ color: item.color }}
          >
            <AnimatedCounter value={stats[item.key]} />
          </motion.div>
        </GlassCard>
      ))}
    </div>
  );
}