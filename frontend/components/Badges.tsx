"use client";

import { CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react";

const STATUS_CONFIG = {
  VERIFIED: { label: "Verified", Icon: CheckCircle, cls: "status-verified" },
  PENDING:  { label: "Pending",  Icon: Clock,       cls: "status-pending"  },
  DISPUTED: { label: "Disputed", Icon: AlertCircle, cls: "status-disputed" },
  CLOSED:   { label: "Closed",   Icon: XCircle,     cls: "status-closed"   },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

export function StatusBadge({ status }: { status: string }) {
  const key = (status?.toUpperCase() as StatusKey) ?? "PENDING";
  const cfg = STATUS_CONFIG[key] ?? STATUS_CONFIG.PENDING;
  const { label, Icon, cls } = cfg;

  return (
    <span
      className={cls}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 10px",
        borderRadius: "20px",
        fontSize: "0.75rem",
        fontWeight: 600,
        letterSpacing: "0.01em",
      }}
    >
      <Icon size={12} />
      {label}
    </span>
  );
}

const SEVERITY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  low:      { bg: "#f0fdf4", text: "#166534", dot: "#22c55e" },
  medium:   { bg: "#fffbeb", text: "#92400e", dot: "#f59e0b" },
  high:     { bg: "#fef2f2", text: "#991b1b", dot: "#ef4444" },
  critical: { bg: "#f5f3ff", text: "#5b21b6", dot: "#7c3aed" },
};

export function SeverityBadge({ severity }: { severity: string }) {
  const key = severity?.toLowerCase() ?? "low";
  const c = SEVERITY_COLORS[key] ?? SEVERITY_COLORS.low;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "3px 10px",
        borderRadius: "20px",
        fontSize: "0.75rem",
        fontWeight: 600,
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.dot}33`,
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: c.dot,
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      {severity ? severity.charAt(0).toUpperCase() + severity.slice(1) : "Unknown"}
    </span>
  );
}
