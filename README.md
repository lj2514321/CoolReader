# CoolReader

基于 Electron + React + TypeScript 的桌面电子书阅读器，支持 **EPUB / TXT / MOBI / AZW3 / PRC** 多种格式，全窗毛玻璃风格。

## 功能

- **多格式支持** — 统一适配器架构（`BookAdapter`）支持 EPUB、TXT（按空行分章）、MOBI/AZW3/PRC；所有格式均支持书签/搜索/高亮/进度/三套主题
- **书架管理** — 导入 EPUB/TXT/MOBI 文件，封面/标题/作者展示，格式徽章（EPUB/TXT/MOBI）自动识别，删除确认（仅移出书架或同时删除源文件）；悬停书卡显式垃圾桶入口，右键亦可管理；继续阅读区展示最近 5 本且保留在主网格，删除两区同步
- **编码自动检测** — TXT 文件自动检测 UTF-8/GB18030（中文老 txt 必备）
- **50MB 文件大小限制** — 导入时主进程预检，避免大文件卡顿
- **沉浸阅读** — 全屏阅读，UI 点击切换显隐，点击/滚轮/键盘翻页；四种翻页动画（淡入淡出/左右滑动/3D翻书/滑动+淡出）；阅读进度追踪（秒级持久化）
- **主题切换** — 亮色/暖黄/暗色 三种阅读主题，持久化记忆
- **自定义阅读主题** — Aa 面板支持纯色（颜色选择器 + 透明度）和渐变（线性/径向 + 色标编辑器）自定义背景，内置碧海/极光/日出/极光紫四套预设
- **全文搜索** — 阅读页 🔍 按钮唤起搜索面板，懒构建索引，大小写不敏感匹配，结果自动跳转高亮
- **书签系统** — 阅读页 📑 按钮管理书签/标注，书签快速跳转，删除可见按钮
- **文本标注** — 选中文字后悬浮工具栏，四色高亮标记，持久化到 IndexedDB
- **注释导航** — 点击正文注释序号跳转注释内容，自动返回原文
- **目录导航** — 侧栏目录树，当前章节高亮跟随，自动滚动居中，导航竞态修复
- **首页背景设置** — 6 种渐变背景预设 + 自定义纯色/渐变/图片壁纸，滑入/滑出二级页动画，即时生效并持久化
- **阅读时间追踪** — 今日阅读时长统计，书架页顶部展示
- **水墨风 UI** — 墨晕渐变 + 纸纹质感背景，卡片晕染边缘，按钮墨色晕开 hover，朱砂印章点缀（在读角标/当前章节/书签/空态），主题切换墨色流动过渡
- **毛玻璃 UI** — 自定义 frameless 窗口，全局毛玻璃风格，一体化 TitleBar
- **WebDAV 同步** — 书架/进度/阅读时间双向同步，按格式分目录（`progress/<format>/<name>.json`）避免冲突，全量同步进度反馈
- **AI 助手** — 章节一键总结，自由问答，流式输出实时显示；支持 OpenAI 兼容 API
- **IPC 安全** — contextIsolation 隔离，文件操作走主进程

## 技术栈

| 层 | 技术 |
|---|------|
| 框架 | Electron 28, React 18 |
| 构建 | electron-vite, electron-builder |
| 语言 | TypeScript |
| 解析 | epub.js (EPUB), @lingo-reader/mobi-parser (MOBI/AZW3/KF8), 自研 TxtAdapter (TXT) |
| 编码 | chardet (自动检测), iconv-lite (Node.js 解码) |
| 存储 | IndexedDB (书架/进度/设置/阅读时间/书签/高亮/封面/书阅读时长) |
| UI | CSS 类 + 毛玻璃 (backdrop-filter)，自定义主题变量 |
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
coolreader/
├── electron/
│   ├── main/
│   │   ├── index.ts         # 主进程 (frameless, IPC handlers)
│   │   ├── webdav.ts        # WebDAV 客户端 (按 format 分目录)
│   │   └── ai.ts            # AI API 客户端 (流式 SSE)
│   └── preload/index.ts     # 预加载 (contextBridge)
├── src/
│   ├── components/          # React 组件
│   │   ├── Library.tsx      # 书架/设置页布局协调
│   │   ├── SidebarNav.tsx   # 左侧导航栏
│   │   ├── BookShelf.tsx    # 书架网格 + 格式徽章 + 阅读时间卡片
│   │   ├── SettingsPage.tsx # 设置页 (背景预设 + 二级滑入动画)
│   │   ├── Reader.tsx       # 阅读视图 (沉浸模式)
│   │   ├── Sidebar.tsx      # 阅读目录侧栏
│   │   ├── TitleBar.tsx     # 自定义标题栏
│   │   ├── SyncSettings.tsx # WebDAV 同步配置与进度
│   │   ├── AIPanel.tsx      # AI 助手浮层面板
│   │   └── AISettings.tsx   # AI 配置表单
│   ├── adapters/            # BookAdapter 抽象层 (v1.5.3+)
│   │   ├── BookAdapter.ts   # 统一接口 (open/navigate/search/highlight/theme/...)
│   │   ├── EpubAdapter.ts   # EPUB 实现 (包装 epub.js)
│   │   ├── TxtAdapter.ts    # TXT 实现 (div 渲染器)
│   │   ├── MobiAdapter.ts   # MOBI/AZW3 实现 (iframe 渲染器)
│   │   └── __tests__/       # adapter 合同测试 (需安装 vitest)
│   ├── hooks/
│   │   ├── useEpub/         # useBookEngine + useReaderControls + useAnnotations + useSearch
│   │   ├── useInitialLoad.ts
│   │   ├── useDragDrop.ts
│   │   ├── useProgressTimer.ts
│   │   └── useReaderKeyboard.ts
│   ├── types/
│   │   ├── index.ts         # 类型定义 (BookFormat/BookEntry/Bookmark/Highlight/...)
│   │   ├── epub.d.ts        # epub.js 类型扩展
│   │   └── electron.d.ts    # ElectronAPI 接口
│   ├── utils/
│   │   ├── db.ts            # IndexedDB 操作 (v8→v9 迁移)
│   │   ├── styles.ts        # 共享样式常量
│   │   ├── customTheme.ts   # 自定义主题 CSS 生成
│   │   ├── formatDetection.ts # 格式检测工具 (epub/txt/mobi)
│   │   ├── enableSmoothScroll.ts
│   │   ├── animation.ts
│   │   ├── constants.ts
│   │   ├── electronAPI.ts
│   │   └── logger.ts
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
