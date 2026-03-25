"use client";

interface StatusBadgeProps {
  status: string;
  color?: string;
  className?: string;
}

export function StatusBadge({ status, color = "#9a7a5a", className = "" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
      style={{
        backgroundColor: `${color}14`,
        color: color,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {status}
    </span>
  );
}
