import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_LENGTH, MAX_POSTS } from '@/lib/constants'
import { usePostsStore } from '@/stores/posts'
import type { Post } from '@/types'
import { installFakeApi } from '../helpers/fake-api'
import type { FakeApi } from '../helpers/fake-api'

let fake: FakeApi

function buildPost(id: string, createdAt: number, text = `记录 ${id}`): Post {
  return { id, text, createdAt }
}

function postRequests() {
  return fake.requests().filter((request) => request.method === 'POST')
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
