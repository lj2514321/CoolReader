# CoolReader 设计系统文档

> 更新日期：2026-06-17
> 设计方向：暗夜书房 / 日间图书馆

---

## 设计理念

两套 UI 主题共享同一视觉身份——衬线正文 + 无衬线 UI、墨青 accent、暖灰基底。

| 轴 | 暗夜书房 (glass) | 日间图书馆 (flat) |
|---|---|---|
| 基底 | `#1a1a1f` 暖石墨 | `#f7f4ed` 暖纸白 |
| 文字 | `#f4ede0` 纸奶白 | `#1c1c1e` 近黑 |
| 强调 | `#2d5a5a` 墨青 | `#1f4747` 深墨青 |
| 光晕 | 琥珀纸光 6% 不透明度 | 琥珀纸光 30% 不透明度 |
| 玻璃 | 16px blur + 125% saturate | 8px blur + 105% saturate (或无) |

---

## 色彩系统

### 表面层

| Token | 暗夜 | 日间 |
|---|---|---|
| `--bg-base` | `#1a1a1f` | `#f7f4ed` |
| `--bg-elev-1` | `#1f1f25` | `#ffffff` |
| `--bg-elev-2` | `#26262d` | `#fbf8f0` |
| `--bg-overlay` | `rgba(10,10,14,0.55)` | `rgba(28,28,30,0.18)` |

### 文字层 (ink)

| Token | 暗夜 | 日间 |
|---|---|---|
| `--ink-100` | `#f4ede0` | `#1c1c1e` |
| `--ink-80` | `rgba(244,237,224,0.80)` | `rgba(28,28,30,0.78)` |
| `--ink-60` | `rgba(244,237,224,0.60)` | `rgba(28,28,30,0.55)` |
| `--ink-40` | `rgba(244,237,224,0.40)` | `rgba(28,28,30,0.35)` |
| `--ink-20` | `rgba(244,237,224,0.20)` | `rgba(28,28,30,0.12)` |
| `--ink-10` | `rgba(244,237,224,0.10)` | `rgba(28,28,30,0.06)` |

### 强调色

| Token | 暗夜 | 日间 |
|---|---|---|
| `--accent` | `#2d5a5a` | `#1f4747` |
| `--accent-soft` | `rgba(45,90,90,0.20)` | `rgba(31,71,71,0.16)` |
| `--accent-strong` | `#3d7a7a` | `#163838` |
| `--warn` | `#c87a3a` | `#b36628` |
| `--danger` | `#a8392e` | `#8e2f25` |

### 光晕

| Token | 暗夜 | 日间 |
|---|---|---|
| `--halo-paper` | `#d4a574` | `#f0e4cc` |
| `--halo-paper-2` | `#b88a5a` | `#e0d4b8` |
| `--halo-opacity` | `0.06` | `0.30` |

---

## 字体系统

### 字体族

| Token | 值 | 用途 |
|---|---|---|
| `--font-serif` | Iowan Old Style → Charter → Source Han Serif SC → Songti SC → STSong → Georgia → serif | 正文、书名、章节标题 |
| `--font-sans` | system-ui → PingFang SC → Microsoft YaHei → sans-serif | UI 控件、按钮、标签 |
| `--font-mono` | JetBrains Mono → ui-monospace → Menlo → monospace | 代码、等宽文本 |

### 字号

| Token | 值 | 用途 |
|---|---|---|
| `--fs-display` | 32px | 页面大标题 |
| `--fs-h1` | 22px | 页面标题 |
| `--fs-h2` | 18px | 副标题 |
| `--fs-book-title` | 15px | 书架书名 |
| `--fs-body-ui` | 13px | 通用 UI |
| `--fs-caption` | 11px | 标签、计数 |
| `--fs-reader-body` | 18px | 阅读正文 |
| `--fs-reader-h1` | 24px | 章节标题 |

### 行高

