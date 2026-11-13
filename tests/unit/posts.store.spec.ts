import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_LENGTH, MAX_POSTS } from '@/lib/constants'
import { usePostsStore } from '@/stores/posts'
import type { Post } from '@/types'
import { installFakeApi } from '../helpers/fake-api'
import type { FakeApi } from '../helpers/fake-api'

let fake: FakeApi

function buildPost(
  id: string,
  createdAt: number,
  text = `记录 ${id}`,
  overrides: Partial<Post> = {},
): Post {
  return {
    id,
    text,
    createdAt,
    likeCount: 0,
    liked: false,
    favoriteCount: 0,
    favorited: false,
    ...overrides,
  }
}

function postRequests() {
  return fake.requests().filter((request) => request.method === 'POST')
}

function putRequests() {
  return fake.requests().filter((request) => request.method === 'PUT')
}

beforeEach(() => {
  setActivePinia(createPinia())
  fake = installFakeApi()
})

describe('usePostsStore 初始状态', () => {
  it('未加载数据时为空列表', () => {
    const store = usePostsStore()

    expect(store.posts).toEqual([])
    expect(store.count).toBe(0)
    expect(store.lastError).toBeNull()
    expect(store.isLoading).toBe(false)
    expect(store.isPublishing).toBe(false)
  })
})

describe('publish', () => {
  it('发布纯文本：去除首尾空白、请求后端并插入列表', async () => {
    const store = usePostsStore()
    const result = await store.publish('  今天的第一条记录  ')

    if (!result.ok) throw new Error('预期发布成功')

    expect(result.post.text).toBe('今天的第一条记录')
    expect(result.post.id).not.toBe('')
    expect(typeof result.post.createdAt).toBe('number')

    expect(store.posts).toHaveLength(1)
    expect(store.posts[0]?.text).toBe('今天的第一条记录')
    expect(store.lastError).toBeNull()

    const requests = postRequests()
    expect(requests).toHaveLength(1)
    expect(requests[0]?.url).toBe('/api/posts')
    expect(requests[0]?.body).toEqual({ text: '今天的第一条记录' })
    expect(fake.list()).toHaveLength(1)
  })

  it('本地拦截空内容与超长内容且不发请求', async () => {
    const store = usePostsStore()

    await expect(store.publish('')).resolves.toEqual({ ok: false, reason: 'empty' })
    await expect(store.publish('    \n  ')).resolves.toEqual({ ok: false, reason: 'empty' })
    await expect(store.publish('字'.repeat(MAX_LENGTH + 1))).resolves.toEqual({
      ok: false,
      reason: 'too-long',
    })

    expect(fake.requests()).toHaveLength(0)
    expect(store.posts).toHaveLength(0)
  })

  it('服务端 400 empty 映射为失败且 lastError 为可读中文', async () => {
    const store = usePostsStore()
    fake.failNext(400, 'empty', '内容不能为空')

    const result = await store.publish('服务端认为不合法的内容')

    expect(result).toEqual({ ok: false, reason: 'server' })
    expect(store.posts).toHaveLength(0)
    expect(store.lastError).toBeTruthy()
    expect(store.lastError).toContain('内容不能为空')
  })

  it('网络异常返回 server 失败并记录提示', async () => {
    const store = usePostsStore()
    fake.setMode('network-error')

    const result = await store.publish('离线时写下的内容')

    expect(result).toEqual({ ok: false, reason: 'server' })
    expect(store.posts).toHaveLength(0)
    expect(store.lastError).toContain('网络')
  })

  it('新内容排在最前（倒序）', async () => {
    const store = usePostsStore()

    await store.publish('较早的内容')
    await store.publish('较新的内容')

    expect(store.posts.map((post) => post.text)).toEqual(['较新的内容', '较早的内容'])
  })

  it('达到容量上限后丢弃最旧的一条', async () => {
    fake.seed(
      Array.from({ length: MAX_POSTS }, (_, index) => buildPost(`post-${index}`, 1_000 + index)),
    )

    const store = usePostsStore()
    await store.hydrate()
    expect(store.posts).toHaveLength(MAX_POSTS)

    await store.publish('超出上限的最新内容')

    expect(store.posts).toHaveLength(MAX_POSTS)
    expect(store.posts[0]?.text).toBe('超出上限的最新内容')
    expect(store.posts.some((post) => post.id === 'post-0')).toBe(false)
  })

  it('isPublishing 期间重复提交只发出一次请求', async () => {
    const store = usePostsStore()
    fake.hold()

    const first = store.publish('正在进行的内容')
    expect(store.isPublishing).toBe(true)

    await expect(store.publish('重复提交的内容')).resolves.toEqual({ ok: false, reason: 'server' })
    expect(postRequests()).toHaveLength(1)

    fake.release()
    const firstResult = await first

    expect(firstResult.ok).toBe(true)
    expect(store.isPublishing).toBe(false)
    expect(postRequests()).toHaveLength(1)
    expect(store.posts).toHaveLength(1)
  })
})

