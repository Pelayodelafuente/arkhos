"use client";

import {
  // Desarrollo
  Code, Terminal, Cpu, Database, Globe, Server, GitBranch,
  Package, Layers, Braces, FileCode, Webhook, MonitorSmartphone,
  Bug, Binary,
  // Diseño
  Pen, Palette, Layout, Frame, Crop, Wand2, Paintbrush,
  Shapes, Pencil, PenTool, Brush, Pipette, Ratio, Grid3x3,
  Figma,
  // Negocio
  Briefcase, Building2, ChartBar, Target, Users, Handshake,
  LineChart, PieChart, Presentation, DollarSign, TrendingUp,
  BadgeDollarSign, Store, Scale, Megaphone,
  // Personal
  BookOpen, Camera, Music, Heart, Star, Rocket, Lightbulb,
  Trophy, Compass, Map, Bike, Dumbbell, Gamepad2, Headphones,
  GraduationCap,
  // Otros
  Box, Folder, Archive, Zap, Shield, Lock, Bell, Settings,
  Wrench, Cog, Key, Plug, Wifi, Cloud, Download,
  // Extra (used elsewhere)
  Smartphone,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";

export const ICON_MAP: Record<string, ComponentType<LucideProps>> = {
  // Desarrollo
  Code, Terminal, Cpu, Database, Globe, Server, GitBranch,
  Package, Layers, Braces, FileCode, Webhook, MonitorSmartphone,
  Bug, Binary,
  // Diseño
  Pen, Palette, Layout, Frame, Crop, Wand2, Paintbrush,
  Shapes, Pencil, PenTool, Brush, Pipette, Ratio, Grid3x3,
  Figma,
  // Negocio
  Briefcase, Building2, ChartBar, Target, Users, Handshake,
  LineChart, PieChart, Presentation, DollarSign, TrendingUp,
  BadgeDollarSign, Store, Scale, Megaphone,
  // Personal
  BookOpen, Camera, Music, Heart, Star, Rocket, Lightbulb,
  Trophy, Compass, Map, Bike, Dumbbell, Gamepad2, Headphones,
  GraduationCap,
  // Otros
  Box, Folder, Archive, Zap, Shield, Lock, Bell, Settings,
  Wrench, Cog, Key, Plug, Wifi, Cloud, Download,
  // Extra
  Smartphone,
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
