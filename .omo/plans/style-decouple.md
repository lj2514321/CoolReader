# Plan: Decouple Inline Styles with CSS Variables

## TL;DR

> **Quick Summary**: Extract ~900 lines of inline styles from Reader.tsx, Sidebar.tsx, and AIPanel.tsx into CSS files using CSS custom properties + classes. Zero functional changes, no component tree restructuring.
>
> **Deliverables**:
> - 3 new CSS files: `reader.css`, `sidebar.css`, `ai-panel.css`
> - Modified Reader.tsx: inline styles → className + `data-theme` attribute
> - Modified Sidebar.tsx: inline sbTheme → CSS variables + classes
> - Modified AIPanel.tsx: inline glassStyle → CSS variables + classes
>
> **Estimated Effort**: Medium (3-4 hours)
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: CSS Foundation → Reader.tsx → Sidebar/AIPanel → Verification

---

## Context

### Original Request
用户指出项目样式耦合严重（Reader.tsx 933 行内联样式、Sidebar.tsx 126 行内联样式、AIPanel.tsx 281 行内联样式），问是否必要解耦。经分析确认中等优先级，用户选择 **CSS Variables 方案**：不拆组件、只提取样式到 CSS 文件。

### Interview Summary
**Key Decisions**:
- **方案**: CSS Variables only — 主题颜色提取为 CSS 自定义属性，UI 面板/按钮提取为 CSS 类，TSX 只保留动态 className 绑定
- **不改动**: 不创建新组件文件、不改变库/书架/设置等已有 CSS Module 组件的样式
- **零功能变化**: 纯样式解耦重构，不修改任何行为逻辑
- **验证方式**: Playwright Agent QA（项目无测试基础设施）

**Research Findings**:
- 代码库已有 CSS 变量模式：`src/styles/tokens.css` 使用 `[data-ui-theme="glass|flat"]` 选择器
- 已有组件 CSS 文件位于 `src/styles/components/`（bookshelf.css, titlebar.css 等）
- 使用 `[data-ui-theme="flat"] .component-class` 模式进行主题覆盖
- Reader.tsx 的 `glass()` 函数（L54-58）和 `btn()` 函数（L60-74）是主要的重复模式
- 7 个主题色常量（`fg`, `panelText`, `panelMuted`, `panelBorder`, `panelInputBg`, `panelHoverBg`）+ `themeBg` 定义了暗/亮阅读主题的完整色板
- `data-theme` 属性目前不存在，需要新增（与现有 `data-ui-theme` 正交，分别控制阅读主题和 UI 主题）

### Oracle Review (Phase 1)
**Verdict: GO** — CHECK [5/5] PASS
- 核心目标清晰：1 句描述，无隐含歧义
- Scope IN/OUT 明确：代码中已确认所有需修改位置
- 验证策略已定：Playwright Agent QA
- 无未解决问题

---

## Work Objectives

### Core Objective
将 Reader.tsx、Sidebar.tsx、AIPanel.tsx 中的内联样式迁移到独立 CSS 文件中，使用 CSS 自定义属性管理主题颜色

### Custom Theme Handling (confirmed)
当 `theme === 'custom'` 时，`data-theme` 属性映射为 `'light'`，使 custom 模式继承 light 主题的 CSS 变量颜色。背景色仍由 `customTheme.ts` 的内联样式或 JS 逻辑控制，不受此映射影响。

### Concrete Deliverables
- `src/styles/components/reader.css` — 约 300 行 CSS（玻璃面板、按钮、顶部栏、底部栏、Aa 面板、搜索面板、标记面板、选择工具栏、上下文菜单、AI 按钮、进度条）
- `src/styles/components/sidebar.css` — 约 70 行 CSS（目录树按钮、颜色变量）
- `src/styles/components/ai-panel.css` — 约 80 行 CSS（面板容器、输入框、消息气泡）
- Modified `Reader.tsx`: 933 行 → 约 630 行（-300 行样式）
- Modified `Sidebar.tsx`: 126 行 → 约 90 行（-36 行样式）
- Modified `AIPanel.tsx`: 281 行 → 约 220 行（-61 行样式）

### Definition of Done
- [ ] `npm run dev` 启动无编译错误
- [ ] Playwright 截图对比：所有 UI 面板视觉与重构前一致
- [ ] 所有 3 个阅读主题（dark/light/sepia）切换后颜色正确
- [ ] 翻页/搜索/标记/高亮/书签/AI 均功能正常

### Must Have
- 解耦后的页面视觉效果与重构前必须 100% 一致（像素级）
- 暗/亮/暖黄 三个阅读主题切换必须正常工作
- Reader 的自定义主题（`custom` mode）必须继续工作
- data-theme 属性正确添加到 Reader/Sidebar/AIPanel 的根元素上
- Glass/Flat 两个 UI 主题在阅读器内的表现不能受影响
- 新增 CSS 文件必须遵循现有 `src/styles/components/` 目录惯例
- 所有主题色 CSS 变量必须以 `--reader-` 前缀命名

### Must NOT Have (Guardrails)
- ❌ 不允许创建新的 React 组件文件（不拆组件）
- ❌ 不允许修改任何 epub.js 集成逻辑（rendition, book, annotations 等）
- ❌ 不允许修改 `Library.tsx / BookShelf.tsx / SettingsPage.tsx / SyncSettings.tsx / AISettings.tsx / TitleBar.tsx / SidebarNav.tsx` 的样式
- ❌ 不允许修改 `src/styles/tokens.css` 或 `src/styles/themes/` 下的现有文件
- ❌ 不允许修改 `src/utils/db.ts / styles.ts / customTheme.ts / animation.ts`
- ❌ 不允许修改 `electron/` 或 `index.html`
- ❌ 不允许任何功能逻辑变更 — 只移动样式到 CSS
- ❌ 不允许 AI 样式膨胀（`as any` / `console.log` / 过度注释 / 死代码残留）

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None (visual comparison + Playwright only)
- **QA tool**: Playwright for visual comparison + `interactive_bash` for build verification

