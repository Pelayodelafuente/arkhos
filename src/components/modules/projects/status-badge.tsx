"use client";

import { PROJECT_STATUS_CONFIG, type ProjectStatus } from "@/types/projects";

interface StatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = PROJECT_STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
      style={{
        backgroundColor: `${config.color}14`,
        color: config.color,
      }}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "active" ? "animate-pulse" : ""
        }`}
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </span>
  );
}
