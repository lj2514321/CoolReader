# Changelog

## [1.5.2] — 2026-06-01

### 类型系统清理（any Type Cleanup）

- **类型定义统一**：`src/types/electron.d.ts` 全部 15+ 个方法签名从 `any` 替换为共享类型（`WebDAVConfig`/`AIConfig`/`AIChatMessage`/`SyncResult`/`SyncProgressEvent`），消除 `[key: string]: any`；`electron/preload/index.ts` 参数类型同步映射，消除全部 15 个 `any`；全局扩展 `File.path?` 接口以支持 Electron 非标准属性
- **epub.js 类型增强**：`src/types/epub.d.ts` 新增 `Rendition.manager`、`Manager` 完整接口（container/settings/isPaginated/layout/views/next/prev/display）、`View`/`Section`/`Book`/`Spine` 缺失属性补充，覆盖 5 个 epub.js 消费文件（`enableSmoothScroll.ts`、`animation.ts`、`useReaderControls.ts`、`epubInit.ts`、`useBookEngine.ts`）
- **错误处理规范化**：全部 5 处 `catch (err: any)` 替换为 `catch (err: unknown)` + `err instanceof Error` 类型守卫，覆盖 `AIPanel.tsx`、`AISettings.tsx`、`SyncSettings.tsx`
- **数据访问类型修复**：`useInitialLoad.ts` 中 `(r as any).cover` 改为 `BookRecord` 接口 `cover?: string`；`useDragDrop.ts` 中 `(file as any).path` 改为 `file.path`
- **消除内联声明**：`src/App.tsx` 中 `declare global { interface Window { electronAPI } }` 内联块删除，类型来源统一至 `electron.d.ts`
- **总成果**：`src/` + `electron/preload/` 范围内 **0 个显式 `any` 剩余**（目标：≤5），构建通过率不变

## [1.5.1] — 2026-05-30

### 内联样式解耦（Style Decouple）

- **Reader.tsx**：933 行瘦身至 724 行（-22%），内联 `glass()`/`btn()` 函数替换为 `.reader-glass`/`.reader-btn` CSS 类；7 个主题颜色常量（`fg`/`panelText`/`panelMuted` 等）迁移至 `--reader-*` CSS 变量；Aa 面板/搜索/标记/选择工具栏/上下文菜单/AI 按钮全部使用 CSS 类
- **Sidebar.tsx**：126 行内联样式完全解耦（0 残留 `style={}`），`sbTheme` Record 删除，`onMouseEnter`/`onMouseLeave` 改为 CSS `:hover`
- **AIPanel.tsx**：281 行内联样式基本完全解耦（仅 1 处动态高度残留），`glassStyle` useMemo + `fg`/`muted` 常量 + `_pulseId` JS keyframes 全部删除
- **新增 3 个 CSS 文件**：`src/styles/components/reader.css`（459 行）、`sidebar.css`（137 行）、`ai-panel.css`（236 行），总计 832 行样式从 TSX 迁移至独立 CSS
- **三主题自动适配**：`data-theme="dark|light|sepia"` 属性驱动 CSS 变量切换，custom 模式映射为 light
- **零功能变更**：纯样式重构，组件逻辑/epub.js 集成/排除组件（Library/BookShelf/SettingsPage 等）完全未触及

## [1.5.0] — 2026-05-30

### UI 主题系统（毛玻璃 → 双主题）

- 新增 CSS 设计系统 `src/styles/tokens.css`，定义圆角/过渡/导航文字色等共享 design token，支撑双主题切换
- 新增主题入口文件 `src/styles/theme.css`，统一管理 `[data-ui-theme]` 属性选择器
- 新增 `src/styles/themes/theme-glass.css`（毛玻璃主题）和 `src/styles/themes/theme-flat.css`（扁平主题），覆盖 TitleBar、BookShelf、Library、SidebarNav、SettingsPage、ReadingStats、SyncSettings、AISettings 等所有非 Reader 组件
- 新增 `src/styles/useTheme.ts` React hook，模块级 `sharedTheme` 共享状态 + `listeners` Set 广播机制，任一组件调用 `setTheme` 即时同步所有消费者
- SettingsPage 新增 Glass / Flat 单选切换器，入口内置 CSS 类切换

### 背景预设与主题分离

