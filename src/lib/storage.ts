import type { Post } from '@/types'
import { MAX_POSTS, STORAGE_KEY } from './constants'

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

function resolveStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function isPost(value: unknown): value is Post {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<Post>

  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.text === 'string' &&
    typeof candidate.createdAt === 'number' &&
    Number.isFinite(candidate.createdAt)
  )
}

/** 读取本地记录，任何异常都退化为空列表，保证页面可用 */
export function loadPosts(storage: StorageLike | null = resolveStorage()): Post[] {
  if (!storage) return []

  let raw: string | null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return []
  }
  if (!raw) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  return parsed
    .filter(isPost)
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, MAX_POSTS)
}

/** 写入本地记录，返回是否成功，避免调用方在失败时误以为已保存 */
export function savePosts(posts: Post[], storage: StorageLike | null = resolveStorage()): boolean {
  if (!storage) {
    console.error('[minifeed] 当前环境不可用 localStorage')
    return false
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(posts.slice(0, MAX_POSTS)))
    return true
  } catch (error) {
    console.error('[minifeed] 写入 localStorage 失败', error)
    return false
  }
}
