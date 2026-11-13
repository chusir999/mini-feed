import { serve } from '@hono/node-server'
import { createApp } from './app'
import { createPostStore } from './store'

const port = Number(process.env.PORT ?? 3001)
const app = createApp(createPostStore())

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[minifeed] API 服务已启动：http://localhost:${info.port}`)
})
