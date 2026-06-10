'use client'

import { useId } from 'react'

interface DashboardSparklineProps {
  data: number[]
  color: string
  width?: number
  height?: number
}

export function DashboardSparkline({
  data,
  color,
  width = 72,
  height = 28,
}: DashboardSparklineProps) {
  const gradientId = useId()

  if (data.length < 2) {
    return <svg width={width} height={height} aria-hidden="true" />
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  })

  const pathD = `M ${points.join(' L ')}`

  const lastVal = data[data.length - 1]
  const lastY = height - ((lastVal - min) / range) * (height - 4) - 2

  const areaD = `M 0,${height} L ${pathD.slice(2)} L ${width},${height} Z`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className="flex-shrink-0"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradientId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(data.length - 1) / (data.length - 1) * width} cy={lastY} r="2" fill={color} />
    </svg>
  )
}
