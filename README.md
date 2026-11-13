# 微记 MiniFeed

一个用 **纯 HTML + CSS + JavaScript** 编写的轻量短动态记录工具。无需安装依赖、无需构建、无需服务器，双击 `index.html` 即可使用。

所有内容保存在浏览器的 Local Storage 中，不上传任何服务器。

## 功能

- **发布**：多行文本输入，实时字数统计（上限 280 字），空内容不可发布，支持 `Ctrl / ⌘ + Enter` 快捷发布
- **查看**：时间线倒序展示全部动态，自动显示相对时间（刚刚 / x 分钟前 / 具体日期）
- **本地持久化**：数据写入 `localStorage`（键名 `minifeed.posts`），刷新或重新打开页面内容不丢失
- **安全渲染**：正文通过 `textContent` 渲染，HTML 标签与脚本以纯文本显示，保留换行
- **空状态**：无内容时展示引导插画与提示
- **响应式**：桌面端居中单列，移动端自适应；支持 `prefers-reduced-motion` 动画降级

## 目录结构

```
.
├── index.html        # 页面结构
├── css/
│   └── style.css     # 全部样式（设计令牌、布局、组件、响应式）
├── js/
│   └── app.js        # 应用逻辑（存储 / 业务 / 视图）
└── README.md
```

## 运行方式

方式一：直接双击 `index.html`，浏览器打开即可（推荐 Chrome / Edge / Safari 新版本）。

方式二：如需通过本地服务访问，可在项目目录执行任意静态服务器，例如：

```bash
python -m http.server 8080
# 然后访问 http://localhost:8080
```

## 数据存储说明

- 存储位置：当前浏览器的 Local Storage，键名 `minifeed.posts`
- 数据结构：`{ id: string, text: string, createdAt: number }[]`
- 数量上限：最多保留最新 500 条，超出部分自动截断
- 清除方式：在浏览器开发者工具中执行 `localStorage.removeItem('minifeed.posts')`，或清除站点数据
- 注意：数据仅存在于当前浏览器与当前域名/路径下，换浏览器、换设备或清除站点数据后不可恢复

## 实现要点

- 无框架、无第三方库、无外部 CDN，所有资源使用相对路径，可在 `file://` 协议下正常工作
- 读取时对 `JSON.parse` 做异常捕获并校验字段类型，脏数据不会导致白屏
- 写入失败（隐私模式、存储配额超限）会给出可见提示，不影响页面其余部分
- 时间线使用 `DocumentFragment` 批量渲染，列表按 `createdAt` 倒序排序

## 浏览器兼容

Chrome / Edge / Firefox / Safari 现代版本，以及基于 Chromium 的国产浏览器。

## 版本

v1.0.0
