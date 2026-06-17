# 更新日志

## [未发布] — 2026-06-17

### 设计系统重构：暗夜书房 / 日间图书馆

全面重写视觉体系，清除旧紫蓝色设计，建立统一的暖色系设计语言。

---

### 新增

- **`tokens.css`** — 设计 token 基础层，包含色彩、字体、圆角、间距、玻璃效果、阴影、组件级 token，双主题自动切换
- **`docs/design-system.md`** — 完整设计系统文档
- **阅读页更多菜单 (⋮)** — 二级菜单收纳目录、搜索、主题切换、AI 助手、全屏，顶栏从 9 按钮精简到 5 个
- **排版面板分层** — 快速调节（字号、行距、主题）默认展示，高级设置（字体、字重、边距、翻页模式、动画）折叠收纳
- **Lucide 图标** — `FileText`（分页）、`ScrollText`（滚动）、`ArrowLeft`（返回）、`Sparkles`（AI）、`MoreVertical`（更多）替换所有 emoji

### 变更

#### 色彩体系

- 主 accent：紫色系 `#6366f1` → 墨青 `#2d5a5a`
- 暗色基底：`#0a0a1a`（冷蓝黑）→ `#1a1a1f`（暖石墨）
- 亮色基底：`#ffffff` → `#f7f4ed`（暖纸白）
- 文字色：`#2d2b55`（暗紫）→ `#3a3530`（暖灰棕）/ `#f4ede0`（纸奶白）
- 阅读背景：`#ece8f4`（lavender）→ `#f7f4ed`（暖纸白）
- AI 面板用户消息：`rgba(99,102,241,0.15)` → `rgba(45,90,90,0.15)`（墨青）
- 侧栏激活态：`#a78bfa`/`#7c3aed` → `#3d7a7a`/`#1f4747`
- 所有预设渐变重写为暖色系（墨夜、墨青、琥珀、暖纸等）

#### 书架页

- `.book-card`：背景 `var(--bg-elev-1)`、边框 `var(--ink-20)`、圆角 `var(--r-card)`
- 书名：`--font-serif`、`--fs-book-title`、`font-weight: 500`
- 搜索框：无边框、底部 1px 线、聚焦时 `--accent` 底线
- 空状态：移除 Library 图标和描述文字
- 删除弹窗：`--bg-elev-2` 背景、`--shadow-floating`、`--r-modal`
- 今日阅读：移除 emoji 🎯，改用 `<Target />` Lucide 图标

#### 阅读页

- 顶栏：9 按钮 → 5 交互（返回、标题、Aa、书签、更多）
- 进度条：1px → 2px track，移除 2×8px dot
- AI 按钮：移除悬浮实色按钮，改为仅通过 ⋮ 菜单访问
- 阅读主题变量：`--reader-bg`、`--reader-fg`、`--reader-glass-bg` 全部换为暖色
- 翻页模式按钮：`📄`/`📜` emoji → `<FileText>`/`<ScrollText>` Lucide

#### 标题栏

- 32px 高度、1px `--ink-20` 底边线
- 按钮悬停用 `--ink-10` 微底色
- 关闭按钮悬停用 `--danger`

#### 侧栏

- 背景改用 `--bg-elev-1`、边框 `--ink-10`
- 激活态颜色换为墨青系

#### 统计页

- 统计卡片：透明背景、1px `--ink-20` 边框、圆角 0
- 数值：`--font-serif`、32px
- 图表柱：1px `--ink-60`、今日 2px `--accent`

#### 设置页

- 设置项：透明背景、`--ink-20` 底边线
- 保存按钮：`--accent` 背景、`--bg-base` 文字

#### AI 面板

- 标题：`--font-serif`、18px、`font-weight: 500`
- 助手消息：透明背景、左侧 2px `--ai-fg` 边线、`--font-serif`
- 发送按钮：`--ai-fg` 背景、`--ai-bg` 文字（反色）

#### 图书馆页

- 光晕球：`--halo-paper` + `--halo-opacity` 替代旧紫蓝光球
- 预设默认值：`deepPurple` → `inkNight`、`lightGray` → `warmPaper`

### 修复

- **flat 主题布局崩溃** — `.library-root`、`.library-content`、`.library-page` 的布局属性从 `[data-ui-theme="glass"]` 选择器移到基础层，flat 主题不再丢失 flex 布局
- **flat 主题 backdrop-filter 残留** — `bookshelf.css`、`reader.css`、`ai-panel.css` 中的硬编码 blur 在 flat 主题下自动清除
- **阅读页键盘/滚轮翻页误触 UI** — `useReaderKeyboard` 和 `Reader.tsx` 的键盘监听器不再对翻页键调用 `showControls()`；mousemove 加 12px 阈值 + 200ms 防抖
- **`bookshelf.css` margin-top 缺单位** — `margin-top: 4` → `margin-top: 4px`
- **reader.css flat 主题 `--reader-glass-bg` 未覆盖** — 添加 `[data-ui-theme="flat"][data-theme]` 不透明覆盖
- **ai-panel.css 硬编码 `backdrop-filter`** — 改用 `var(--glass-blur)` + flat 主题清除

### 移除

- **所有 `[data-ui-theme="flat"]` 硬编码块** — bookshelf、reading-stats、settings、settings-form、ai-panel、titlebar、library、sidebar 中的重复 flat 样式块，改由 tokens.css 自动切换
- **紫蓝色完全清除** — `#6366f1`、`#8b5cf6`、`#a78bfa`、`#7c3aed`、`#667eea`、`#764ba2`、`#818cf8`、`rgba(99,102,241,...)`、`rgba(168,85,247,...)` 从所有 `.ts`、`.tsx`、`.css` 文件中移除
- **悬浮 AI 按钮** — 阅读页右下角实色方块按钮
- **emoji 图标** — 🎯、📄、📜、← 替换为 Lucide 组件

---

### 构建产物

- CSS：89.14 kB（从 103.67 kB 峰值下降，因删除 flat 硬编码块）
- JS：1,405.19 kB