- `src/utils/styles.ts` 新增 `flatPresets`（6 套浅色渐变：浅灰/霜白/春雾/天光/暖光/玫瑰）和 `getPresets(theme)` 辅助函数
- Library.tsx 引入主题感知的 `bgKey` 初始化，各自独立 DB 键存储（`bgPreset` / `bgPreset-flat`）
- SettingsPage 预设网格和摘要随主题切换显示对应预设列表（Glass 深色预设 / Flat 浅色预设）

### 背景热切换修复

- App.tsx 从单 `bgGradient` 状态改为 `bgByTheme` 按主题存储，切换主题时即时响应，无缝衔接
- useTheme.ts 从各自独立状态改为模块级 `sharedTheme` + `listeners` Set，彻底解决多组件热切换不一致问题

### 导航栏文字对比修复

- `tokens.css` 新增 `--nav-title-color` / `--nav-subtitle-color` CSS 变量，Glass=白色，Flat=深色，SidebarNav h1/p 颜色从硬编码改为 `var(--...)` 引用
- `SidebarNav.css` Flat 按钮样式（深色文字 + 灰色背景）补充完整

### Flat 布局修复

- `library.css` 补充 Flat 主题布局属性（`height:100%`、`display:flex`、`flex-direction:row` 等）
- 移除 Flat 下 CSS 层对 `.library-root` 背景的强制覆盖

### 内联样式迁移

- 所有非 Reader 组件从内联 `style={...}` 迁移到 CSS class 文件，结构与表现分离

### 导航栏悬停动效

- 新建 `src/components/SidebarNav.css`，实现 scale/bounce/glow 悬停动画（`transform: scale(1.08)`、渐变扫过 shimmer、图标弹跳 `@keyframes iconBounce`）
- SidebarNav.tsx 从内联 style + DOM handler 改为 CSS class 切换，事件处理与样式逻辑解耦
- 增加 `:focus-visible` 焦点态样式和 `@media (prefers-reduced-motion: reduce)` 减弱动画支持

---

## [1.4.4] — 2026-05-21

### 缺陷修复

- 修复 child logger 通过 basicConfig 传播的问题（50be997）

---

## [1.4.1] — 2026-05-20

### 功能完善

- （基于 1.4.0 之后的 GitHub Actions CI 流程完善）

---

## [1.4.0] — 2026-05-19

### 全文搜索

- 阅读页 🔍 按钮唤起搜索面板，懒构建索引，大小写不敏感匹配，结果自动跳转高亮

### 书签系统

- 阅读页 📑 按钮管理书签/标注，书签快速跳转，删除可见按钮

### 文本标注

- 选中文字后悬浮工具栏，四色高亮标记（黄/绿/蓝/粉），持久化到 IndexedDB

---

## [1.3.6] — 2026-05-19

### 注释导航

- 点击正文注释序号跳转注释内容，自动返回原文

---

## [1.3.5] — 2026-05-18

### 目录导航

- 侧栏目录树，当前章节高亮跟随，自动滚动居中，导航竞态修复

---

## [1.1.0] — 2026-05-10

### 书架管理

- 导入 EPUB 文件，封面/标题/作者展示
- 删除确认（仅移出书架或同时删除源文件）

### 阅读主题

- 亮色/暖黄/暗色 三种阅读主题，持久化记忆

### 自定义阅读主题

- Aa 面板支持纯色（颜色选择器 + 透明度）和渐变（线性/径向 + 色标编辑器）自定义背景
- 内置碧海/极夜/日出/极光紫四套预设

---

## [1.0.3] — 2026-05-09

### 缺陷修复

- 修复若干 bug（b7e9669）

---

## [1.0.2] — 2026-05-08

### 自动流修复

- 修复自动流相关问题（6d10039）

---

## [1.0.1] — 2026-05-08

### 自动流

- 添加自动流功能（6cc300e）

---

## [1.0.0] — 2026-05-08

### 初始版本

- 项目脚手架与配置模板（00a0bf5）
- Electron + React + TypeScript + epub.js 环境搭建
- 毛玻璃风格（backdrop-filter）全窗 UI
- 自定义 frameless 窗口，一体化 TitleBar
- 基础阅读器：翻页动画（淡入淡出/左右滑动/3D翻书/滑动+淡出）
- 阅读进度追踪（秒级持久化 IndexedDB）
- 6 种渐变背景预设，滑入/滑出二级页动画
- 阅读时间追踪，今日阅读时长统计，书架页顶部展示