# EPUB Reader

基于 Electron + React + TypeScript + epub.js 的桌面 EPUB 阅读器，全窗毛玻璃风格。

## 功能

- **书架管理** — 导入 EPUB 文件，封面/标题/作者展示，删除确认（仅移出书架或同时删除源文件）
- **沉浸阅读** — 全屏阅读，UI 点击切换显隐，点击/滚轮/键盘翻页；阅读进度追踪（秒级持久化）
- **主题切换** — 亮色/暖黄/暗色 三种阅读主题，持久化记忆
- **注释导航** — 点击正文注释序号跳转注释内容，自动返回原文
- **目录导航** — 侧栏目录树，当前章节高亮跟随，自动滚动居中
- **首页背景设置** — 6 种渐变背景预设，滑入/滑出二级页动画，即时生效并持久化
- **阅读时间追踪** — 今日阅读时长统计，书架页顶部展示
- **毛玻璃 UI** — 自定义 frameless 窗口，全局毛玻璃风格，一体化 TitleBar
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
│   ├── main/index.ts        # 主进程 (frameless, IPC handlers)
│   └── preload/index.ts     # 预加载 (contextBridge)
├── src/
│   ├── components/          # React 组件
│   │   ├── Library.tsx      # 书架/设置页布局协调
│   │   ├── SidebarNav.tsx   # 左侧导航栏
│   │   ├── BookShelf.tsx    # 书架网格 + 阅读时间卡片
│   │   ├── SettingsPage.tsx # 设置页 (背景预设 + 二级滑入动画)
│   │   ├── Reader.tsx       # 阅读视图 (沉浸模式)
│   │   ├── Sidebar.tsx      # 阅读目录侧栏
│   │   └── TitleBar.tsx     # 自定义标题栏
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
