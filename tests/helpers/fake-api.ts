import { vi } from 'vitest'
import { MAX_LENGTH, MAX_POSTS } from '@/lib/constants'
import type { Post } from '@/types'

export interface FakeRequest {
  method: string
  url: string
  body: unknown
}

export type FakeApiMode = 'ok' | 'network-error' | 'server-error' | 'malformed'

export interface FakeApi {
  /** 预置后端已有数据 */
  seed(posts: Post[]): void
  /** 读取后端当前数据（按 createdAt 倒序） */
  list(): Post[]
  /** 记录到的请求（含被拒绝的非法请求） */
  requests(): FakeRequest[]
  /** 切换全局响应模式 */
  setMode(mode: FakeApiMode): void
  /** 令下一个请求直接返回指定的错误体 */
  failNext(status: number, code: string, message: string): void
  /** 挂起后续请求，直到 release() 被调用 */
  hold(): void
  release(): void
}

interface ForcedFailure {
  status: number
  code: string
  message: string
}

interface FakeApiState {
  posts: Post[]
  requests: FakeRequest[]
  mode: FakeApiMode
  forced: ForcedFailure | null
  blocked: boolean
  waiting: Array<() => void>
  lastCreatedAt: number
  sequence: number
}

function createState(): FakeApiState {
  return {
    posts: [],
    requests: [],
    mode: 'ok',
    forced: null,
    blocked: false,
    waiting: [],
    lastCreatedAt: 0,
    sequence: 0,
  }
}

let state = createState()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function errorResponse(status: number, code: string, message: string): Response {
  return jsonResponse(status, { error: { code, message } })
}

function sortedPosts(): Post[] {
  return [...state.posts].sort((left, right) => right.createdAt - left.createdAt)
}

function nextPostId(): string {
  state.sequence += 1
  return `fake-post-${state.sequence}`
}

/** 保证新记录的 createdAt 严格大于已有记录，避免同毫秒导致顺序不确定 */
function nextCreatedAt(): number {
  const now = Date.now()
  state.lastCreatedAt = now > state.lastCreatedAt ? now : state.lastCreatedAt + 1
  return state.lastCreatedAt
}

function toUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

function toPath(url: string): string {
  const withoutOrigin = url.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i, '')
  return withoutOrigin.split('?')[0] ?? withoutOrigin
}

function parseBody(body: RequestInit['body']): unknown {
  if (typeof body !== 'string') return null
  try {
    return JSON.parse(body) as unknown
  } catch {
    return body
  }
}

async function fakeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = toUrl(input)
  const method = (init?.method ?? 'GET').toUpperCase()
  const body = parseBody(init?.body)

  state.requests.push({ method, url, body })

  if (state.blocked) {
    await new Promise<void>((resolve) => {
      state.waiting.push(resolve)
    })
  }

  if (state.mode === 'network-error') {
    throw new TypeError('fetch failed')
  }

  const forced = state.forced
  if (forced) {
    state.forced = null
    return errorResponse(forced.status, forced.code, forced.message)
  }

  if (state.mode === 'server-error') {
    return errorResponse(500, 'internal', '服务器内部错误')
  }

  if (state.mode === 'malformed') {
    return jsonResponse(200, { unexpected: true })
  }

  const path = toPath(url)
  if (path !== '/api/posts' && path !== '/api/posts/') {
    return errorResponse(404, 'not-found', '接口不存在')
  }

  if (method === 'GET') {
    return jsonResponse(200, { posts: sortedPosts().slice(0, MAX_POSTS) })
  }

  if (method === 'POST') {
    if (!isRecord(body) || typeof body.text !== 'string') {
      return errorResponse(400, 'invalid-body', 'text 字段缺失或不是字符串')
    }

    const text = body.text.trim()
    if (text.length === 0) {
      return errorResponse(400, 'empty', '内容不能为空')
    }
    if (text.length > MAX_LENGTH) {
      return errorResponse(400, 'too-long', `内容不能超过 ${MAX_LENGTH} 个字符`)
    }

    const post: Post = {
      id: nextPostId(),
      text,
      createdAt: nextCreatedAt(),
      likeCount: 0,
      liked: false,
      favoriteCount: 0,
      favorited: false,
    }
    state.posts.push(post)

    if (state.posts.length > MAX_POSTS) {
      state.posts.splice(0, state.posts.length - MAX_POSTS)
    }

    return jsonResponse(201, { post })
  }

  return errorResponse(405, 'method-not-allowed', '不支持的请求方法')
}

const api: FakeApi = {
  seed(posts) {
    state.posts = posts.map((post) => ({ ...post }))
    state.lastCreatedAt = posts.reduce((max, post) => Math.max(max, post.createdAt), 0)
  },

  list() {
    return sortedPosts()
  },

  requests() {
    return state.requests.map((request) => ({ ...request }))
  },

  setMode(mode) {
    state.mode = mode
  },

  failNext(status, code, message) {
    state.forced = { status, code, message }
  },

  hold() {
    state.blocked = true
  },

  release() {
    state.blocked = false
    const pending = state.waiting
    state.waiting = []
    pending.forEach((resolve) => resolve())
  },
}

/** 安装内存版后端到全局 fetch */
export function installFakeApi(): FakeApi {
  state = createState()
  vi.stubGlobal('fetch', fakeFetch)
  return api
}

/** 清理 fake 后端状态并还原全局 fetch */
export function resetFakeApi(): void {
  state = createState()
  vi.unstubAllGlobals()
}
