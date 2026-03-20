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
  xs: { container: 'h-5 w-5', icon: 12, text: 'text-[8px]', rounded: 'rounded' },
  sm: { container: 'h-8 w-8', icon: 18, text: 'text-xs', rounded: 'rounded-lg' },
  md: { container: 'h-10 w-10', icon: 22, text: 'text-sm', rounded: 'rounded-lg' },
  lg: { container: 'h-12 w-12', icon: 28, text: 'text-base', rounded: 'rounded-xl' },
}

export function ServiceAvatar({ name, icon, color, size = 'sm', className = '' }: ServiceAvatarProps) {
  const sizeConfig = SIZES[size]
  const service = findServiceById(icon)
  const IconComponent = service?.icon

  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center ${sizeConfig.container} ${sizeConfig.rounded} ${className}`}
      style={{ backgroundColor: `${color}15`, border: `1px solid ${color}20` }}
      title={name}
    >
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
