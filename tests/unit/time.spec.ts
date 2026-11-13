import { describe, expect, it } from 'vitest'
import { formatRelativeTime } from '@/lib/time'

const NOW = new Date('2026-11-13T12:00:00+08:00').getTime()
const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function formatAgo(delta: number): string {
  return formatRelativeTime(NOW - delta, NOW)
}

describe('formatRelativeTime', () => {
  it('不足一分钟显示“刚刚”', () => {
    expect(formatAgo(0)).toBe('刚刚')
    expect(formatAgo(59 * SECOND)).toBe('刚刚')
  })

  it('未来时间也归为“刚刚”', () => {
    expect(formatAgo(-5 * SECOND)).toBe('刚刚')
  })

  it('不足一小时显示分钟', () => {
    expect(formatAgo(MINUTE)).toBe('1 分钟前')
    expect(formatAgo(59 * MINUTE)).toBe('59 分钟前')
  })

  it('不足一天显示小时', () => {
    expect(formatAgo(HOUR)).toBe('1 小时前')
    expect(formatAgo(23 * HOUR)).toBe('23 小时前')
  })

  it('不足七天显示天数', () => {
    expect(formatAgo(DAY)).toBe('1 天前')
    expect(formatAgo(6 * DAY)).toBe('6 天前')
  })

  it('同年超过七天显示月-日', () => {
    expect(formatAgo(8 * DAY)).toBe('11-05')
  })

  it('跨年显示完整年月日', () => {
    expect(formatAgo(365 * DAY)).toBe('2025-11-13')
  })

  it('月份与日期补零', () => {
    expect(formatRelativeTime(new Date('2026-01-02T08:00:00+08:00').getTime(), NOW)).toBe('01-02')
  })
})
