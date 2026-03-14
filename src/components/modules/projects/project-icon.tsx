"use client";

import {
  Globe,
  Terminal,
  Zap,
  Smartphone,
  Code,
  Pen,
  Box,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";

const ICON_MAP: Record<string, ComponentType<LucideProps>> = {
  Globe,
  Terminal,
  Zap,
  Smartphone,
  Code,
  Pen,
  Box,
};

interface ProjectIconProps {
  icon: string;
  size?: number;
  className?: string;
}

export function ProjectIcon({ icon, size = 18, className }: ProjectIconProps) {
  const IconComponent = ICON_MAP[icon] ?? Box;
  return <IconComponent size={size} strokeWidth={1.75} className={className} />;
}
