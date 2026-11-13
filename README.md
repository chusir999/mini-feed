# 微记 MiniFeed

一个轻量的短动态记录工具：前端 **Vue 3 + Pinia + TypeScript + Vite**，后端 **Hono + REST API + 进程内内存存储**。内容不再写入浏览器 Local Storage，而是通过 HTTP 接口保存到本地后端服务。

项目以 **TDD（测试先行）** 方式开发：每个模块先写失败用例，再实现至通过。

## 功能

- **发布**：多行文本输入，280 字上限，实时字数统计（≥240 字转警示色），全空白内容不可提交，支持 `Ctrl / ⌘ + Enter` 快捷发布，发布中按钮禁用防重复提交
- **时间线**：按创建时间倒序展示，最新在最前；每条含渐变首字头像、昵称、相对时间（刚刚 / n 分钟前 / n 小时前 / n 天前 / 日期）与正文
- **点赞 / 收藏**：每条记录底部可点赞（♥）与收藏（★），带计数与选中态；点击后本地乐观更新，失败自动回滚并提示；同一记录在途时按钮禁用，避免连点重复提交
- **收藏筛选**：时间线可按「全部 / 已收藏」切换，已收藏为空时展示引导文案
- **服务端持久化**：内容、点赞与收藏状态都保存在后端进程内存，刷新或重新打开页面后一致，最多保留最新 500 条
- **安全渲染**：正文通过 Vue 插值渲染（不使用 `v-html`），HTML 标签与脚本以纯文本显示，换行保留
- **容错**：后端未启动时页面不白屏，提示「加载失败，请确认后端服务已启动。」；发布失败保留草稿并提示后端返回的错误信息
- **空状态 / 响应式 / 动效降级**：无内容时展示插画与引导文案；桌面 640px 居中单列，移动端自适应；遵循 `prefers-reduced-motion`

## 技术栈

| 领域 | 选型 |
| --- | --- |
| 运行时 | Node.js 22 LTS（≥ 20.19 均可） |
| 构建 | Vite 8 |
| 框架 | Vue 3（Composition API + `<script setup lang="ts">`） |
| 状态管理 | Pinia |
| 后端 | Hono 4 + @hono/node-server（tsx 直接运行 TS） |
| 数据存储 | 后端进程内存（Map 语义的数组 + 容量上限） |
| 测试 | Vitest + @vue/test-utils + jsdom（前端）/ node（后端） |
| 类型检查 | vue-tsc |

## 快速开始

```bash
npm install
npm run dev:server  # 终端 1：启动 API 服务（http://localhost:3001）
npm run dev         # 终端 2：启动前端（http://localhost:5173，/api 由 Vite 代理）
```

其它脚本：

```bash
npm run build        # 类型检查 + 生产构建
npm run preview      # 预览生产构建（同样带 /api 代理）
npm run test         # 监听模式运行测试
npm run test:run     # 单次运行全部测试
npm run typecheck    # 仅类型检查
npm run start:server # 非监听方式启动 API 服务
```

> 前端通过 `VITE_API_BASE_URL` 覆盖 API 基址，默认 `/api`（走 Vite 代理，无需 CORS）。

## API

REST 风格，统一 JSON，错误体为 `{ "error": { "code", "message" } }`。

| 方法 | 路径 | 说明 | 成功响应 |
| --- | --- | --- | --- |
| GET | `/api/health` | 健康检查 | `200 { "status": "ok" }` |
| GET | `/api/posts` | 记录列表，`createdAt` 倒序 | `200 { "posts": Post[] }` |
| POST | `/api/posts` | 创建记录，body `{ "text": string }` | `201 { "post": Post }` |
| PUT | `/api/posts/:id/like` | 幂等设置点赞，body `{ "liked": boolean }` | `200 { "post": Post }` |
| PUT | `/api/posts/:id/favorite` | 幂等设置收藏，body `{ "favorited": boolean }` | `200 { "post": Post }` |

点赞 / 收藏为**幂等 set**语义（不是 toggle）：目标值与当前值相同则计数不变，`false → true` 计数 +1，`true → false` 计数 -1（下限 0），点赞与收藏互不影响。切换动作由前端根据当前状态取反后调用。

错误码：

| HTTP | code | 触发条件 |
| --- | --- | --- |
| 400 | `empty` | 内容为空白 |
| 400 | `too-long` | 超过 280 字符 |
| 400 | `invalid-body` | 请求体非法 JSON / 缺少 `text` / `text` 非字符串；点赞收藏接口缺少布尔字段 |
| 404 | `not-found` | 点赞 / 收藏的目标记录不存在；未匹配的 `/api/*` 路由 |

