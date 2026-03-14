import { describe, it, expect } from 'vitest'
import { formatCurrency, relativeTime } from '@/lib/utils/format'

describe('formatCurrency', () => {
  it('formats euros correctly', () => {
    const result = formatCurrency(1234.5, 'EUR')
    expect(result).toContain('1')
    expect(result).toContain('234')
    expect(result).toContain('€')
  })

  it('formats zero correctly', () => {
    const result = formatCurrency(0, 'EUR')
    expect(result).toContain('0')
    expect(result).toContain('€')
  })

  it('formats negative amounts', () => {
    const result = formatCurrency(-50, 'EUR')
    expect(result).toContain('-')
    expect(result).toContain('€')
  })

  it('formats USD correctly', () => {
    const result = formatCurrency(100, 'USD')
    expect(result).toContain('100')
  })
})

describe('relativeTime', () => {
  it('returns "ahora mismo" for very recent dates', () => {
    const now = new Date()
    expect(relativeTime(now)).toBe('ahora mismo')
  })

  it('returns minutes for dates < 1 hour ago', () => {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000)
    const result = relativeTime(thirtyMinsAgo)
    expect(result).toContain('30')
    expect(result).toContain('minuto')
  })

  it('returns singular for 1 minute ago', () => {
    const oneMinAgo = new Date(Date.now() - 61 * 1000)
    const result = relativeTime(oneMinAgo)
    expect(result).toContain('minuto')
  })

  it('returns hours for dates < 1 day ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000)
    const result = relativeTime(threeHoursAgo)
    expect(result).toContain('3')
    expect(result).toContain('hora')
  })

  it('returns days for dates < 30 days ago', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    const result = relativeTime(fiveDaysAgo)
    expect(result).toContain('5')
    expect(result).toContain('día')
  })

  it('returns formatted date for old dates', () => {
    const oldDate = new Date('2020-01-15')
    const result = relativeTime(oldDate)
    expect(result).toContain('2020')
  })
})
