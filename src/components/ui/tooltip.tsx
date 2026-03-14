import { type ReactNode } from "react";

interface TooltipProps {
  content: string;
  position?: "top" | "bottom";
  children: ReactNode;
  className?: string;
}

export function Tooltip({
  content,
  position = "top",
  children,
  className = "",
}: TooltipProps) {
  const positionClasses =
    position === "top"
      ? "bottom-full mb-2 left-1/2 -translate-x-1/2"
      : "top-full mt-2 left-1/2 -translate-x-1/2";

  return (
    <div className={`group relative inline-flex ${className}`}>
      {children}
      <span
        className={`pointer-events-none absolute ${positionClasses} z-50 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background opacity-0 transition-opacity group-hover:opacity-100`}
      >
        {content}
      </span>
    </div>
  );
}
