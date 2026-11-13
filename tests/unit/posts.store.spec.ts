import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_LENGTH, MAX_POSTS, STORAGE_KEY } from '@/lib/constants'
import { usePostsStore } from '@/stores/posts'
import type { Post } from '@/types'

function seedPosts(posts: Post[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(posts))
}

function buildPost(id: string, createdAt: number, text = `记录 ${id}`): Post {
  return { id, text, createdAt }
}

beforeEach(() => {
  setActivePinia(createPinia())
  window.localStorage.clear()
})

describe('usePostsStore 初始状态', () => {
  it('未加载数据时为空列表', () => {
    const store = usePostsStore()
    expect(store.posts).toEqual([])
    expect(store.count).toBe(0)
    expect(store.lastError).toBeNull()
  })
})

describe('publish', () => {
  it('发布纯文本并去除首尾空白', () => {
    const store = usePostsStore()
    const result = store.publish('  今天的第一条记录  ')

    expect(result.ok).toBe(true)
    expect(store.posts).toHaveLength(1)
    expect(store.posts[0]?.text).toBe('今天的第一条记录')
    expect(typeof store.posts[0]?.id).toBe('string')
    expect(typeof store.posts[0]?.createdAt).toBe('number')
  })

  it('拒绝空内容与全空白内容', () => {
    const store = usePostsStore()

    expect(store.publish('')).toEqual({ ok: false, reason: 'empty' })
    expect(store.publish('    \n  ')).toEqual({ ok: false, reason: 'empty' })
    expect(store.posts).toHaveLength(0)
  })

  it('拒绝超过字数上限的内容', () => {
    const store = usePostsStore()

    expect(store.publish('字'.repeat(MAX_LENGTH + 1))).toEqual({ ok: false, reason: 'too-long' })
    expect(store.publish('字'.repeat(MAX_LENGTH)).ok).toBe(true)
  })

  it('发布后立即写入 localStorage', () => {
    const store = usePostsStore()
    store.publish('持久化内容')

    const raw = window.localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    const saved = JSON.parse(raw as string) as Post[]
    expect(saved).toHaveLength(1)
    expect(saved[0]?.text).toBe('持久化内容')
  })

  it('新内容排在最前（倒序）', () => {
    vi.useFakeTimers()
    try {
      const store = usePostsStore()
      vi.setSystemTime(new Date('2026-11-13T10:00:00+08:00'))
      store.publish('较早的内容')
      vi.setSystemTime(new Date('2026-11-13T10:05:00+08:00'))
      store.publish('较新的内容')

      expect(store.posts.map((post) => post.text)).toEqual(['较新的内容', '较早的内容'])
    } finally {
      vi.useRealTimers()
    }
  })

  it('达到容量上限后丢弃最旧的一条', () => {
    const existing = Array.from({ length: MAX_POSTS }, (_, index) =>
      buildPost(`post-${index}`, 1_000 + index),
    ).reverse()
    seedPosts(existing)

    const store = usePostsStore()
    store.hydrate()
    expect(store.posts).toHaveLength(MAX_POSTS)

    store.publish('超出上限的最新内容')

    expect(store.posts).toHaveLength(MAX_POSTS)
    expect(store.posts[0]?.text).toBe('超出上限的最新内容')
    expect(store.posts.some((post) => post.id === 'post-0')).toBe(false)
  })

  it('落盘失败时不更新内存并记录错误', () => {
    const store = usePostsStore()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    const result = store.publish('无法保存的内容')

    expect(result).toEqual({ ok: false, reason: 'storage' })
    expect(store.posts).toHaveLength(0)
    expect(store.lastError).toBeTruthy()
    consoleSpy.mockRestore()
  })
})

describe('hydrate', () => {
  it('从 localStorage 恢复并按时间倒序', () => {
    seedPosts([
      buildPost('old', 100),
      buildPost('new', 300),
      buildPost('middle', 200),
    ])

    const store = usePostsStore()
    store.hydrate()

    expect(store.posts.map((post) => post.id)).toEqual(['new', 'middle', 'old'])
    expect(store.count).toBe(3)
  })

  it('数据损坏时安全回退为空列表', () => {
    window.localStorage.setItem(STORAGE_KEY, '{ broken json')
    const store = usePostsStore()

    store.hydrate()
    expect(store.posts).toEqual([])
  })
})
