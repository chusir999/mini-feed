import { describe, expect, it, vi } from 'vitest'
import { MAX_POSTS, STORAGE_KEY } from '@/lib/constants'
import { loadPosts, savePosts } from '@/lib/storage'
import type { StorageLike } from '@/lib/storage'
import type { Post } from '@/types'

function createMemoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (key: string) => (data.has(key) ? (data.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
  }
}

function createPost(overrides: Partial<Post> = {}): Post {
  return {
    id: overrides.id ?? 'post-1',
    text: overrides.text ?? '一条记录',
    createdAt: overrides.createdAt ?? 1_700_000_000_000,
  }
}

describe('loadPosts', () => {
  it('没有数据时返回空数组', () => {
    expect(loadPosts(createMemoryStorage())).toEqual([])
  })

  it('无法解析的 JSON 返回空数组而不抛错', () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: '{ not json' })
    expect(loadPosts(storage)).toEqual([])
  })

  it('顶层不是数组时返回空数组', () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: '{"posts":[]}' })
    expect(loadPosts(storage)).toEqual([])
  })

  it('过滤字段缺失或类型错误的脏条目', () => {
    const storage = createMemoryStorage({
      [STORAGE_KEY]: JSON.stringify([
        createPost({ id: 'keep-1' }),
        { id: 'no-text', createdAt: 1 },
        { id: 42, text: 'id 类型错误', createdAt: 1 },
        { id: 'no-created-at', text: '缺时间' },
        { id: 'bad-created-at', text: '时间非数字', createdAt: 'yesterday' },
        null,
        'not-an-object',
      ]),
    })

    const posts = loadPosts(storage)
    expect(posts).toHaveLength(1)
    expect(posts[0]?.id).toBe('keep-1')
  })

  it('按创建时间倒序返回', () => {
    const storage = createMemoryStorage({
      [STORAGE_KEY]: JSON.stringify([
        createPost({ id: 'old', createdAt: 100 }),
        createPost({ id: 'new', createdAt: 300 }),
        createPost({ id: 'middle', createdAt: 200 }),
      ]),
    })

    expect(loadPosts(storage).map((post) => post.id)).toEqual(['new', 'middle', 'old'])
  })

  it('最多返回 MAX_POSTS 条（最新的优先）', () => {
    const many = Array.from({ length: MAX_POSTS + 20 }, (_, index) =>
      createPost({ id: `post-${index}`, createdAt: index }),
    )
    const storage = createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(many) })

    const posts = loadPosts(storage)
    expect(posts).toHaveLength(MAX_POSTS)
    expect(posts[0]?.id).toBe(`post-${MAX_POSTS + 19}`)
  })

  it('读取 localStorage 抛错时返回空数组', () => {
    const storage: StorageLike = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => undefined,
    }
    expect(loadPosts(storage)).toEqual([])
  })
})

describe('savePosts', () => {
  it('写入成功返回 true 并序列化数据', () => {
    const storage = createMemoryStorage()
    const posts = [createPost({ id: 'a' })]

    expect(savePosts(posts, storage)).toBe(true)
    expect(JSON.parse(storage.data.get(STORAGE_KEY) as string)).toHaveLength(1)
  })

  it('超过容量上限时仅保留前 MAX_POSTS 条', () => {
    const storage = createMemoryStorage()
    const posts = Array.from({ length: MAX_POSTS + 5 }, (_, index) =>
      createPost({ id: `post-${index}`, createdAt: index }),
    )

    expect(savePosts(posts, storage)).toBe(true)
    const saved = JSON.parse(storage.data.get(STORAGE_KEY) as string) as Post[]
    expect(saved).toHaveLength(MAX_POSTS)
    expect(saved[0]?.id).toBe('post-0')
  })

  it('写入抛错时返回 false 而不是崩溃', () => {
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(savePosts([createPost()], storage)).toBe(false)
    errorSpy.mockRestore()
  })
})