| Token | 值 | 用途 |
|---|---|---|
| `--lh-tight` | 1.3 | 标题 |
| `--lh-normal` | 1.5 | UI 文本 |
| `--lh-relaxed` | 1.7 | 辅助文本 |
| `--lh-reader` | 1.8 | 阅读正文 |

---

## 圆角体系

| Token | 值 | 用途 |
|---|---|---|
| `--r-book` | 2px | 书脊、封面 |
| `--r-btn` | 6px | 按钮 |
| `--r-card` | 10px | 卡片 |
| `--r-panel` | 14px | 面板 |
| `--r-modal` | 18px | 弹窗 |

---

## 间距体系

| Token | 值 |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 24px |
| `--space-6` | 32px |
| `--space-7` | 48px |
| `--space-8` | 64px |

---

## 玻璃效果

| Token | 暗夜 | 日间 |
|---|---|---|
| `--glass-tint` | `rgba(255,255,255,0.06)` | `rgba(255,255,255,0.30)` |
| `--glass-tint-strong` | `rgba(255,255,255,0.10)` | `rgba(255,255,255,0.50)` |
| `--glass-border-top` | `rgba(255,248,231,0.14)` | `rgba(255,248,231,0.50)` |
| `--glass-border-bot` | `rgba(0,0,0,0.35)` | `rgba(28,28,30,0.06)` |
| `--glass-blur` | `blur(16px) saturate(125%)` | `blur(8px) saturate(105%)` |

---

## 阴影

| Token | 暗夜 | 日间 |
|---|---|---|
| `--shadow-glass` | 内嵌暖白顶边 + 黑底边 + 12px 外阴影 | 内嵌暖白顶边 + 淡底边 + 2px 外阴影 |
| `--shadow-floating` | 20px 黑阴影 | 10px 暖阴影 |
| `--shadow-press` | 1px 黑内阴影 | 1px 暖内阴影 |

---

## 页面级组件

### 书架页 (BookShelf)

- 书卡：`--bg-elev-1` 背景、`--ink-20` 边框、`--r-card` 圆角
- 悬停：`--accent-soft` 边框
- 书名：`--font-serif`、`--fs-book-title`、`--ink-100`
- 进度条：1px track `--ink-10`、fill `--accent`
- 书架标题：左侧 2px `--accent` 边线

### 阅读页 (Reader)

#### 顶栏

简化为 5 个交互：

```
[← 返回]    [书名]              [Aa] [🔖] [⋮]
```

- `Aa`：展开排版面板
- `🔖`：切换书签
- `⋮`：更多菜单（目录、搜索、主题、AI 助手、全屏）

#### 排版面板

分两层：

**快速调节**（默认展示）：
- 主题色块（浅色 / 护眼 / 暗色 + 自定义入口）
- 字号 ± 滑块
- 行距 ± 滑块

**高级设置**（折叠）：
- 字体选择、字重、边距
- 翻页模式（分页 / 滚动，Lucide 图标）
- 翻页动画
- 低性能模式

#### 底部栏

```
[上一页]  [━━━━━━━━━━━━━━░░░░░] 67%  [下一页]
```

- 进度条：2px track + fill，无 dot
- 百分比：`--reader-fg` 0.5 opacity

#### 阅读主题

独立于 UI 主题（glass/flat），由 `[data-theme]` 控制：

| 变量 | 浅色 | 护眼 | 暗色 |
|---|---|---|---|
| `--reader-bg` | `#f7f4ed` | `#f4ecd8` | `#1a1a1f` |
| `--reader-fg` | `#3a3530` | `#4a3f30` | `#d4cabb` |
| `--reader-glass-bg` | `rgba(247,244,237,0.80)` | `rgba(244,236,216,0.80)` | `rgba(26,26,31,0.80)` |

#### AI 按钮

已移除悬浮按钮。AI 通过 `⋮` → "AI 助手" 访问。

### 侧栏 (Sidebar)

- 激活态：`#3d7a7a`（暗）/ `#1f4747`（亮）/ `#2d5a5a`（护眼）
- 背景：`--bg-elev-1`、边框 `--ink-10`

