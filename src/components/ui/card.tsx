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
      className={`rounded-xl border border-border bg-card ${paddingClasses[padding]} ${
        isClickable
          ? "cursor-pointer transition-colors hover:border-accent"
          : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
