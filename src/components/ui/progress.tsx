interface ProgressProps {
  value: number;
  showLabel?: boolean;
  className?: string;
}

export function Progress({ value, showLabel = false, className = "" }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border-subtle)]"
      >
        <div
          className="progress-shimmer-once h-full rounded-full transition-all duration-300"
          style={{
            width: `${clamped}%`,
            background: `linear-gradient(90deg, var(--accent-light), var(--accent-terracotta))`,
          }}
        />
      </div>
      {showLabel && (
        <span className="w-8 text-right font-mono text-xs text-text-tertiary">
          {clamped}%
        </span>
      )}
    </div>
  );
}
