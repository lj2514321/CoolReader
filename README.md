# EPUB Reader

基于 Electron + React + TypeScript + epub.js 的桌面 EPUB 阅读器，全窗毛玻璃风格。

## 功能

- **书架管理** — 导入 EPUB 文件，封面/标题/作者展示，删除确认（仅移出书架或同时删除源文件）
- **沉浸阅读** — 全屏阅读，UI 点击切换显隐，点击/滚轮/键盘翻页；阅读进度追踪（秒级持久化）
- **主题切换** — 亮色/暖黄/暗色 三种阅读主题，持久化记忆
- **全文搜索** — 阅读页 🔍 按钮唤起搜索面板，懒构建索引，大小写不敏感匹配，结果自动跳转高亮
- **书签系统** — 阅读页 📑 按钮管理书签/标注，书签快速跳转，删除可见按钮
- **文本标注** — 选中文字后悬浮工具栏，四色高亮标记，持久化到 IndexedDB
- **注释导航** — 点击正文注释序号跳转注释内容，自动返回原文
- **目录导航** — 侧栏目录树，当前章节高亮跟随，自动滚动居中，导航竞态修复
- **首页背景设置** — 6 种渐变背景预设，滑入/滑出二级页动画，即时生效并持久化
- **阅读时间追踪** — 今日阅读时长统计，书架页顶部展示
- **毛玻璃 UI** — 自定义 frameless 窗口，全局毛玻璃风格，一体化 TitleBar
- **WebDAV 同步** — 书架/进度/阅读时间双向同步，自建 WebDAV 服务器，全量同步进度反馈
- **AI 助手** — 章节一键总结，自由问答，流式输出实时显示；支持 OpenAI 兼容 API
- **IPC 安全** — contextIsolation 隔离，文件操作走主进程

## 技术栈

| 层 | 技术 |
|---|------|
| 框架 | Electron 28, React 18 |
| 构建 | electron-vite, electron-builder |
| 语言 | TypeScript |
| 解析 | epub.js |
| 存储 | IndexedDB (书架/进度/设置/阅读时间) |
| UI | 纯内联样式，毛玻璃 (backdrop-filter) |
| CI | GitHub Actions (三平台) |

## 开始

```bash
npm install
npm run dev        # 开发模式 (热更新)
npm run build      # 生产构建
```

## 构建分发包

```bash
npm run dist
```

输出在 `release/` 目录。

## 项目结构

```
epub-reader-demo/
├── electron/
│   ├── main/
│   │   ├── index.ts         # 主进程 (frameless, IPC handlers)
│   │   ├── webdav.ts        # WebDAV 客户端
│   │   └── ai.ts            # AI API 客户端 (流式 SSE)
│   └── preload/index.ts     # 预加载 (contextBridge)
├── src/
│   ├── components/          # React 组件
│   │   ├── Library.tsx      # 书架/设置页布局协调
│   │   ├── SidebarNav.tsx   # 左侧导航栏
│   │   ├── BookShelf.tsx    # 书架网格 + 阅读时间卡片
│   │   ├── SettingsPage.tsx # 设置页 (背景预设 + 二级滑入动画)
│   │   ├── Reader.tsx       # 阅读视图 (沉浸模式)
│   │   ├── Sidebar.tsx      # 阅读目录侧栏
│   │   ├── TitleBar.tsx     # 自定义标题栏
│   │   ├── SyncSettings.tsx # WebDAV 同步配置与进度
│   │   ├── AIPanel.tsx      # AI 助手浮层面板
│   │   └── AISettings.tsx   # AI 配置表单
│   ├── hooks/useEpub.ts     # epub.js 封装
│   ├── types/index.ts       # 类型定义
│   ├── utils/
│   │   ├── db.ts            # IndexedDB 操作
│   │   └── styles.ts        # 共享样式常量
│   ├── App.tsx              # 根组件 (书架↔阅读路由)
│   └── main.tsx             # React 入口
├── index.html
├── electron.vite.config.ts
├── tsconfig.json
├── package.json
├── CHANGELOG.md
└── coolreader_icon.*        # 应用图标
```

## 许可

MIT
