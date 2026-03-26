"use client"

import { useState, useEffect, useMemo } from "react"
import { findServiceById } from "@/data/subscriptionServices"

interface ServiceAvatarProps {
  name: string
  icon: string
  color: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
  /** Stored logo URL or base64 (manual upload or auto-fetched) — highest priority */
  iconUrl?: string | null
  /** Subscription URL for auto-favicon fallback when no iconUrl and no predefined icon */
  url?: string | null
}

const SIZES = {
  xs: { container: 'h-5 w-5', icon: 12, text: 'text-[8px]', rounded: 'rounded-lg' },
  sm: { container: 'h-8 w-8', icon: 18, text: 'text-xs', rounded: 'rounded-xl' },
  md: { container: 'h-10 w-10', icon: 22, text: 'text-sm', rounded: 'rounded-xl' },
  lg: { container: 'h-12 w-12', icon: 28, text: 'text-base', rounded: 'rounded-xl' },
}

function getFaviconUrl(url: string): string | null {
  try {
    const domain = new URL(url).hostname
    if (!domain) return null
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
  } catch {
    return null
  }
}

export function ServiceAvatar({ name, icon, color, size = 'sm', className = '', iconUrl, url }: ServiceAvatarProps) {
  const sizeConfig = SIZES[size]
  const service = findServiceById(icon)
  const IconComponent = service?.icon
  const isDark = service?.darkIcon === true

  // Compute favicon URL from subscription url if no stored iconUrl and no predefined icon
  const faviconUrl = useMemo(() => {
    if (iconUrl) return null
    if (IconComponent) return null
    if (!url) return null
    return getFaviconUrl(url)
  }, [iconUrl, IconComponent, url])

  // Primary image source: stored iconUrl > favicon
  const primaryImg = iconUrl ?? faviconUrl

  // Track if the image fails to load so we can fall back to next priority
  const [imgError, setImgError] = useState(false)
  useEffect(() => { setImgError(false) }, [primaryImg])

  return (
    <div
      className={`relative overflow-hidden group/avatar flex flex-shrink-0 items-center justify-center ${sizeConfig.container} ${sizeConfig.rounded} ${className}`}
      style={{
        background: isDark
          ? `linear-gradient(135deg, ${color}, ${color}dd)`
          : primaryImg && !imgError
            ? `linear-gradient(135deg, ${color}10, ${color}06)`
            : `linear-gradient(135deg, ${color}28, ${color}12)`,
        border: `1px solid ${color}2A`,
        boxShadow: (!primaryImg || imgError) && !IconComponent ? `inset 0 1px 2px rgba(0,0,0,0.06)` : undefined,
      }}
      title={name}
    >
      {/* Shimmer overlay */}
      <div
        className="absolute inset-0 -translate-x-full group-hover/avatar:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
        style={{ transitionProperty: 'transform', transitionDuration: '600ms' }}
      />

      {/* Priority: stored/favicon img > predefined service icon > letter */}
      {primaryImg && !imgError ? (
        <img
          src={primaryImg}
          alt={name}
          onError={() => setImgError(true)}
          className="h-full w-full object-contain rounded-inherit"
          style={{ padding: sizeConfig.icon > 20 ? '3px' : '2px' }}
        />
      ) : IconComponent ? (
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
