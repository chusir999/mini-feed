# 微记 MiniFeed

一个轻量的本地短动态记录工具，使用 **Vue 3 + Pinia + TypeScript + Vite** 实现，内容保存在浏览器 Local Storage，不上传任何服务器。

项目以 **TDD（测试先行）** 方式开发：每个模块先写失败用例，再实现至通过。

## 功能

- **发布**：多行文本输入，280 字上限，实时字数统计（≥240 字转警示色），全空白内容不可提交，支持 `Ctrl / ⌘ + Enter` 快捷发布
- **时间线**：按创建时间倒序展示，最新在最前；每条含渐变首字头像、昵称、相对时间（刚刚 / n 分钟前 / n 小时前 / n 天前 / 日期）与正文
- **本地持久化**：写入 `localStorage` 键 `minifeed.posts`，刷新或重新打开页面内容与顺序不变，最多保留最新 500 条
- **安全渲染**：正文通过 Vue 插值渲染（不使用 `v-html`），HTML 标签与脚本以纯文本显示，换行保留
- **容错**：读取时对损坏 JSON、非数组、脏条目做过滤，不白屏；写入失败（隐私模式/配额超限）会提示且不会产生“假发布”
- **空状态 / 响应式 / 动效降级**：无内容时展示插画与引导文案；桌面 640px 居中单列，移动端自适应；遵循 `prefers-reduced-motion`

## 技术栈

| 领域 | 选型 |
| --- | --- |
| 运行时 | Node.js 22 LTS（≥ 20.19 均可） |
| 构建 | Vite 8 |
| 框架 | Vue 3（Composition API + `<script setup lang="ts">`） |
| 状态管理 | Pinia |
| 测试 | Vitest + @vue/test-utils + jsdom |
| 类型检查 | vue-tsc |
| 存储 | localStorage |

## 快速开始

```bash
npm install
npm run dev        # 开发服务器
npm run build      # 类型检查 + 生产构建
npm run preview    # 预览生产构建
npm run test       # 监听模式运行测试
npm run test:run   # 单次运行全部测试
npm run typecheck  # 仅类型检查
```

> 首次安装如遇网络缓慢，可追加 `--registry=https://registry.npmmirror.com`。

## 目录结构

```
.
├── index.html                    # Vite 入口
├── src/
│   ├── main.ts                   # 创建应用、注册 Pinia
│   ├── App.vue                   # 页面编排：Header / Composer / Timeline / Footer
│   ├── types.ts                  # Post、PublishResult、StatusMessage 类型
│   ├── lib/
│   │   ├── constants.ts          # 存储键、字数上限、容量上限
│   │   ├── storage.ts            # localStorage 安全读写、校验、排序、截断
│   │   └── time.ts               # 相对时间与日期格式化
│   ├── stores/
│   │   └── posts.ts              # Pinia store：hydrate / publish（先落盘再更新内存）
│   ├── components/
│   │   ├── AppHeader.vue
│   │   ├── PostComposer.vue
│   │   ├── TimelineSection.vue
│   │   ├── PostItem.vue
│   │   └── EmptyState.vue
│   └── styles/main.css           # 设计令牌、布局、背景与全局样式
└── tests/
    ├── setup.ts                  # 每个用例清理 localStorage
    ├── unit/                     # storage / time / posts store
    └── component/                # PostComposer / TimelineSection / App
```

## TDD 说明

开发按「红 → 绿 → 重构」推进，测试先于实现提交：

1. **逻辑层**：`storage`（空值、损坏 JSON、非数组、脏条目过滤、倒序、500 条截断、读写异常）与 `time`（各时间边界、跨年格式）
2. **状态层**：`posts` store（trim 校验、空值与超长拒绝、落盘、倒序、容量上限、落盘失败不更新内存）
3. **视图层**：Composer（字数、禁用态、快捷发布、reset 回焦）、Timeline（空状态、倒序、纯文本渲染）、App（发布 → 列表 → 存储 → 重新挂载恢复）

当前用例：6 个测试文件、46 个用例，全部通过。

## 数据存储

- 键名：`minifeed.posts`
- 结构：`{ id: string, text: string, createdAt: number }[]`，按 `createdAt` 倒序
- 上限：最多 500 条，超出丢弃最旧
- 清除：开发者工具执行 `localStorage.removeItem('minifeed.posts')`，或清除站点数据
- 注意：数据仅存在于当前浏览器，换设备或清除站点数据后不可恢复

## 验收记录

- `npm run test:run`：6 个文件 / 46 个用例全部通过
- `npm run typecheck`：无类型错误
- `npm run build`：构建成功
- 浏览器端（Edge，`vite preview`）：发布、刷新后持久化、HTML 纯文本渲染、移动端无横向滚动、控制台无报错

## 版本

v2.0.0
