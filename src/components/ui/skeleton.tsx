import { type HTMLAttributes } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  rounded?: "sm" | "md" | "lg" | "full";
}

const roundedClasses = {
  sm: "rounded",
  md: "rounded-xl",
  lg: "rounded-xl",
  full: "rounded-full",
};

export function Skeleton({
  rounded = "md",
  className = "",
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={`${roundedClasses[rounded]} ${className}`}
      style={{
        background: 'linear-gradient(90deg, var(--bg-sand) 0%, var(--bg-card) 50%, var(--bg-sand) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer-pass 1.8s linear infinite',
        ...style,
      }}
      {...props}
    />
  );
}
