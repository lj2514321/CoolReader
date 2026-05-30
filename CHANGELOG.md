# Changelog

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