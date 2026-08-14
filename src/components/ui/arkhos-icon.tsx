interface ArkhosIconProps {
  size?: number;
  className?: string;
  /** Color del trazo. Por defecto el terracota de marca; el login lo sobreescribe con el cobre del tema oscuro. */
  color?: string;
  style?: React.CSSProperties;
}

/**
 * Logo oficial de Arkhos — fuente única de la marca.
 * Debe coincidir siempre con `public/favicon.svg` y `public/icons/icon-*.svg`.
 */
export function ArkhosIcon({
  size = 32,
  className,
  color = "var(--accent-terracotta)",
  style,
}: ArkhosIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      {/* A shape */}
      <path
        d="M36 6 L6 62 L18 62 L36 26 L54 62 L66 62 Z"
        stroke={color}
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
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Subtle horizontal bar */}
      <line
        x1="21"
        y1="38"
        x2="51"
        y2="38"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.5"
      />
      {/* Vertex dot */}
      <circle cx="36" cy="18" r="2.5" fill={color} opacity="0.7" />
    </svg>
  );
}
