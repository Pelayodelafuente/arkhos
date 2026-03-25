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
          ? "cursor-pointer transition-all hover:[box-shadow:0_4px_20px_rgba(160,80,40,0.10)] hover:[border-color:var(--border-accent)]"
          : ""
      } ${className}`}
      style={{ border: "1px solid var(--border-subtle)" }}
      {...props}
    >
      {children}
    </div>
  );
}