describe('hydrate', () => {
  it('从后端恢复并按时间倒序', async () => {
    fake.seed([buildPost('old', 100), buildPost('new', 300), buildPost('middle', 200)])

    const store = usePostsStore()
    await store.hydrate()

    expect(store.posts.map((post) => post.id)).toEqual(['new', 'middle', 'old'])
    expect(store.count).toBe(3)
    expect(store.isLoading).toBe(false)
    expect(store.lastError).toBeNull()
  })

  it('请求失败时安全回退为空列表并记录提示', async () => {
    fake.seed([buildPost('old', 100)])
    fake.setMode('server-error')

    const store = usePostsStore()
    await store.hydrate()

    expect(store.posts).toEqual([])
    expect(store.count).toBe(0)
    expect(store.isLoading).toBe(false)
    expect(store.lastError).toContain('加载失败')
  })

  it('响应结构异常时不会静默返回空数组', async () => {
    fake.setMode('malformed')

    const store = usePostsStore()
    await store.hydrate()

    expect(store.lastError).toBeTruthy()
    expect(store.posts).toEqual([])
  })
})

describe('toggleLike', () => {
  it('点赞：乐观更新计数并发起 PUT，请求体携带 liked:true', async () => {
    fake.seed([buildPost('post-1', 100)])
    const store = usePostsStore()
    await store.hydrate()

    const pending = store.toggleLike('post-1')

    expect(store.posts[0]?.liked).toBe(true)
    expect(store.posts[0]?.likeCount).toBe(1)
    expect(store.isReacting('post-1')).toBe(true)
    expect(store.pendingReactionIds).toContain('post-1')

    await expect(pending).resolves.toBe(true)

    const puts = putRequests()
    expect(puts).toHaveLength(1)
    expect(puts[0]?.url).toBe('/api/posts/post-1/like')
    expect(puts[0]?.body).toEqual({ liked: true })

    expect(store.posts[0]?.liked).toBe(true)
    expect(store.posts[0]?.likeCount).toBe(1)
    expect(store.isReacting('post-1')).toBe(false)
    expect(store.pendingReactionIds).toEqual([])
    expect(store.lastError).toBeNull()
  })

  it('取消点赞：计数回落，请求体携带 liked:false', async () => {
    fake.seed([buildPost('post-1', 100, '已点赞的记录', { likeCount: 3, liked: true })])
    const store = usePostsStore()
    await store.hydrate()

    const pending = store.toggleLike('post-1')

    expect(store.posts[0]?.liked).toBe(false)
    expect(store.posts[0]?.likeCount).toBe(2)

    await expect(pending).resolves.toBe(true)

    expect(putRequests()[0]?.body).toEqual({ liked: false })
    expect(store.posts[0]?.likeCount).toBe(2)
    expect(fake.list()[0]?.liked).toBe(false)
  })

  it('计数不会被扣成负数', async () => {
    fake.seed([buildPost('post-1', 100, '计数异常的记录', { likeCount: 0, liked: true })])
    const store = usePostsStore()
    await store.hydrate()

    await store.toggleLike('post-1')

    expect(store.posts[0]?.likeCount).toBe(0)
    expect(store.posts[0]?.liked).toBe(false)
  })

  it('未知 id 不发请求并直接返回 false', async () => {
    fake.seed([buildPost('post-1', 100)])
    const store = usePostsStore()
    await store.hydrate()

    await expect(store.toggleLike('missing')).resolves.toBe(false)

    expect(putRequests()).toHaveLength(0)
    expect(store.posts[0]?.liked).toBe(false)
  })

  it('在途期间同一 id 重复点击只发一次请求且返回 false', async () => {
    fake.seed([buildPost('post-1', 100)])
    const store = usePostsStore()
    await store.hydrate()

    fake.hold()
    const first = store.toggleLike('post-1')

    await expect(store.toggleLike('post-1')).resolves.toBe(false)
    expect(putRequests()).toHaveLength(1)
    expect(store.posts[0]?.liked).toBe(true)

    fake.release()
    await expect(first).resolves.toBe(true)

    expect(putRequests()).toHaveLength(1)
    expect(store.posts[0]?.liked).toBe(true)
    expect(store.isReacting('post-1')).toBe(false)
  })

  it('服务端失败时回滚状态并记录可读错误', async () => {
    fake.seed([buildPost('post-1', 100)])
    const store = usePostsStore()
    await store.hydrate()

    fake.failNext(500, 'internal', '服务器内部错误')

    await expect(store.toggleLike('post-1')).resolves.toBe(false)

    expect(store.posts[0]?.liked).toBe(false)
    expect(store.posts[0]?.likeCount).toBe(0)
    expect(store.isReacting('post-1')).toBe(false)
    expect(store.lastError).toContain('点赞失败')
    expect(store.lastError).toContain('服务器内部错误')
  })

  it('网络异常时回滚状态并记录可读错误', async () => {
    fake.seed([buildPost('post-1', 100)])
    const store = usePostsStore()
    await store.hydrate()

    fake.setMode('network-error')

    await expect(store.toggleLike('post-1')).resolves.toBe(false)

    expect(store.posts[0]?.liked).toBe(false)
    expect(store.lastError).toContain('点赞失败')
    expect(store.lastError).toContain('网络')
  })

  it('成功后列表顺序保持不变', async () => {
    fake.seed([
      buildPost('new', 300),
      buildPost('middle', 200),
      buildPost('old', 100),
    ])
    const store = usePostsStore()
    await store.hydrate()

    await store.toggleLike('middle')
    await store.toggleFavorite('old')

    expect(store.posts.map((post) => post.id)).toEqual(['new', 'middle', 'old'])
  })
})

