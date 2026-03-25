import { type HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  clickable?: boolean;
  padding?: "sm" | "md" | "lg";
}

const paddingClasses = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export function Card({
  clickable = false,
  padding = "md",
  className = "",
  children,
  onClick,
  ...props
}: CardProps) {
  const isClickable = clickable || Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={`rounded-xl bg-card ${paddingClasses[padding]} ${
        isClickable
          ? "cursor-pointer transition-all"
          : ""
      } ${className}`}
      style={{ border: "1px solid var(--border-subtle)" }}
      onMouseEnter={isClickable ? (e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent-terracotta)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(160,80,40,0.10)";
      } : undefined}
      onMouseLeave={isClickable ? (e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "";
      } : undefined}
      {...props}
    >
      {children}
    </div>
  );
}