### 统计页 (ReadingStats)

- 统计卡片：透明背景、1px `--ink-20` 边框
- 数值：`--font-serif`、32px、`--ink-100`
- 图表柱：1px `--ink-60`、今日 2px `--accent`

### 设置页 (Settings)

- 设置项：透明背景、`--ink-20` 底边线
- 保存按钮：`--accent` 背景、`--bg-base` 文字

### AI 面板 (AIPanel)

- 用户消息：`rgba(45,90,90,0.15)` 背景（墨青色调）
- 助手消息：透明背景、左侧 2px `--ai-fg` 边线、`--font-serif`
- 发送按钮：`--ai-fg` 背景、`--ai-bg` 文字（反色）

### TitleBar

- 高度：32px
- 底边：1px `--ink-20`
- 关闭按钮悬停：`--danger` 背景

---

## 图标规范

全部使用 `lucide-react`，不使用 emoji。

| 用途 | 图标 |
|---|---|
| 返回 | `ArrowLeft` |
| 目录 | `List` |
| 搜索 | `Search` |
| 书签 | `Bookmark` |
| 全屏 | `Maximize2` |
| 设置 | `SlidersHorizontal` |
| AI | `Sparkles` |
| 分页模式 | `FileText` |
| 滚动模式 | `ScrollText` |
| 更多菜单 | `MoreVertical` |

---

## 预设背景

### 暗夜书房预设

| 名称 | 渐变 |
|---|---|
| 墨夜 | `#1a1a1f` → `#26262d` |
| 墨青 | `#141f1f` → `#1f3a3a` |
| 琥珀 | `#1a150a` → `#1f1a0f` |
| 石板 | `#16171c` → `#22232c` |
| 绯红 | `#1c1215` → `#1f1018` |
| 森林 | `#0f1a12` → `#10201a` |

### 日间图书馆预设

| 名称 | 渐变 |
|---|---|
| 暖纸 | `#f7f4ed` → `#efe9dd` |
| 霜白 | `#fafaf8` → `#f2f0ec` |
| 春雾 | `#f0f5f0` → `#e4ece4` |
| 天光 | `#f0f3f7` → `#e0e8f0` |
| 暖光 | `#f7f0e0` → `#efe4cc` |
| 玫瑰 | `#f7eff0` → `#f0e0e4` |

---

## 紫蓝色清除记录

以下颜色已从代码库中完全移除：

- `#6366f1`、`#8b5cf6`、`#a78bfa`、`#7c3aed`
- `#667eea`、`#764ba2`、`#818cf8`
- `rgba(99,102,241,...)`、`rgba(168,85,247,...)`
- `#ece8f4`（旧 lavender 阅读背景）
- `#2d2b55`（旧暗紫文字）
- `#c8c8e0`（旧冷银文字）
- `#0a0a1a`（旧冷蓝黑背景）
- `rgba(15,12,41,...)`（旧紫蓝玻璃）

替换为墨青 (`#2d5a5a`) / 暖灰 (`#3a3530`) / 暖纸 (`#f7f4ed`) 色系。

---

## 2026-07 UI Refinement Notes

CoolReader now favors a line-led interface over heavy card surfaces. Home and reader UI should keep custom background colors visible through primary surfaces.

- Use transparent surfaces plus `1px` token borders for bookshelf cards, continue-reading items, and navigation containers.
- Avoid fixed elevated backgrounds such as `--bg-elev-1` for large persistent home-page panels unless the component must visually float above content.
- Keep navigation buttons borderless; use a subtle background tint and a left accent line for hover/active states.
- Reader chrome uses full-width top and bottom bars with directional shadows, slide/fade wake animations, and no mouse-move wake behavior.
- Reader sidebars should animate with `transform`, not width changes, so the reading viewport does not reflow during transitions.
- In paginated reading mode, hide content scrollbars. In scroll mode, show thin themed scrollbars only.
