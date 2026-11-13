// @vitest-environment node
import type { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { MAX_LENGTH, MAX_POSTS } from '../../src/lib/constants'
import type { Post } from '../../src/types'
import { createApp } from '../../server/app'
import { createPostStore } from '../../server/store'

interface PostsResponse {
  posts: Post[]
}

interface PostResponse {
  post: Post
}

interface ErrorResponse {
  error: { code: string; message: string }
}

interface HealthResponse {
  status: string
}

function setup(): { app: Hono } {
  return { app: createApp(createPostStore()) }
}

async function postJson(app: Hono, body: unknown): Promise<Response> {
  return app.request('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function postRaw(app: Hono, body: string): Promise<Response> {
  return app.request('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
}

async function readPosts(app: Hono): Promise<Post[]> {
  const res = await app.request('/api/posts')
  const body = (await res.json()) as PostsResponse
  return body.posts
}

describe('GET /api/health', () => {
  it('返回 ok 状态', async () => {
    const { app } = setup()
    const res = await app.request('/api/health')

    expect(res.status).toBe(200)
    const body = (await res.json()) as HealthResponse
    expect(body).toEqual({ status: 'ok' })
  })
})

describe('GET /api/posts', () => {
  it('初始返回空列表', async () => {
    const { app } = setup()
    const res = await app.request('/api/posts')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ posts: [] })
  })

  it('按 createdAt 倒序返回', async () => {
    let tick = 1_000
    const app = createApp(createPostStore({ now: () => (tick += 1_000) }))
    await postJson(app, { text: '第一条' })
    await postJson(app, { text: '第二条' })
    await postJson(app, { text: '第三条' })

    const posts = await readPosts(app)
    expect(posts.map((post) => post.text)).toEqual(['第三条', '第二条', '第一条'])
    expect(posts[0].createdAt).toBeGreaterThan(posts[1].createdAt)
    expect(posts[1].createdAt).toBeGreaterThan(posts[2].createdAt)
  })

  it('同一时间戳内后写入的排在前面', async () => {
    const app = createApp(createPostStore({ now: () => 1_700_000_000_000 }))
    await postJson(app, { text: '先写' })
    await postJson(app, { text: '后写' })

    const posts = await readPosts(app)
    expect(posts.map((post) => post.text)).toEqual(['后写', '先写'])
  })
})

describe('POST /api/posts', () => {
  it('创建成功返回 201 且可在列表读到', async () => {
    const { app } = setup()
    const before = Date.now()
    const res = await postJson(app, { text: '今天也要加油' })

    expect(res.status).toBe(201)
    const body = (await res.json()) as PostResponse
    expect(typeof body.post.id).toBe('string')
    expect(body.post.id.length).toBeGreaterThan(0)
    expect(body.post.text).toBe('今天也要加油')
    expect(body.post.createdAt).toBeGreaterThanOrEqual(before)

    const posts = await readPosts(app)
    expect(posts).toHaveLength(1)
    expect(posts[0]).toEqual(body.post)
  })

  it('存储前去除首尾空白', async () => {
    const { app } = setup()
    const res = await postJson(app, { text: '   你好，微记   ' })

    expect(res.status).toBe(201)
    const body = (await res.json()) as PostResponse
    expect(body.post.text).toBe('你好，微记')

    const posts = await readPosts(app)
    expect(posts[0].text).toBe('你好，微记')
  })

  it('空字符串返回 400 empty 且不落库', async () => {
    const { app } = setup()
    const res = await postJson(app, { text: '' })

    expect(res.status).toBe(400)
    const body = (await res.json()) as ErrorResponse
    expect(body.error.code).toBe('empty')
    expect(body.error.message.length).toBeGreaterThan(0)

    expect(await readPosts(app)).toEqual([])
  })

  it('全空白字符串返回 400 empty 且不落库', async () => {
    const { app } = setup()
    const res = await postJson(app, { text: '   \n\t  ' })

    expect(res.status).toBe(400)
    const body = (await res.json()) as ErrorResponse
    expect(body.error.code).toBe('empty')

    expect(await readPosts(app)).toEqual([])
  })

  it('正好 280 字符返回 201', async () => {
    const { app } = setup()
    const text = '字'.repeat(MAX_LENGTH)
    const res = await postJson(app, { text })

    expect(res.status).toBe(201)
    const body = (await res.json()) as PostResponse
    expect(body.post.text).toBe(text)
  })

  it('281 字符返回 400 too-long 且不落库', async () => {
    const { app } = setup()
    const res = await postJson(app, { text: '字'.repeat(MAX_LENGTH + 1) })

    expect(res.status).toBe(400)
    const body = (await res.json()) as ErrorResponse
    expect(body.error.code).toBe('too-long')
    expect(body.error.message.length).toBeGreaterThan(0)

    expect(await readPosts(app)).toEqual([])
  })

  it('非法 JSON 返回 400 invalid-body', async () => {
    const { app } = setup()
    const res = await postRaw(app, '{ "text": ')

    expect(res.status).toBe(400)
    const body = (await res.json()) as ErrorResponse
    expect(body.error.code).toBe('invalid-body')
    expect(await readPosts(app)).toEqual([])
  })

  it('缺少 text 字段返回 400 invalid-body', async () => {
    const { app } = setup()
    const res = await postJson(app, { content: '跑题了' })

    expect(res.status).toBe(400)
    const body = (await res.json()) as ErrorResponse
    expect(body.error.code).toBe('invalid-body')
    expect(await readPosts(app)).toEqual([])
  })

  it('text 非字符串返回 400 invalid-body', async () => {
    const { app } = setup()
    const res = await postJson(app, { text: 42 })

    expect(res.status).toBe(400)
    const body = (await res.json()) as ErrorResponse
    expect(body.error.code).toBe('invalid-body')
    expect(await readPosts(app)).toEqual([])
  })

  it(`写入第 ${MAX_POSTS + 1} 条后仍保留 ${MAX_POSTS} 条并丢弃最旧一条`, async () => {
    let tick = 1
    let seq = 0
    const store = createPostStore({
      now: () => tick++,
      generateId: () => `id-${(seq += 1)}`,
    })
    const app = createApp(store)

    for (let index = 1; index <= MAX_POSTS + 1; index += 1) {
      const res = await postJson(app, { text: `第 ${index} 条` })
      expect(res.status).toBe(201)
    }

    expect(store.size).toBe(MAX_POSTS)
    const posts = await readPosts(app)
    expect(posts).toHaveLength(MAX_POSTS)
    expect(posts[0].text).toBe(`第 ${MAX_POSTS + 1} 条`)
    expect(posts.map((post) => post.text)).not.toContain('第 1 条')
    expect(posts[posts.length - 1].text).toBe('第 2 条')
  })
})

describe('未知 /api 路由', () => {
  it('返回 404 not-found', async () => {
    const { app } = setup()
    const res = await app.request('/api/unknown')

    expect(res.status).toBe(404)
    const body = (await res.json()) as ErrorResponse
    expect(body.error.code).toBe('not-found')
    expect(body.error.message.length).toBeGreaterThan(0)
  })

  it('未知 /api 子路径的 POST 也返回 404', async () => {
    const { app } = setup()
    const res = await postJson(app, { text: '你好' })
    expect(res.status).toBe(201)

    const missing = await app.request('/api/posts/1', { method: 'DELETE' })
    expect(missing.status).toBe(404)
    const body = (await missing.json()) as ErrorResponse
    expect(body.error.code).toBe('not-found')
  })
})

function likePath(id: string): string {
  return `/api/posts/${id}/like`
}

function favoritePath(id: string): string {
  return `/api/posts/${id}/favorite`
}

async function putJson(app: Hono, path: string, body: unknown): Promise<Response> {
  return app.request(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function putRaw(app: Hono, path: string, body: string): Promise<Response> {
  return app.request(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
}

async function createPost(app: Hono, text: string): Promise<Post> {
  const res = await postJson(app, { text })
  expect(res.status).toBe(201)
  const body = (await res.json()) as PostResponse
  return body.post
}

describe('PUT /api/posts/:id/like', () => {
  it('首次点赞返回 200 且 likeCount 为 1、liked 为 true', async () => {
    const { app } = setup()
    const created = await createPost(app, '点赞测试')

    const res = await putJson(app, likePath(created.id), { liked: true })

    expect(res.status).toBe(200)
    const body = (await res.json()) as PostResponse
    expect(body.post.likeCount).toBe(1)
    expect(body.post.liked).toBe(true)
  })

  it('幂等：连续两次 liked=true 只累加一次', async () => {
    const { app } = setup()
    const created = await createPost(app, '幂等测试')

    const first = await putJson(app, likePath(created.id), { liked: true })
    expect(first.status).toBe(200)
    const second = await putJson(app, likePath(created.id), { liked: true })

    expect(second.status).toBe(200)
    const body = (await second.json()) as PostResponse
    expect(body.post.likeCount).toBe(1)
    expect(body.post.liked).toBe(true)
  })

  it('点赞后取消，计数回到 0 且 liked 为 false', async () => {
    const { app } = setup()
    const created = await createPost(app, '取消点赞')

    await putJson(app, likePath(created.id), { liked: true })
    const res = await putJson(app, likePath(created.id), { liked: false })

    expect(res.status).toBe(200)
    const body = (await res.json()) as PostResponse
    expect(body.post.likeCount).toBe(0)
    expect(body.post.liked).toBe(false)
  })

  it('未点赞时重复取消不会出现负数', async () => {
    const { app } = setup()
    const created = await createPost(app, '负数保护')

    const first = await putJson(app, likePath(created.id), { liked: false })
    expect(first.status).toBe(200)
    const second = await putJson(app, likePath(created.id), { liked: false })

    expect(second.status).toBe(200)
    const body = (await second.json()) as PostResponse
    expect(body.post.likeCount).toBe(0)
    expect(body.post.liked).toBe(false)
  })

  it('点赞不影响收藏计数与标记', async () => {
    const { app } = setup()
    const created = await createPost(app, '互不干扰')

    const res = await putJson(app, likePath(created.id), { liked: true })

    expect(res.status).toBe(200)
    const body = (await res.json()) as PostResponse
    expect(body.post.favoriteCount).toBe(0)
    expect(body.post.favorited).toBe(false)
  })

  it('点赞后其余字段保持不变', async () => {
    const { app } = setup()
    const created = await createPost(app, '其余字段不变')

    const res = await putJson(app, likePath(created.id), { liked: true })

    expect(res.status).toBe(200)
    const body = (await res.json()) as PostResponse
    expect(body.post.id).toBe(created.id)
    expect(body.post.text).toBe(created.text)
    expect(body.post.createdAt).toBe(created.createdAt)
  })

  it('id 不存在返回 404 not-found', async () => {
    const { app } = setup()
    const res = await putJson(app, likePath('missing-id'), { liked: true })

    expect(res.status).toBe(404)
    const body = (await res.json()) as ErrorResponse
    expect(body.error.code).toBe('not-found')
    expect(body.error.message.length).toBeGreaterThan(0)
  })

  it('非法 JSON 返回 400 invalid-body', async () => {
    const { app } = setup()
    const created = await createPost(app, '非法 JSON')
    const res = await putRaw(app, likePath(created.id), '{ "liked": ')

    expect(res.status).toBe(400)
    const body = (await res.json()) as ErrorResponse
    expect(body.error.code).toBe('invalid-body')
    expect(body.error.message.length).toBeGreaterThan(0)

    const posts = await readPosts(app)
    expect(posts[0].likeCount).toBe(0)
    expect(posts[0].liked).toBe(false)
  })

  it('缺少 liked 字段返回 400 invalid-body', async () => {
    const { app } = setup()
    const created = await createPost(app, '缺字段')
    const res = await putJson(app, likePath(created.id), { like: true })

    expect(res.status).toBe(400)
    const body = (await res.json()) as ErrorResponse
    expect(body.error.code).toBe('invalid-body')
    expect((await readPosts(app))[0].likeCount).toBe(0)
  })

  it('liked 为字符串返回 400 invalid-body', async () => {
    const { app } = setup()
    const created = await createPost(app, '字符串参数')
    const res = await putJson(app, likePath(created.id), { liked: 'true' })

    expect(res.status).toBe(400)
    const body = (await res.json()) as ErrorResponse
    expect(body.error.code).toBe('invalid-body')
    expect((await readPosts(app))[0].likeCount).toBe(0)
  })

  it('liked 为数字返回 400 invalid-body', async () => {
    const { app } = setup()
    const created = await createPost(app, '数字参数')
    const res = await putJson(app, likePath(created.id), { liked: 1 })

    expect(res.status).toBe(400)
    const body = (await res.json()) as ErrorResponse
    expect(body.error.code).toBe('invalid-body')
    expect((await readPosts(app))[0].likeCount).toBe(0)
  })

  it('GET /api/posts 反映点赞后的最新计数与标记', async () => {
    const { app } = setup()
    const created = await createPost(app, '列表同步')
    await putJson(app, likePath(created.id), { liked: true })

    const posts = await readPosts(app)
    expect(posts).toHaveLength(1)
    expect(posts[0].likeCount).toBe(1)
    expect(posts[0].liked).toBe(true)
    expect(posts[0].id).toBe(created.id)
    expect(posts[0].text).toBe(created.text)
    expect(posts[0].createdAt).toBe(created.createdAt)
  })

  it('同毫秒多条记录时点赞不改变排序', async () => {
    const app = createApp(createPostStore({ now: () => 1_700_000_000_000 }))
    const first = await createPost(app, '先写')
    const second = await createPost(app, '后写')
    await putJson(app, likePath(first.id), { liked: true })

    const posts = await readPosts(app)
    expect(posts.map((post) => post.text)).toEqual(['后写', '先写'])
    expect(posts[1].id).toBe(first.id)
    expect(posts[1].liked).toBe(true)
    expect(posts[0].id).toBe(second.id)
  })
})

describe('PUT /api/posts/:id/favorite', () => {
  it('首次收藏返回 200 且 favoriteCount 为 1、favorited 为 true', async () => {
    const { app } = setup()
    const created = await createPost(app, '收藏测试')

    const res = await putJson(app, favoritePath(created.id), { favorited: true })

    expect(res.status).toBe(200)
    const body = (await res.json()) as PostResponse
    expect(body.post.favoriteCount).toBe(1)
    expect(body.post.favorited).toBe(true)
  })

  it('幂等：连续两次 favorited=true 只累加一次', async () => {
    const { app } = setup()
    const created = await createPost(app, '收藏幂等')

    await putJson(app, favoritePath(created.id), { favorited: true })
    const res = await putJson(app, favoritePath(created.id), { favorited: true })

    expect(res.status).toBe(200)
    const body = (await res.json()) as PostResponse
    expect(body.post.favoriteCount).toBe(1)
    expect(body.post.favorited).toBe(true)
  })

  it('收藏后取消，计数回到 0 且 favorited 为 false', async () => {
    const { app } = setup()
    const created = await createPost(app, '取消收藏')

    await putJson(app, favoritePath(created.id), { favorited: true })
    const res = await putJson(app, favoritePath(created.id), { favorited: false })

    expect(res.status).toBe(200)
    const body = (await res.json()) as PostResponse
    expect(body.post.favoriteCount).toBe(0)
    expect(body.post.favorited).toBe(false)
  })

  it('未收藏时重复取消不会出现负数', async () => {
    const { app } = setup()
    const created = await createPost(app, '收藏负数保护')

    await putJson(app, favoritePath(created.id), { favorited: false })
    const res = await putJson(app, favoritePath(created.id), { favorited: false })

    expect(res.status).toBe(200)
    const body = (await res.json()) as PostResponse
    expect(body.post.favoriteCount).toBe(0)
    expect(body.post.favorited).toBe(false)
  })

  it('收藏不影响点赞计数与标记', async () => {
    const { app } = setup()
    const created = await createPost(app, '收藏互不干扰')

    const res = await putJson(app, favoritePath(created.id), { favorited: true })

    expect(res.status).toBe(200)
    const body = (await res.json()) as PostResponse
    expect(body.post.likeCount).toBe(0)
    expect(body.post.liked).toBe(false)
  })

  it('点赞与收藏可同时存在，取消点赞不影响收藏', async () => {
    const { app } = setup()
    const created = await createPost(app, '两个状态')

    await putJson(app, likePath(created.id), { liked: true })
    await putJson(app, favoritePath(created.id), { favorited: true })

    const afterUnlike = await putJson(app, likePath(created.id), { liked: false })
    expect(afterUnlike.status).toBe(200)
    const body = (await afterUnlike.json()) as PostResponse
    expect(body.post.likeCount).toBe(0)
    expect(body.post.liked).toBe(false)
    expect(body.post.favoriteCount).toBe(1)
    expect(body.post.favorited).toBe(true)
  })

  it('id 不存在返回 404 not-found', async () => {
    const { app } = setup()
    const res = await putJson(app, favoritePath('missing-id'), { favorited: true })

    expect(res.status).toBe(404)
    const body = (await res.json()) as ErrorResponse
    expect(body.error.code).toBe('not-found')
    expect(body.error.message.length).toBeGreaterThan(0)
  })

  it('非法 JSON 返回 400 invalid-body', async () => {
    const { app } = setup()
    const created = await createPost(app, '收藏非法 JSON')
    const res = await putRaw(app, favoritePath(created.id), 'not-json')

    expect(res.status).toBe(400)
    const body = (await res.json()) as ErrorResponse
    expect(body.error.code).toBe('invalid-body')
    expect(body.error.message.length).toBeGreaterThan(0)
    expect((await readPosts(app))[0].favoriteCount).toBe(0)
  })

  it('缺少 favorited 字段返回 400 invalid-body', async () => {
    const { app } = setup()
    const created = await createPost(app, '收藏缺字段')
    const res = await putJson(app, favoritePath(created.id), { favorite: true })

    expect(res.status).toBe(400)
    const body = (await res.json()) as ErrorResponse
    expect(body.error.code).toBe('invalid-body')
    expect((await readPosts(app))[0].favoriteCount).toBe(0)
  })

  it('favorited 为字符串返回 400 invalid-body', async () => {
    const { app } = setup()
    const created = await createPost(app, '收藏字符串参数')
    const res = await putJson(app, favoritePath(created.id), { favorited: 'yes' })

    expect(res.status).toBe(400)
    const body = (await res.json()) as ErrorResponse
    expect(body.error.code).toBe('invalid-body')
    expect((await readPosts(app))[0].favoriteCount).toBe(0)
  })

  it('favorited 为数字返回 400 invalid-body', async () => {
    const { app } = setup()
    const created = await createPost(app, '收藏数字参数')
    const res = await putJson(app, favoritePath(created.id), { favorited: 0 })

    expect(res.status).toBe(400)
    const body = (await res.json()) as ErrorResponse
    expect(body.error.code).toBe('invalid-body')
    expect((await readPosts(app))[0].favoriteCount).toBe(0)
  })

  it('GET /api/posts 反映收藏后的最新计数与标记', async () => {
    const { app } = setup()
    const created = await createPost(app, '收藏列表同步')
    await putJson(app, favoritePath(created.id), { favorited: true })

    const posts = await readPosts(app)
    expect(posts).toHaveLength(1)
    expect(posts[0].favoriteCount).toBe(1)
    expect(posts[0].favorited).toBe(true)
    expect(posts[0].id).toBe(created.id)
    expect(posts[0].createdAt).toBe(created.createdAt)
  })
})

describe('未知 /api 子路由', () => {
  it('PUT /api/posts/:id/unknown 返回 404 not-found', async () => {
    const { app } = setup()
    const created = await createPost(app, '未知子路由')
    const res = await putJson(app, `/api/posts/${created.id}/unknown`, { liked: true })

    expect(res.status).toBe(404)
    const body = (await res.json()) as ErrorResponse
    expect(body.error.code).toBe('not-found')
  })
})