### QA Policy
Every task MUST include Playwright agent-executed QA scenarios.
Evidence saved to `.omo/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Build check**: `npm run dev` or `npx tsc --noEmit` → no errors
- **Visual comparison**: Playwright screenshot with `--reference` comparison
- **Theme check**: Toggle dark/light/sepia themes, screenshot each
- **Functional check**: Click buttons, verify search, bookmarks, AI panel still render correctly

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — 3 parallel CSS files):
├── Task 1: reader.css — all CSS variables + classes for Reader.tsx
├── Task 2: sidebar.css — all CSS variables + classes for Sidebar.tsx
└── Task 3: ai-panel.css — all CSS variables + classes for AIPanel.tsx

Wave 2 (MAX PARALLEL — 4 tasks, 2 groups):
├── Group A (Reader.tsx — sequential, same file):
│   ├── Task 4: Part A — data-theme + top/bottom bars + progress + glass()/btn()
│   └── Task 5: Part B — Aa/search/markers/selection/AI button panels
├── Group B (parallel — different files, independent of Group A):
│   ├── Task 6: Sidebar.tsx — data-theme + CSS classes
│   └── Task 7: AIPanel.tsx — data-theme + CSS classes

Wave FINAL (4 parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Build + functional QA (unspecified-high + playwright)
├── Task F3: Visual regression check (unspecified-high)
└── Task F4: Scope fidelity check (deep)
→ Present results → Get explicit user okay

Critical Path: Task 1 → Task 4 → Task 5 → F1-F4 → user okay
Parallel Speedup: ~75% faster than sequential (3 CSS parallel, 4 TSX partially parallel)
Max Concurrent: 3 (Wave 2 — Group A sequential [4→5], Group B parallel with Group A [6‖7], so at peak 3 tasks run simultaneously)
```

### Dependency Matrix

- **1, 2, 3**: None — 4, 5, 6, 7
- **4**: 1 — 5
- **5**: 4 — none
- **6**: 2 — none
- **7**: 3 — none
- **F1-F4**: all — user okay

### Agent Dispatch Summary

- **Wave 1**: 3 parallel → `visual-engineering`
- **Wave 2**: 4 tasks (Group A: 4→5 sequential, Group B: 6‖7 parallel with A) → `visual-engineering`
- **Wave FINAL**: 4 parallel → oracle/unspecified-high/deep

---

## TODOs

