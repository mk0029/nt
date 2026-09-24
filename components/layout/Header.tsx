"use client";

import { useRouter } from "next/navigation";
import { Phone, Plus, Settings, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface HeaderProps {
  onImport: () => void;
  isAdmin?: boolean;
  hideImport?: boolean;
}

export function Header({
  onImport,
  isAdmin = false,
  hideImport = false,
}: HeaderProps) {
  const router = useRouter();

  return (
    <header
      className="sticky top-0 z-40 w-full border-b backdrop-blur-xl"
      style={{
        background: "var(--glass-strong)",
        borderColor: "var(--glass-border)",
      }}
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-3 sm:h-16 sm:px-4">
        <div className="flex items-center gap-2">
          <div
            className="flex size-7 items-center justify-center rounded-lg sm:size-8"
            style={{
              background: "rgba(99,102,241,0.2)",
              border: "1px solid rgba(99,102,241,0.3)",
            }}
          >
            <Phone className="size-3.5 text-indigo-500 sm:size-4" />
          </div>
          <span className="text-sm font-semibold sm:text-base" style={{ color: "var(--foreground)" }}>
            Number<span className="text-indigo-500"> Response Tracker</span>
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => router.push("/settings")}
            aria-label="Settings"
            className="size-9 sm:size-10">
            <Settings className="size-4" aria-hidden />
          </Button>
          {isAdmin && (
            <Button
              variant="secondary"
              size="icon"
              onClick={() => router.push("/admin")}
              aria-label="Admin panel"
              className="size-9 sm:size-10"
            >
              <Shield className="size-4" aria-hidden />
            </Button>
          )}

          {!hideImport && (
            <Button
              variant="primary"
              size="sm"
              onClick={onImport}
              aria-label="Import numbers"
              className="px-2 sm:gap-1.5 sm:px-3.5">
              <Plus className="size-4" aria-hidden />
              <span className="hidden sm:inline">Import Numbers</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}