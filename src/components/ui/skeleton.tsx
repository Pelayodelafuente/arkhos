import { type HTMLAttributes } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  rounded?: "sm" | "md" | "lg" | "full";
}

const roundedClasses = {
  sm: "rounded",
  md: "rounded-md",
  lg: "rounded-xl",
  full: "rounded-full",
};

export function Skeleton({
  rounded = "md",
  className = "",
  ...props
}: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-surface-2 ${roundedClasses[rounded]} ${className}`}
      {...props}
    />
  );
}