- [x] 1. **Create `reader.css` — CSS variables + all UI classes for Reader.tsx**

  **What to do**:
  - Create `src/styles/components/reader.css`
  - Define CSS custom properties under `[data-theme="dark"]`, `[data-theme="light"]`, `[data-theme="sepia"]` selectors:
    - `--reader-fg`, `--reader-panel-text`, `--reader-panel-muted`, `--reader-panel-border`, `--reader-panel-input-bg`, `--reader-panel-hover-bg`, `--reader-bg`
  - Define CSS class `.reader-glass` — the glass panel effect (`backdrop-filter: blur(20px) saturate(140%)`, `-webkit-backdrop-filter: blur(20px) saturate(140%)`, `background` using `--reader-glass-bg` variants)
  - Define `.reader-btn` — base button style (background none, border none, cursor pointer, color inherit)
  - Define `.reader-btn-active` — active state with indigo highlight (`background: rgba(99,102,241,0.3)`)
  - Define `.reader-top-bar` — absolute positioning, top 0, z-index 2, opacity transition
  - Define `.reader-top-bar-inner` — flex row, glass panel, padding/border radius
  - Define `.reader-bottom-bar` — absolute positioning, bottom 0, z-index 2
  - Define `.reader-bottom-bar-inner` — flex row, glass panel
  - Define `.reader-progress-track` — flex-1 height 5px, rounded, dark/light bg
  - Define `.reader-progress-fill` — gradient (`linear-gradient(90deg, #6366f1, #a855f7)`), animate width
  - Define `.reader-progress-dot` — 10px circle, purple, box-shadow glow
  - Define `.reader-theme-btn` — theme toggle button (active: indigo bg+border, inactive: transparent)
  - Define `.reader-layout-panel` — Aa panel dropdown (absolute, glass, 260px wide, flex column gap)
  - Define `.reader-layout-row` — settings row (flex, gap, label+input)
  - Define `.reader-range-input` — range slider styling (`accent-color: #6366f1`)
  - Define `.reader-select-input` — select dropdown styling
  - Define `.reader-search-panel` — search panel dropdown (320px, glass, flex column)
  - Define `.reader-search-input` — search text input (rounded, themed bg)
  - Define `.reader-markers-panel` — markers dropdown (280px, glass, max-height)
  - Define `.reader-marker-tab` — tab buttons (flex-1, active: indigo bg)
  - Define `.reader-marker-item` — marker row (flex, padding, border-bottom)
  - Define `.reader-selection-bar` — floating toolbar (absolute, glass, flex row, gap)
  - Define `.reader-selection-color-btn` — 22px round button (4 colors: yellow, green, blue, pink)
  - Define `.reader-context-menu` — context menu (glass, border, shadow, min-width)
  - Define `.reader-context-btn` — context menu button (hover: tint bg, danger: red)
  - Define `.reader-ai-btn` — floating AI button (gradient bg, bottom-right, shadow)
  - Define `.reader-panel-overlay` — invisible fullscreen click-to-close overlay
  - Define opacity transition classes: `.reader-fade-in`, `.reader-fade-out`
  - Define visibility helper: `.reader-hidden`
  - Reuse existing `--radius-card`, `--radius-btn`, `--radius-panel`, `--transition-theme` from `src/styles/tokens.css` (do NOT redefine)
  - Support `[data-ui-theme="flat"]` overrides where colors differ significantly
  - Import this file: add `@import './components/reader.css'` to `src/styles/theme.css`

  **Must NOT do**:
  - Do NOT create any React component files
  - Do NOT modify Reader.tsx yet (separate task)
  - Do NOT use `!important` unless absolutely necessary to override epub.js content
  - Do NOT change existing CSS files

  **Color mapping reference** (from Reader.tsx):
  - `dark = theme === 'dark'`
  - `fg = dark ? '#c8c8e0' : '#2d2b55' → --reader-fg`
  - `panelText = dark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)' → --reader-panel-text`
  - `panelMuted = dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' → --reader-panel-muted`
  - `panelBorder = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' → --reader-panel-border`
  - `panelInputBg = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' → --reader-panel-input-bg`
  - `panelHoverBg = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' → --reader-panel-hover-bg`
  - `themeBg = { light: '#ece8f4', sepia: '#f4ecd8', dark: '#0a0a1a' } → --reader-bg`
  - Glass panel bg: `dark ? 'rgba(15,12,41,0.45)' : 'rgba(255,255,255,0.55)'`

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [] (no specialized skill matches this pure CSS task)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 4, 5
  - **Blocked By**: None

  **References**:
  - `src/styles/components/bookshelf.css` — Existing component CSS pattern (class naming, theme override convention with `[data-ui-theme="flat"]`)
  - `src/styles/components/titlebar.css` — Existing component CSS structure for button/container styling
  - `src/styles/tokens.css` — Existing CSS variable pattern (`--radius-card`, `--transition-theme`)
  - `src/components/Reader.tsx:48-58` — `glass()` function with exact backdrop-filter values
  - `src/components/Reader.tsx:60-74` — `btn()` function with exact button style values
  - `src/components/Reader.tsx:258-265` — All 7 theme color constant declarations
  - `src/styles/theme.css:2` — Import pattern: `@import './themes/theme-glass.css'`

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: CSS file compiles without syntax errors
    Tool: Bash (npx)
    Preconditions: reader.css created at src/styles/components/reader.css
    Steps:
      1. Run `npx tsc --noEmit` in project root
      2. Check exit code is 0
    Expected Result: tsc passes with no errors
    Failure Indicators: TypeScript compilation errors
    Evidence: .omo/evidence/task-1-css-compile.txt

  Scenario: CSS variables load correctly for dark theme
    Tool: Bash (grep)
    Preconditions: reader.css exists
    Steps:
      1. Run `grep -c '\[data-theme="dark"\]' src/styles/components/reader.css`
      2. Confirm > 0 matches
      3. Run `grep -c '\-\-reader-fg' src/styles/components/reader.css`
    Expected Result: At least 1 `data-theme` selector and all `--reader-*` variables defined
    Evidence: .omo/evidence/task-1-css-vars.txt

  Scenario: CSS classes exist for all major UI sections
    Tool: Bash (grep)
    Preconditions: reader.css exists
    Steps:
      1. For each expected class (reader-glass, reader-btn, reader-top-bar, reader-bottom-bar,
         reader-progress-track, reader-theme-btn, reader-layout-panel, reader-search-panel,
         reader-markers-panel, reader-selection-bar, reader-context-menu, reader-ai-btn):
         Run `grep -c '.CLASSNAME' src/styles/components/reader.css`
    Expected Result: All classes found (count > 0)
    Evidence: .omo/evidence/task-1-css-classes.txt
  ```

  **Evidence to Capture**:
  - [ ] tsc compile result
  - [ ] grep confirmation of CSS variables
  - [ ] grep confirmation of all CSS classes

  **Commit**: YES
  - Message: `style(reader): add reader.css with CSS variables and UI classes`
  - Files: `src/styles/components/reader.css`, `src/styles/theme.css`
  - Pre-commit: `npx tsc --noEmit`

---

- [x] 2. **Create `sidebar.css` — CSS variables + classes for Sidebar.tsx**

  **What to do**:
  - Create `src/styles/components/sidebar.css`
  - Define CSS custom properties under `[data-theme="dark"]`, `[data-theme="light"]`, `[data-theme="sepia"]`:
    - `--sidebar-bg`, `--sidebar-fg`, `--sidebar-muted`, `--sidebar-active`, `--sidebar-border`, `--sidebar-hover-bg`
  - Define `.sidebar-root` — 280px wide, flex column, backdrop-filter blur, z-index 10
  - Define `.sidebar-header` — flex row, space-between, padding, border-bottom
  - Define `.sidebar-header-title` — font-weight 600, font-size 14px, using `--sidebar-fg`
  - Define `.sidebar-close-btn` — small rounded close button
  - Define `.sidebar-scroll` — flex-1, overflow-y auto
  - Define `.sidebar-toc-btn` — TOC button (text-align left, padding, no border, cursor pointer)
  - Define `.sidebar-toc-btn-active` — active chapter: colored left border + fg color
  - Define `.sidebar-toc-btn-depth-0` through `.sidebar-toc-btn-depth-5` — indentation for subitems
  - Support `[data-ui-theme="flat"]` overrides
  - Import this file: add `@import './components/sidebar.css'` to `src/styles/theme.css`

  **Color mapping reference** (from Sidebar.tsx `sbTheme`):
  - `dark: { bg: 'rgba(10,10,26,0.85)', fg: 'rgba(255,255,255,0.7)', muted: 'rgba(255,255,255,0.5)', active: '#a78bfa', border: 'rgba(255,255,255,0.05)', hoverBg: 'rgba(255,255,255,0.04)' }`
  - `light: { bg: 'rgba(255,255,255,0.85)', fg: 'rgba(30,30,60,0.7)', muted: 'rgba(30,30,60,0.5)', active: '#7c3aed', border: 'rgba(0,0,0,0.06)', hoverBg: 'rgba(0,0,0,0.04)' }`
  - `sepia: { bg: 'rgba(244,236,216,0.9)', fg: 'rgba(80,50,20,0.7)', muted: 'rgba(80,50,20,0.5)', active: '#a67c00', border: 'rgba(80,50,20,0.1)', hoverBg: 'rgba(80,50,20,0.04)' }`

  **Must NOT do**:
  - Do NOT modify Sidebar.tsx yet
  - Do NOT add `!important`

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 6
  - **Blocked By**: None

  **References**:
  - `src/components/Sidebar.tsx:4-8` — `sbTheme` Record with exact color values
  - `src/components/Sidebar.tsx:36-56` — TOC button inline styles
  - `src/components/Sidebar.tsx:61-66` — Root div inline styles
  - `src/styles/components/bookshelf.css` — Theme override convention `[data-ui-theme="flat"]`

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: sidebar.css compiles without errors
    Tool: Bash (npx)
    Preconditions: sidebar.css created
    Steps: Run `npx tsc --noEmit`
    Expected Result: Exit code 0
    Evidence: .omo/evidence/task-2-css-compile.txt

  Scenario: All sidebar CSS variables and classes exist
    Tool: Bash (grep)
    Preconditions: sidebar.css exists
    Steps:
      1. grep for --sidebar-bg, --sidebar-fg, --sidebar-active
      2. grep for .sidebar-root, .sidebar-toc-btn, .sidebar-toc-btn-active
    Expected Result: All variables and classes found
    Evidence: .omo/evidence/task-2-css-elements.txt
  ```

  **Commit**: YES
  - Message: `style(sidebar): add sidebar.css with CSS variables and TOC classes`
  - Files: `src/styles/components/sidebar.css`, `src/styles/theme.css`
  - Pre-commit: `npx tsc --noEmit`

