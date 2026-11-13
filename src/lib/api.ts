import type { Post } from '@/types'

const DEFAULT_BASE_URL = '/api'

interface ErrorPayload {
  code: string
  message: string
}

/** 统一的后端错误：code 来自后端错误体或本地分类，status 为 HTTP 状态码（网络异常为 0） */
export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

function resolveBaseUrl(): string {
  const configured: unknown = import.meta.env.VITE_API_BASE_URL

  if (typeof configured === 'string' && configured.trim().length > 0) {
    return configured.trim().replace(/\/+$/, '')
  }

  return DEFAULT_BASE_URL
}

function buildUrl(path: string): string {
  return `${resolveBaseUrl()}${path}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function readErrorPayload(response: Response): Promise<ErrorPayload> {
  const fallback: ErrorPayload = {
    code: `http-${response.status}`,
    message: `请求失败（HTTP ${response.status}）。`,
  }

  try {
    const payload: unknown = await response.json()
    if (!isRecord(payload) || !isRecord(payload.error)) return fallback

    const { code, message } = payload.error
    return {
      code: typeof code === 'string' && code.length > 0 ? code : fallback.code,
      message: typeof message === 'string' && message.length > 0 ? message : fallback.message,
    }
  } catch {
    return fallback
  }
}

async function requestJson(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response

  try {
    response = await fetch(buildUrl(path), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError('network', '网络请求失败，请确认后端服务已启动。')
  }

  if (!response.ok) {
    const failure = await readErrorPayload(response)
    throw new ApiError(failure.code, failure.message, response.status)
  }

  try {
    return (await response.json()) as unknown
  } catch {
    throw new ApiError('invalid-response', '后端返回的内容不是合法 JSON。', response.status)
  }
}

function parsePost(value: unknown): Post {
  if (!isRecord(value)) {
    throw new ApiError('invalid-response', '后端返回的记录格式不正确。')
  }

  const { id, text, createdAt } = value
  if (typeof id !== 'string' || id.length === 0) {
    throw new ApiError('invalid-response', '后端返回的记录缺少合法的 id。')
  }
  if (typeof text !== 'string' || typeof createdAt !== 'number' || !Number.isFinite(createdAt)) {
    throw new ApiError('invalid-response', '后端返回的记录缺少合法的正文或时间。')
  }

  return { id, text, createdAt }
}

/** 拉取全部记录；响应结构异常时抛错，避免静默变成空列表 */
export async function fetchPosts(): Promise<Post[]> {
  const payload = await requestJson('/posts')

  if (!isRecord(payload) || !Array.isArray(payload.posts)) {
    throw new ApiError('invalid-response', '后端返回的列表格式不正确。')
  }

  const items: unknown[] = payload.posts
  return items.map((item) => parsePost(item))
}

/** 创建一条记录，成功返回后端生成的完整记录 */
export async function createPost(text: string): Promise<Post> {
  const payload = await requestJson('/posts', {
    method: 'POST',
    body: JSON.stringify({ text }),
  })

  if (!isRecord(payload)) {
    throw new ApiError('invalid-response', '后端返回的发布结果格式不正确。')
  }

  return parsePost(payload.post)
}
