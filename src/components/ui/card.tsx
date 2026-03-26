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
      className={`rounded-2xl bg-card shadow-[var(--shadow-card)] ${paddingClasses[padding]} ${
        isClickable
          ? "cursor-pointer transition-all duration-300 ease-out hover:shadow-[var(--shadow-md)] hover:-translate-y-[3px] hover:[border-color:var(--border-accent)]"
          : ""
      } ${className}`}
      style={{ border: "1px solid var(--border-subtle)" }}
      {...props}
    >
      {children}
    </div>
  );
}
