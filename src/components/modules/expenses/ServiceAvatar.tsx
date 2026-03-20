"use client"

import type { ComponentType, SVGProps } from "react"
import { findServiceById } from "@/data/subscriptionServices"

interface ServiceAvatarProps {
  name: string
  icon: string
  color: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  xs: { container: 'h-5 w-5', icon: 12, text: 'text-[8px]', rounded: 'rounded-lg' },
  sm: { container: 'h-8 w-8', icon: 18, text: 'text-xs', rounded: 'rounded-xl' },
  md: { container: 'h-10 w-10', icon: 22, text: 'text-sm', rounded: 'rounded-xl' },
  lg: { container: 'h-12 w-12', icon: 28, text: 'text-base', rounded: 'rounded-xl' },
}

export function ServiceAvatar({ name, icon, color, size = 'sm', className = '' }: ServiceAvatarProps) {
  const sizeConfig = SIZES[size]
  const service = findServiceById(icon)
  const IconComponent = service?.icon
  const isDark = service?.darkIcon === true

  return (
    <div
      className={`relative overflow-hidden group/avatar flex flex-shrink-0 items-center justify-center ${sizeConfig.container} ${sizeConfig.rounded} ${className}`}
      style={{
        background: isDark
          ? `linear-gradient(135deg, ${color}, ${color}dd)`
          : `linear-gradient(135deg, ${color}18, ${color}08)`,
        border: `1px solid ${color}1F`,
      }}
      title={name}
    >
      {/* Shimmer overlay */}
      <div
        className="absolute inset-0 -translate-x-full group-hover/avatar:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
        style={{ transitionProperty: 'transform', transitionDuration: '600ms' }}
      />
      {IconComponent ? (
        <IconComponent width={sizeConfig.icon} height={sizeConfig.icon} />
      ) : (
        <span
          className={`font-semibold ${sizeConfig.text}`}
          style={{ color }}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  )
}