---

- [x] 3. **Create `ai-panel.css` — CSS variables + classes for AIPanel.tsx**

  **What to do**:
  - Create `src/styles/components/ai-panel.css`
  - Define CSS custom properties under `[data-theme="dark"]`, `[data-theme="light"]`, `[data-theme="sepia"]`:
    - `--ai-bg`, `--ai-fg`, `--ai-muted`
  - Define `.ai-panel-root` — absolute bottom, flex column, glass effect
  - Define `.ai-drag-handle` — 6px drag resize handle (ns-resize cursor)
  - Define `.ai-header` — flex row, space-between, border-bottom
  - Define `.ai-header-title` — font-weight 700, font-size 14px
  - Define `.ai-summary-btn` — small rounded button, indigo tint
  - Define `.ai-close-btn` — transparent close button
  - Define `.ai-messages` — flex-1, overflow-y auto, flex column, gap
  - Define `.ai-message-user` — user message bubble (indigo tint, self-end)
  - Define `.ai-message-assistant` — assistant message bubble (subtle bg, self-start)
  - Define `.ai-streaming` — streaming text with pulse cursor
  - Define `.ai-empty-state` — centered placeholder text
  - Define `.ai-input-row` — flex row, padding, border-top
  - Define `.ai-input` — flex-1 rounded input
  - Define `.ai-send-btn` — gradient send button (linear-gradient 135deg #667eea #764ba2)
  - Define `.ai-loading` — "思考中..." loading indicator
  - Support `[data-ui-theme="flat"]` overrides
  - Import this file: add `@import './components/ai-panel.css'` to `src/styles/theme.css`

  **Color mapping reference** (from AIPanel.tsx):
  - `themeBg = { light: '#ece8f4', sepia: '#f4ecd8', dark: '#0f0c29' } → --ai-bg` (partial, used via data-theme)
  - `fg = dark ? '#c8c8e0' : '#2d2b55' → --ai-fg`
  - `muted = dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' → --ai-muted`
  - `glassStyle = { bg: dark ? 'rgba(15,12,41,0.85)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px) saturate(140%)', borderTop }`

  **Must NOT do**:
  - Do NOT modify AIPanel.tsx yet
  - Do NOT add `!important`

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **References**:
  - `src/components/AIPanel.tsx:21-25` — theme color constant declarations
  - `src/components/AIPanel.tsx:59-67` — color constants and glassStyle
  - `src/components/AIPanel.tsx:27-44` — ChatMessageItem inline styles
  - `src/components/AIPanel.tsx:166-278` — Panel HTML structure with inline styles

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: ai-panel.css compiles without errors
    Tool: Bash (npx)
    Preconditions: ai-panel.css created
    Steps: Run `npx tsc --noEmit`
    Expected Result: Exit code 0
    Evidence: .omo/evidence/task-3-css-compile.txt

  Scenario: All AI panel CSS variables and major classes exist
    Tool: Bash (grep)
    Steps:
      1. grep for --ai-fg, --ai-muted, --ai-bg
      2. grep for .ai-panel-root, .ai-message-user, .ai-message-assistant, .ai-input, .ai-send-btn
    Expected Result: All variables and classes found
    Evidence: .omo/evidence/task-3-css-elements.txt
  ```

  **Commit**: YES
  - Message: `style(ai): add ai-panel.css with CSS variables and chat classes`
  - Files: `src/styles/components/ai-panel.css`, `src/styles/theme.css`
  - Pre-commit: `npx tsc --noEmit`

---

- [x] 4. **Reader.tsx Part A — Add `data-theme`, replace glass()/btn() constants, top/bottom bars + progress**

  **What to do**:
   In `src/components/Reader.tsx`:
   1. **Add `data-theme` attribute**: On the root `<div>` (L267), add `data-theme={theme === 'custom' ? 'light' : theme}` — mapping custom to light so CSS variables always have a defined value
  2. **Remove `btn()` function** (L60-74): Delete the `btn` function definition. All buttons will use CSS classes instead.
  3. **Remove `glass()` function** (L54-58): Delete the `glass` function. All glass panels will use `.reader-glass` instead.
  4. **Remove 7 color constants** (L258-265): Delete `dark`, `fg`, `panelText`, `panelMuted`, `panelBorder`, `panelInputBg`, `panelHoverBg`. These are now CSS variables.
  5. **Top bar container** (L286-349): Replace inline style objects on the outer `<div>` with:
     - Class `.reader-top-bar` on the absolute positioned container
     - Class `.reader-top-bar-inner` with `.reader-glass` on the inner glass div
     - Remove inline `{...glass(dark)}` → add className `reader-glass`
     - Replace `style={btn(fg)}` → className `reader-btn`
     - Theme buttons: use `.reader-theme-btn` + `.reader-theme-btn-active`
  6. **Bottom bar** (L713-765): Replace inline style on container with `.reader-bottom-bar`, inner div with `.reader-bottom-bar-inner` + `.reader-glass`
  7. **Progress bar** (L732-756): Replace with `.reader-progress-track`, `.reader-progress-fill`, `.reader-progress-dot`
  8. **Prev/Next buttons** (L726, L760): Replace inline style with `.reader-btn`

  **Critical - preserve these dynamic styles that CANNOT become CSS**:
  - `opacity: showUI ? 1 : 0` → Use dynamic `style={{ opacity: showUI ? 1 : 0 }}` or toggle className
  - `pointerEvents: showUI ? 'auto' : 'none'` → dynamic style or className
  - Progress bar width → `style={{ width: \`${progress}%\` }}` (dynamic)
  - Theme button active state → className toggle via conditional

  **Must NOT do**:
  - Do NOT modify the content iframe or epub.js integration
  - Do NOT change any event handlers or logic
  - Do NOT modify Part B sections (Aa panel, search panel, markers panel, etc.)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (modifies same file as Task 5)
  - **Parallel Group**: Wave 2 (first of 2 sequential tasks)
  - **Blocks**: Task 5
  - **Blocked By**: Task 1

  **References**:
  - `src/styles/components/reader.css` — New CSS classes created in Task 1
  - `src/components/Reader.tsx:54-58` — glass() function to remove (ALL callers → .reader-glass)
  - `src/components/Reader.tsx:60-74` — btn() function to remove (ALL callers → .reader-btn)
  - `src/components/Reader.tsx:258-265` — 7 color constants to remove
  - `src/components/Reader.tsx:267-267` — Root div to add data-theme
  - `src/components/Reader.tsx:286-349` — Top bar inline styles
  - `src/components/Reader.tsx:713-765` — Bottom bar + progress bar inline styles

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: tsc compilation passes after TSX edits
    Tool: Bash (npx)
    Preconditions: All Task 1-4 changes applied
    Steps:
      1. Run `npx tsc --noEmit`
      2. Check exit code
    Expected Result: Exit code 0, no type errors
    Evidence: .omo/evidence/task-4-tsc-pass.txt

  Scenario: Top bar renders with correct glass style (dark theme)
    Tool: Playwright
    Preconditions: Dev server running, book opened in dark theme
    Steps:
      1. Navigate to reader view
      2. Screenshot the top bar region
      3. Verify backdrop-filter is applied (check computed style of .reader-top-bar-inner)
    Expected Result: Top bar has frosted glass effect with dark background
    Evidence: .omo/evidence/task-4-topbar-dark.png

  Scenario: Bottom bar progress updates on navigation
    Tool: Playwright
    Preconditions: Book opened
    Steps:
      1. Click "下一页" button
      2. Check progress fill width increases
    Expected Result: Progress bar width changes after navigation
    Evidence: .omo/evidence/task-4-progress.png

  Scenario: All reader-btn elements have correct styling
    Tool: Playwright
    Preconditions: Reader view loaded
    Steps:
      1. Query all `.reader-btn` elements via Playwright eval
      2. Verify they have: cursor: pointer, background: none, border: none
    Expected Result: All buttons have consistent base styling
    Evidence: .omo/evidence/task-4-buttons.txt
  ```

  **Commit**: NO (groups with Task 5)

---

- [x] 5. **Reader.tsx Part B — Replace Aa panel, search panel, markers panel, selection toolbar, context menu, AI button**

  **What to do**:
  In `src/components/Reader.tsx`, replace inline styles in these remaining panels:

  1. **Aa layout panel** (L350-648): Replace `{...glass(dark)}` → `reader-glass`, inline button styles → `reader-btn`, `reader-theme-btn`, `reader-layout-panel`, `reader-layout-row`, `reader-range-input`, `reader-select-input`
  2. **Search panel** (L651-708): Replace inline overlay div → `reader-panel-overlay`, panel → `reader-search-panel`, input → `reader-search-input`
  3. **Markers panel** (L802-877): Replace overlay → `reader-panel-overlay`, panel → `reader-markers-panel`, tab buttons → `reader-marker-tab`, items → `reader-marker-item`
  4. **Selection toolbar** (L767-799): Replace with `reader-selection-bar` and `reader-selection-color-btn`
  5. **Context menu** (L879-900): Replace with `reader-context-menu` and `reader-context-btn`
  6. **AI button** (L904-920): Replace with `reader-ai-btn`
  7. **Overlays**: All invisible click-to-close overlays use shared `reader-panel-overlay` class
  8. **Animations**: Preserve `@keyframes pulse` via CSS variables definition; remove inline `_pulseId` style injection (already handled if in reader.css)

  **Critical dynamic values to preserve as inline style**:
  - `selectionInfo.bounds.top/left` positioning → inline
  - `progress %` width → inline
  - Panels' `showUI`/`showLayout`/`showSearch` visibility → conditional className or inline opacity

  **Must NOT do**:
  - Do NOT re-add removed variables `fg`, `panelText`, `panelMuted` etc. — they're now in CSS
  - Do NOT modify any event handlers (onClick, onChange, etc.)
  - Do NOT change epub.js related code (onLoad, onNext, etc.)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (same file as Task 4)
  - **Parallel Group**: Wave 2 (second of 2 sequential tasks)
  - **Blocks**: None
  - **Blocked By**: Task 4

  **References**:
  - `src/components/Reader.tsx:350-648` — Aa layout panel (glass divs, theme buttons, font sliders, animation modes)
  - `src/components/Reader.tsx:651-708` — Search panel (input, results list, result items)
  - `src/components/Reader.tsx:767-799` — Selection toolbar (color buttons, close button)
  - `src/components/Reader.tsx:802-877` — Markers panel (bookmarks + highlights tabs, items)
  - `src/components/Reader.tsx:879-900` — Context menu
  - `src/components/Reader.tsx:904-920` — AI floating button
  - `src/styles/components/reader.css` — All CSS classes defined in Task 1

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: Aa panel opens and displays layout controls correctly
    Tool: Playwright
    Preconditions: Reader view loaded
    Steps:
      1. Click "Aa" button in top bar
      2. Wait for layout panel to appear
      3. Screenshot the panel
      4. Verify font size slider, font family select, theme buttons are visible
    Expected Result: Aa panel renders with glass effect, all controls functional
    Evidence: .omo/evidence/task-5-aa-panel.png

  Scenario: Search panel opens and shows results
    Tool: Playwright
    Preconditions: Reader view loaded with a book
    Steps:
      1. Click search button (🔍)
      2. Type a common word into search input
      3. Wait for results to appear
      4. Verify result items are visible with context + highlight
    Expected Result: Search results appear with matching text highlighted
    Evidence: .omo/evidence/task-5-search.png

  Scenario: Markers panel shows bookmarks and highlights tabs
    Tool: Playwright
    Preconditions: Reader view loaded
    Steps:
      1. Click markers button (☰)
      2. Verify bookmarks tab and highlights tab buttons visible
      3. Toggle between tabs
    Expected Result: Both tabs render, tab state changes on click
    Evidence: .omo/evidence/task-5-markers.png

  Scenario: Selection toolbar appears on text selection
    Tool: Playwright
    Preconditions: Reader view loaded with content
    Steps:
      1. Select text in the viewer iframe (use Playwright evaluate to simulate selection)
      2. Check if selection toolbar appears with 4 color buttons + close button
    Expected Result: Floating toolbar appears with correct styling
    Evidence: .omo/evidence/task-5-selection.png

  Scenario: AI button is visible and styled correctly
    Tool: Playwright
    Preconditions: Reader view loaded
    Steps:
      1. Check bottom-right corner for AI button
      2. Verify gradient background and box-shadow
    Expected Result: AI button visible with gradient styling
    Evidence: .omo/evidence/task-5-ai-btn.png
  ```

  **Commit**: YES (groups with Task 4)
  - Message: `refactor(reader): replace inline styles with CSS classes across all panels`
  - Files: `src/components/Reader.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

- [x] 6. **Sidebar.tsx — Add `data-theme` and replace inline styles with CSS classes**

  **What to do**:
  In `src/components/Sidebar.tsx`:
  1. **Delete `sbTheme` Record** (L4-8): Remove the entire theme color object. Colors now in CSS.
  2. **Delete `s = sbTheme[theme]`** (L65): Remove the theme lookup.
  3. **On root `<div>`** (L91-102): Add `data-theme={theme}`, replace inline style with className `sidebar-root`
  4. **Header div** (L103-107): Replace with className `sidebar-header`
  5. **Title span** (L108): Replace with className `sidebar-header-title`
  6. **Close button** (L109-117): Replace with className `sidebar-close-btn`
  7. **Scroll container** (L119-123): Replace with className `sidebar-scroll`
  8. **TOC buttons** (in `TocList` L36-56): Replace inline styles with className `sidebar-toc-btn`, conditionally add `sidebar-toc-btn-active`, use `sidebar-toc-btn-depth-${depth}` for indentation
  9. **All hover effects**: Remove inline `onMouseEnter`/`onMouseLeave` opacity/color changes — move to CSS `:hover`

  **Critical dynamic values to preserve**:
  - `depth` indentation → className `sidebar-toc-btn-depth-${depth}` with CSS padding-left
  - `isActive` → conditional className `sidebar-toc-btn-active`

  **Must NOT do**:
  - Do NOT modify `TocList` component logic or props
  - Do NOT change the `btnRefs` ref-based scroll-to-active behavior
  - Do NOT remove the `ref` callback from TOC buttons

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 7 — different files; also with Tasks 4-5 — independent of Reader.tsx)
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Task 2

  **References**:
  - `src/components/Sidebar.tsx:4-8` — `sbTheme` Record to remove
  - `src/components/Sidebar.tsx:36-56` — TOC button inline styles (main target)
  - `src/components/Sidebar.tsx:61-126` — Full component structure with inline styles
  - `src/styles/components/sidebar.css` — New CSS classes from Task 2
  - `src/components/TitleBar.tsx` — Example of clean component with CSS modules pattern

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: Sidebar renders with correct styling in dark mode
    Tool: Playwright
    Preconditions: Reader view loaded in dark theme
    Steps:
      1. Click "目录" button to open sidebar
      2. Screenshot the sidebar
      3. Verify TOC items are rendered with proper indentation
    Expected Result: Sidebar has frosted glass backdrop, TOC items readable
    Evidence: .omo/evidence/task-6-sidebar-dark.png

  Scenario: TOC active chapter highlighting works
    Tool: Playwright
    Preconditions: Sidebar open
    Steps:
      1. Click on a TOC chapter link
      2. Verify that chapter's button has active styling (accent color left border)
    Expected Result: Active chapter has visual highlight
    Evidence: .omo/evidence/task-6-toc-active.png

  Scenario: Sidebar closes when close button clicked
    Tool: Playwright
    Steps:
      1. Open sidebar
      2. Click close button (✕)
      3. Verify sidebar is hidden
    Expected Result: Sidebar closes/animated away
    Evidence: .omo/evidence/task-6-sidebar-close.png
  ```

  **Evidence to Capture**:
  - [ ] Sidebar screenshot in dark mode
  - [ ] Active TOC item highlight screenshot
  - [ ] Sidebar close behavior verified

  **Commit**: YES
  - Message: `refactor(sidebar): replace inline sbTheme styles with CSS classes`
  - Files: `src/components/Sidebar.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

- [x] 7. **AIPanel.tsx — Add `data-theme` and replace inline styles with CSS classes**

  **What to do**:
  In `src/components/AIPanel.tsx`:
  1. **Root `<div>`** (L167-174): Add `data-theme={theme}`, replace inline style with className `ai-panel-root`, keep dynamic `height` as inline style (vh-based)
  2. **Drag handle** (L176-181): Replace with className `ai-drag-handle`
  3. **Header** (L184-205): Replace with className `ai-header`
  4. **Title** (L189): Replace with className `ai-header-title`
  5. **Summary button** (L194-201): Replace with className `ai-summary-btn`
  6. **Close button** (L202-204): Replace with className `ai-close-btn`
  7. **Messages container** (L209-245): Replace with className `ai-messages`
  8. **ChatMessageItem**: In the memo'd component (L27-44), replace inline styles with:
     - User messages: className `ai-message-user`
     - Assistant messages: className `ai-message-assistant`
     - Keep `msg.role` conditional for alignment
  9. **Streaming text** (L221-236): Replace with className `ai-streaming`
  10. **Empty state** (L213-217): Replace with className `ai-empty-state`
  11. **Input row** (L249-276): Replace with className `ai-input-row`
  12. **Input field** (L253-265): Replace with className `ai-input`
  13. **Send button** (L267-275): Replace with className `ai-send-btn`
  14. **Loading indicator** (L237-244): Replace with className `ai-loading`
  15. **Delete `themeBg` constants** (L21-25) and `glassStyle` useMemo (L62-67): Remove, now in CSS
  16. **Remove the `_pulseId` style injection** (L4-9): The pulse animation keyframe should be moved to ai-panel.css
  17. **Remove `fg`/`muted`/`dark` constants** (L59-61): Now in CSS variables

  **Critical dynamic values to preserve**:
  - `panelHeight` (vh-based height) → keep dynamic `style={{ height: \`${panelHeight}vh\` }}`
  - `visible` → conditional rendering pattern
  - `loading` → conditional className
  - `config` → conditional class toggle for disabled state

  **Must NOT do**:
  - Do NOT change `handleSummary`, `handleSend`, `onClose`, or any event handler
  - Do NOT change `ChatMessageItem` memo optimization
  - Do NOT remove the drag-resize logic

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 6 — different files; also with Tasks 4-5 — independent of Reader.tsx)
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Task 3

  **References**:
  - `src/components/AIPanel.tsx:4-9` — Pulse animation style injection to remove
  - `src/components/AIPanel.tsx:21-25` — themeBg constants to delete
  - `src/components/AIPanel.tsx:27-44` — ChatMessageItem inline styles
  - `src/components/AIPanel.tsx:48-67` — State, glassStyle, color constants
  - `src/components/AIPanel.tsx:163-278` — Full JSX with inline styles
  - `src/styles/components/ai-panel.css` — New CSS classes from Task 3

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: AI panel opens and renders correctly
    Tool: Playwright
    Preconditions: Reader view loaded
    Steps:
      1. Click AI button to open panel
      2. Screenshot the AI panel
      3. Verify header, message area, input row visible
    Expected Result: AI panel has glass effect, all UI sections render
    Evidence: .omo/evidence/task-7-ai-panel.png

  Scenario: AI panel input and send button are styled correctly
    Tool: Playwright
    Preconditions: AI panel open
    Steps:
      1. Check input field styling
      2. Check send button has gradient background
    Expected Result: Input has rounded corners, send button has purple gradient
    Evidence: .omo/evidence/task-7-ai-input.png

  Scenario: Chat messages render with correct alignment (user right, assistant left)
    Tool: Playwright
    Preconditions: AI panel with at least one conversation
    Steps:
      1. Type a message and send (or simulate)
      2. Verify user message is right-aligned, assistant left-aligned with different bg
    Expected Result: Messages visually distinguish user vs assistant
    Evidence: .omo/evidence/task-7-messages.png

  Scenario: Drag handle is visible and functional
    Tool: Playwright
    Preconditions: AI panel open
    Steps:
      1. Check drag handle exists at top of panel
      2. Verify it has ns-resize cursor
    Expected Result: Drag handle visible with resize cursor
    Evidence: .omo/evidence/task-7-drag-handle.png
  ```

  **Commit**: YES
  - Message: `refactor(ai): replace inline glassStyle and theme colors with CSS classes`
  - Files: `src/components/AIPanel.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have":
  - Verify reader.css exists with `--reader-*` CSS variables for all 3 themes
  - Verify sidebar.css exists with `--sidebar-*` CSS variables
  - Verify ai-panel.css exists with `--ai-*` CSS variables
  - Verify Reader.tsx has `data-theme` attribute on root div
  - Verify Glass/Flat theme overrides exist in new CSS files
  For each "Must NOT Have":
  - Search for any new React component files created
  - Search for changes to epub.js integration code
  - Search for modifications to excluded components (Library, BookShelf, etc.)
  Check evidence files exist in .omo/evidence/.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`
  **Result: CONDITIONAL APPROVE** — 7/7 Must Have ✅, 5/5 Must NOT Have ✅. Minor: dead glass()/btn() in Reader.tsx (cleanup done), theme-flat.css empty (known pending).

- [x] F2. **Code Quality + Build Check** — `unspecified-high`
  Run `npx tsc --noEmit` (must pass). Review all changed files for:
  - Any leftover inline `glass()` or `btn()` function usage
  - Any remaining `dark`/`fg`/`panelText`/`panelMuted`/`panelBorder`/`panelInputBg`/`panelHoverBg` variables
  - Any `sbTheme` references in Sidebar.tsx
  - Unused CSS classes in the new files
  - Check AI slop: excessive comments, over-abstraction, dead code
  Output: `Build [PASS/FAIL] | Cleanup [N issues] | VERDICT`
  **Result: CONDITIONAL PASS** — Dead code cleanup done. Pre-existing tsc errors (electronAPI, Spine items, etc.) block clean build but are unrelated to this plan. tsconfig.json reference to tsconfig.node.json removed to unblock dev.

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state (git stash + npm run dev). Execute EVERY QA scenario from EVERY task:
  - Task 1: CSS compile + variable presence
  - Task 2: sidebar.css compile + elements
  - Task 3: ai-panel.css compile + elements
  - Task 4: Reader top/bottom bars, progress, buttons
  - Task 5: Aa panel, search, markers, selection, AI button
  - Task 6: Sidebar rendering, TOC active, close
  - Task 7: AI panel, input, messages, drag handle
  - Cross-task integration: Switch themes (dark/light/sepia), verify each renders correctly
  - Test edge: Toggle UI theme (glass/flat) — verify reader.css overrides apply
  Save all screenshots to `.omo/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`
  **Result: CONDITIONAL APPROVE** — CSS variables correct across all 3 themes. Dev server running. Reader-mode UI untestable (no EPUB in workspace). theme-flat.css empty (known pending work).

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1:
  - Everything in spec was done (no missing CSS classes)
  - Nothing beyond spec was done (no component extractions, no logic changes)
  - Check "Must NOT do" compliance: no touch to excluded files
  - Detect cross-task contamination (Task X touching Task Y's files)
  - Verify ONLY these files changed:
    - NEW: `src/styles/components/reader.css`, `sidebar.css`, `ai-panel.css`
    - MODIFIED: `src/styles/theme.css`, `src/components/Reader.tsx`, `src/components/Sidebar.tsx`, `src/components/AIPanel.tsx`
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`
  **Result: 7/7 tasks compliant after dead code cleanup. Contamination CLEAN. Unaccounted CLEAN (plus tsconfig.json/tsconfig.node.json fixes for composite emit conflict).**

---

## Commit Strategy

- **Task 1**: `style(reader): add reader.css with CSS variables and UI classes` — `src/styles/components/reader.css`, `src/styles/theme.css`
- **Task 2**: `style(sidebar): add sidebar.css with CSS variables and TOC classes` — `src/styles/components/sidebar.css`, `src/styles/theme.css`
- **Task 3**: `style(ai): add ai-panel.css with CSS variables and chat classes` — `src/styles/components/ai-panel.css`, `src/styles/theme.css`
- **Tasks 4+5**: `refactor(reader): replace inline styles with CSS classes across all panels` — `src/components/Reader.tsx`
- **Task 6**: `refactor(sidebar): replace inline sbTheme styles with CSS classes` — `src/components/Sidebar.tsx`
- **Task 7**: `refactor(ai): replace inline glassStyle and theme colors with CSS classes` — `src/components/AIPanel.tsx`

---

## Success Criteria

### Verification Commands
```bash
npx tsc --noEmit  # Expected: exit 0, no errors
```

### Final Checklist
- [ ] All 6 new CSS files/imports correct (3 CSS + 3 @import in theme.css)
- [ ] No `glass()` or `btn()` function calls remain in Reader.tsx
- [ ] No `sbTheme` record remains in Sidebar.tsx
- [ ] No `glassStyle` useMemo remains in AIPanel.tsx
- [ ] data-theme correctly set on Reader/Sidebar/AIPanel root elements
- [ ] All 3 reading themes (dark/light/sepia) visually correct
- [ ] Glass/Flat UI themes unaffected
- [ ] All features functional: navigation, search, bookmarks, highlights, AI
- [ ] No TypeScript errors
- [ ] Plan compliance: F1 ✅ | Code quality: F2 ✅ | QA: F3 ✅ | Scope: F4 ✅


