interface ArkhosIconProps {
  size?: number;
  className?: string;
}

export function ArkhosIcon({ size = 32, className }: ArkhosIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* A shape */}
      <path
        d="M36 6 L6 62 L18 62 L36 26 L54 62 L66 62 Z"
        stroke="var(--accent-terracotta)"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      {/* Main horizontal bar */}
      <line
        x1="15"
        y1="48"
        x2="57"
        y2="48"
        stroke="var(--accent-terracotta)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Subtle horizontal bar */}
      <line
        x1="21"
        y1="38"
        x2="51"
        y2="38"
        stroke="var(--accent-terracotta)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.5"
      />
      {/* Vertex dot */}
      <circle cx="36" cy="18" r="2.5" fill="var(--accent-terracotta)" opacity="0.7" />
    </svg>
  );
}
