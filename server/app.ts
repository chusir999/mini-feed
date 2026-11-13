import { Hono } from 'hono'
import { MAX_LENGTH } from '../src/lib/constants'
import type { PostStore } from './store'

type ErrorCode = 'empty' | 'too-long' | 'invalid-body' | 'not-found'

interface ErrorBody {
  error: { code: ErrorCode; message: string }
}

function errorBody(code: ErrorCode, message: string): ErrorBody {
  return { error: { code, message } }
}

export function createApp(store: PostStore): Hono {
  const app = new Hono()

  app.get('/api/health', (c) => c.json({ status: 'ok' }))

  app.get('/api/posts', (c) => c.json({ posts: store.list() }))

  app.post('/api/posts', async (c) => {
    let payload: unknown
    try {
      payload = await c.req.json()
    } catch {
      return c.json(errorBody('invalid-body', '请求体不是合法的 JSON'), 400)
    }

    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      return c.json(errorBody('invalid-body', '请求体必须是包含 text 字段的 JSON 对象'), 400)
    }

    const rawText = (payload as { text?: unknown }).text
    if (typeof rawText !== 'string') {
      return c.json(errorBody('invalid-body', 'text 字段缺失或不是字符串'), 400)
    }

    const text = rawText.trim()
    if (text.length === 0) {
      return c.json(errorBody('empty', '内容不能为空'), 400)
    }
    if (text.length > MAX_LENGTH) {
      return c.json(errorBody('too-long', `内容不能超过 ${MAX_LENGTH} 个字符`), 400)
    }

    return c.json({ post: store.add(text) }, 201)
  })

  app.all('/api/*', (c) => c.json(errorBody('not-found', '接口不存在'), 404))

  return app
}
