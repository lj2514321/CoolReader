# EPUB Reader

基于 Electron + React + TypeScript + epub.js 的桌面 EPUB 阅读器，全窗毛玻璃风格。

## 功能

- **书架管理** — 导入 EPUB 文件，封面/标题/作者展示
- **沉浸阅读** — 全屏阅读，UI 自动隐藏/唤醒，点击/键盘翻页
- **主题切换** — 亮色/暖黄/暗色 三种阅读主题
- **目录导航** — 侧栏目录树，快速跳转章节
- **毛玻璃 UI** — 自定义 frameless 窗口，全局毛玻璃风格
- **IPC 安全** — contextIsolation 隔离，文件操作走主进程

## 技术栈

| 层 | 技术 |
|---|------|
| 框架 | Electron 28, React 18 |
| 构建 | electron-vite, electron-builder |
| 语言 | TypeScript |
| 解析 | epub.js, JSZip |
| UI | 纯内联样式，毛玻璃 (backdrop-filter) |

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
│   ├── main/index.ts        # 主进程 (frameless, IPC)
│   └── preload/index.ts     # 预加载 (contextBridge)
├── src/
│   ├── components/          # React 组件
│   │   ├── Library.tsx      # 书架视图
│   │   ├── Reader.tsx       # 阅读视图 (沉浸模式)
│   │   ├── Sidebar.tsx      # 目录侧栏
│   │   └── TitleBar.tsx     # 自定义标题栏
│   ├── hooks/useEpub.ts     # epub.js 封装
│   ├── types/index.ts       # 类型定义
│   ├── App.tsx              # 根组件 (书架↔阅读路由)
│   └── main.tsx             # React 入口
├── index.html
├── electron.vite.config.ts
├── tsconfig.json
└── package.json
```

## 许可

MIT
