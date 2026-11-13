const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

/** 超过一周时展示日期：同年省略年份 */
export function formatPostDate(timestamp: number, now: number = Date.now()): string {
  const date = new Date(timestamp)
  const full = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

  return date.getFullYear() === new Date(now).getFullYear() ? full.slice(5) : full
}

/** 相对时间：刚刚 / n 分钟前 / n 小时前 / n 天前 / 日期 */
export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - timestamp)

  if (diff < MINUTE) return '刚刚'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} 分钟前`
  if (diff < DAY) return `${Math.floor(diff / HOUR)} 小时前`
  if (diff < WEEK) return `${Math.floor(diff / DAY)} 天前`

  return formatPostDate(timestamp, now)
}