`Post` 结构：`{ id: string; text: string; createdAt: number; likeCount: number; liked: boolean; favoriteCount: number; favorited: boolean }`，`id` 由后端生成，`createdAt` 为毫秒时间戳，`liked` / `favorited` 为当前用户（单用户场景）的标记。

## 目录结构

```
.
├── index.html                    # Vite 入口
├── server/
│   ├── store.ts                  # 内存存储：createPostStore（倒序、500 条上限、可注入时钟与 id）
│   ├── app.ts                    # createApp(store)：REST 路由与 JSON 错误处理
│   └── index.ts                  # 入口：监听 3001 端口
├── src/
│   ├── main.ts                   # 创建应用、注册 Pinia
│   ├── App.vue                   # 页面编排：Header / Composer / Timeline / Footer
│   ├── types.ts                  # Post、PublishResult、StatusMessage 类型
│   ├── lib/
│   │   ├── api.ts                # HTTP 客户端（fetch 封装、ApiError、响应校验）
│   │   ├── constants.ts          # 字数上限、容量上限
│   │   └── time.ts               # 相对时间与日期格式化
│   ├── stores/
│   │   └── posts.ts              # Pinia store：hydrate / publish（异步、并发保护）
│   ├── components/
│   │   ├── AppHeader.vue
│   │   ├── PostComposer.vue
│   │   ├── TimelineSection.vue   # 时间线 + 全部 / 已收藏筛选
│   │   ├── PostItem.vue          # 单条记录 + 点赞 / 收藏操作条
│   │   └── EmptyState.vue
│   └── styles/main.css           # 设计令牌、布局、背景与全局样式
└── tests/
    ├── setup.ts                  # 每个用例重置模拟后端
    ├── helpers/fake-api.ts       # 内存版后端，stub 全局 fetch
    ├── server/api.spec.ts        # Hono 路由（app.request，node 环境）
    ├── unit/                     # time / posts store
    └── component/                # PostComposer / TimelineSection / App
```

## TDD 说明

开发按「红 → 绿 → 重构」推进，测试先于实现提交：

1. **后端**：`store`（倒序、时间戳并列时的稳定顺序、500 条上限丢弃最旧、可注入时钟与 id、点赞 / 收藏幂等 set 与计数下限）与 `app`（health、列表、创建、trim、空/超长/非法 body 校验、点赞与收藏的成功 / 400 / 404、404）
2. **HTTP 层**：`api`（基址解析、非 2xx 错误体解析、网络异常、响应结构校验、点赞收藏字段与计数校验）
3. **状态层**：`posts` store（本地校验不发请求、成功后插入最前、服务端错误与网络错误映射、hydrate 排序与安全回退、500 条截断、`isPublishing` 期间重复提交只发一次请求、点赞收藏乐观更新 / 失败回滚 / 在途去重）
4. **视图层**：Composer（字数、禁用态、快捷发布、busy 禁用、reset 回焦）、Timeline（空状态、倒序、纯文本渲染、操作按钮与 `aria-pressed`、busy 禁用、已收藏筛选）、App（挂载即请求、发布 → 列表 → 请求体断言、重新挂载从后端恢复、后端不可用提示、不再写 Local Storage 的回归断言、点赞发出 PUT 并同步 UI）

当前用例：6 个测试文件、106 个用例，全部通过。

## 数据存储

- 位置：后端进程内存（`server/store.ts` 中的数组），进程退出即丢失
- 结构：`{ id: string, text: string, createdAt: number, likeCount: number, liked: boolean, favoriteCount: number, favorited: boolean }[]`，接口返回按 `createdAt` 倒序
- 上限：最多 500 条，超出丢弃最早写入的一条
- 清除：重启后端服务（`Ctrl + C` 后重新 `npm run dev:server`）
- 注意：不是数据库，不支持多实例共享；如需持久化需替换 `server/store.ts` 的实现

## 验收记录

- `npm run test:run`：6 个文件 / 106 个用例全部通过
- `npm run typecheck`：无类型错误
- `npm run build`：构建成功
- 接口冒烟：`GET /api/health` 返回 ok；`POST /api/posts` 201；空内容返回 `400 empty`；`PUT /api/posts/:id/like` 连续两次 `{ "liked": true }` 计数只 +1（幂等）；不存在的 id 返回 `404 not-found`；`{ "favorited": "yes" }` 返回 `400 invalid-body`
- 浏览器端（Chromium + `vite` 开发服务器，`/api` 代理到 3001）：发布成功、点赞 / 收藏切换并即时更新计数与选中态、刷新后点赞收藏状态由后端恢复、「已收藏」筛选只显示收藏项、在筛选下取消收藏即时移出列表、`localStorage` 保持为空、后端不可用时展示错误提示

## 版本

v3.1.0