describe('toggleFavorite', () => {
  it('收藏与点赞互相独立', async () => {
    fake.seed([buildPost('post-1', 100)])
    const store = usePostsStore()
    await store.hydrate()

    await store.toggleFavorite('post-1')

    expect(store.posts[0]?.favorited).toBe(true)
    expect(store.posts[0]?.favoriteCount).toBe(1)
    expect(store.posts[0]?.liked).toBe(false)
    expect(store.posts[0]?.likeCount).toBe(0)

    await store.toggleLike('post-1')

    expect(store.posts[0]?.liked).toBe(true)
    expect(store.posts[0]?.favorited).toBe(true)

    const puts = putRequests()
    expect(puts).toHaveLength(2)
    expect(puts[0]?.url).toBe('/api/posts/post-1/favorite')
    expect(puts[0]?.body).toEqual({ favorited: true })
    expect(puts[1]?.url).toBe('/api/posts/post-1/like')
    expect(puts[1]?.body).toEqual({ liked: true })
  })

  it('取消收藏：计数回落且请求体为 favorited:false', async () => {
    fake.seed([buildPost('post-1', 100, '已收藏的记录', { favoriteCount: 2, favorited: true })])
    const store = usePostsStore()
    await store.hydrate()

    await expect(store.toggleFavorite('post-1')).resolves.toBe(true)

    expect(store.posts[0]?.favorited).toBe(false)
    expect(store.posts[0]?.favoriteCount).toBe(1)
    expect(putRequests()[0]?.body).toEqual({ favorited: false })
  })

  it('失败时回滚并记录「收藏失败」', async () => {
    fake.seed([buildPost('post-1', 100)])
    const store = usePostsStore()
    await store.hydrate()

    fake.failNext(404, 'not-found', '记录不存在')

    await expect(store.toggleFavorite('post-1')).resolves.toBe(false)

    expect(store.posts[0]?.favorited).toBe(false)
    expect(store.posts[0]?.favoriteCount).toBe(0)
    expect(store.isReacting('post-1')).toBe(false)
    expect(store.lastError).toContain('收藏失败')
    expect(store.lastError).toContain('记录不存在')
  })
})
