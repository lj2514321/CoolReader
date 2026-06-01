# Style Decouple Learnings

## Reader.css (Wave 1)

### Key Findings

1. **CSS variables must be scoped under `[data-theme-*]` selectors** — The Reader component uses 3 theme modes (dark/light/sepia). Each theme maps to a distinct color set. Variables defined in `:root` or `[data-ui-theme="glass"]` serve as light-mode defaults.

2. **Glass backdrop formula** — From `glass()` function in Reader.tsx:
   - Dark: `rgba(15,12,41,0.45)` + `blur(20px) saturate(140%)`
   - Light: `rgba(255,255,255,0.55)` + same filter
   - Must include BOTH `backdrop-filter` AND `-webkit-backdrop-filter` for Safari

3. **Button style from `btn()` function** — No background, no border, cursor:pointer, color:fg, border-radius:10, padding:'7px 14px', font-size:13, font-weight:600, opacity:0.7

4. **7 color constants from Reader.tsx:258-265**:
   - `dark`: boolean (theme === 'dark')
   - `fg`: #c8c8e0 (dark) | #2d2b55 (light)
   - `panelText`: rgba(255,255,255,0.8) (dark) | rgba(0,0,0,0.6) (light)
   - `panelMuted`: rgba(255,255,255,0.5) (dark) | rgba(0,0,0,0.45) (light)
   - `panelBorder`: rgba(255,255,255,0.08) (dark) | rgba(0,0,0,0.08) (light)
   - `panelInputBg`: rgba(255,255,255,0.08) (dark) | rgba(0,0,0,0.06) (light)
   - `panelHoverBg`: rgba(255,255,255,0.1) (dark) | rgba(0,0,0,0.08) (light)

5. **Reuse tokens.css radii** — --radius-btn:10px, --radius-panel:16px, --radius-card:14px, --transition-theme all exist in tokens.css. Do NOT redefine.

6. **Sepia theme uses light-mode colors** — themeBg.sepia = '#f4ecd8' but all panel colors same as light mode.

7. **CSS class naming** — All classes prefixed `.reader-*` (BEM-lite). Required classes: reader-glass, reader-btn, reader-btn-active, reader-top-bar, reader-top-bar-inner, reader-bottom-bar, reader-bottom-bar-inner, reader-progress-track, reader-progress-fill, reader-progress-dot, reader-theme-btn, reader-layout-panel, reader-layout-row, reader-range-input, reader-select-input, reader-search-panel, reader-search-input, reader-markers-panel, reader-marker-tab, reader-marker-item, reader-selection-bar, reader-selection-color-btn, reader-context-menu, reader-context-btn, reader-ai-btn, reader-panel-overlay, reader-fade-in, reader-fade-out, reader-hidden

 8. **[data-ui-theme="flat"] override pattern** — Copied from bookshelf.css. When switching from glass to flat, override glass bg with solid colors and remove backdrop-filter.

## ai-panel.css (Wave 2/3)

### Key Findings

1. **@keyframes pulse renamed to ai-pulse** — Injected JS keyframes replaced by CSS class, avoids global pollution and style element lifecycle issues.

2. **themeBg constants eliminated** — All theme backgrounds now handled via CSS variable `--ai-bg` scoped under `[data-theme="light/sepia/dark"]`. No JS-side color mapping needed.

3. **glassStyle useMemo eliminated** — All glass/blur/border styles moved to `.ai-panel-root` CSS class. Dynamic theming now via `data-theme` attribute on root div + CSS variable cascade.

4. **fg/muted/dark JS constants eliminated** — All color values now via CSS variables: `--ai-fg`, `--ai-muted`. Theme detection no longer needs JS `dark = theme === 'dark'` — CSS handles it via attribute selectors.

5. **ChatMessageItem simplified** — Removed `fg` and `dark` props; now uses `className={msg.role === 'user' ? 'ai-message-user' : 'ai-message-assistant'}` only. Alignment handled by CSS `align-self: flex-end/flex-start`.

6. **data-theme mapping on root** — `data-theme={theme === 'custom' ? 'light' : theme}` allows custom theme to render as light mode while still using CSS variable cascade.

7. **Dynamic styles preserved inline** — Only `height` (panelHeight vh-based) and `visible` (conditional rendering) remain as inline styles. Everything else → CSS classes.

8. **CSS class completeness** — ai-panel.css provides: .ai-panel-root, .ai-drag-handle, .ai-drag-handle-bar, .ai-header, .ai-header-title, .ai-header-actions, .ai-warning-text, .ai-summary-btn, .ai-close-btn, .ai-messages, .ai-message-user, .ai-message-assistant, .ai-streaming-cursor, .ai-empty-state, .ai-loading, .ai-loading-text, .ai-input-row, .ai-input, .ai-send-btn

## Reader.tsx (Wave 1 - Task 1A: top/bottom bars + progress)

### Key Findings

1. **`data-theme` on root div** — `data-theme={theme === 'custom' ? 'light' : theme}` maps custom to light for CSS variable cascade. Root also keeps `background: themeBg[theme as Exclude<ThemeMode, 'custom'>]` inline.

2. **`themeBg` type must exclude 'custom'** — `Record<Exclude<ThemeMode, 'custom'>, string>` because custom maps to light in CSS. Using `theme as Exclude<ThemeMode, 'custom'>` when indexing.

3. **`glass()` removed for top/bottom bars** — Replaced with `.reader-top-bar-inner reader-glass` / `.reader-bottom-bar-inner reader-glass`. Outer containers use `.reader-top-bar` / `.reader-bottom-bar`.

4. **`btn()` removed for prev/next/theme buttons** — Replaced with `className="reader-btn"`. Theme button active state: `className="reader-btn reader-theme-btn-active"`.

5. **7 color constants RESTORED inside component body** — For Task 5 panels only (layout panel, search panel, markers panel, selection toolbar, context menu). These panels still use `glass(dark)`, `btn(fg)`, `panelText`, `panelMuted`, `panelBorder`, `panelInputBg`, `panelHoverBg`. Declared AFTER function signature, BEFORE first use.

6. **Dynamic styles that MUST stay inline**:
   - `opacity: showUI ? 1 : 0` — conditional visibility
   - `pointerEvents: showUI ? 'auto' : 'none'` — conditional interaction
   - `style={{ width: \`${progress}%\` }}` — dynamic progress width
   - `background: themeBg[theme]` on root div — dynamic theme background

7. **Progress bar CSS classes** — `.reader-progress-track` (container), `.reader-progress-fill` (fill with dynamic width), `.reader-progress-dot` (dot, positioned absolute inside fill).

8. **`AIPanel` theme prop type mismatch** — AIPanel accepts `'light' | 'dark' | 'sepia'` but Reader passes `theme` which includes `'custom'`. Cast: `theme as 'light' | 'dark' | 'sepia'`.

9. **CSS class structure for bars**:
   - Top bar: `<div className="reader-top-bar" style={{opacity, pointerEvents}}>` → `<div className="reader-top-bar-inner reader-glass">`
   - Bottom bar: `<div className="reader-bottom-bar" style={{opacity, pointerEvents}}>` → `<div className="reader-bottom-bar-inner reader-glass">`
   - Inner glass div handles display:flex, gap, border-radius, padding

10. **`onAddHighlight(color, note)` call is pre-existing bug** — The `note` parameter doesn't exist in `onAddHighlight` type signature. This is a pre-existing bug not introduced by this task. The call site `onAddHighlight(color, note?.trim() || undefined)` is NOT modified per task spec.

11. **`electronAPI` errors are pre-existing** — `Property 'electronAPI' does not exist on type 'Window'` errors exist in multiple files (Reader.tsx, AIPanel.tsx, customTheme.ts). Not introduced by this task.

12. **tsconfig.node.json needs `composite: true`** — To fix "Referenced project must have setting 'composite': true" error, add `"composite": true` to tsconfig.node.json compilerOptions. But `noEmit: true` is incompatible with composite, so standard `npx tsc --noEmit` still errors. Use direct `node node_modules/typescript/lib/tsc.js --noEmit [files]` instead.

## sidebar.css (Wave 2)

### Key Findings

1. **sidebar.css class inventory** — .sidebar-root, .sidebar-header, .sidebar-header-title, .sidebar-close-btn, .sidebar-close-btn:hover, .sidebar-scroll, .sidebar-toc-btn, .sidebar-toc-btn:hover, .sidebar-toc-btn-active, .sidebar-toc-btn-active:hover, .sidebar-toc-btn-depth-0 through -5

2. **sbTheme Record eliminated** — 6-color JS Record (bg, fg, muted, active, border, hoverBg) removed. All colors now via CSS variables under `[data-theme="dark/light/sepia"]`.

3. **TocList `s` prop eliminated** — `s: typeof sbTheme.dark` parameter removed. Active/muted colors now CSS-driven via `.sidebar-toc-btn-active` class.

4. **`s = sbTheme[theme]` lookup removed** — Theme-to-colors map no longer needed at L65. CSS handles it.

5. **Depth indentation via CSS classes** — padding-left per depth handled by `.sidebar-toc-btn-depth-N` classes (0-5), not inline `paddingLeft: 16 + depth * 16`.

6. **Hover states via CSS `:hover`** — Removed `onMouseEnter`/`onMouseLeave` handlers that set inline `background` and `color`. Now handled by `.sidebar-toc-btn:hover`, `.sidebar-toc-btn-active:hover`, `.sidebar-close-btn:hover`.

7. **`data-theme` mapping pattern** — `data-theme={theme === 'custom' ? 'light' : theme}` on root div. Custom theme maps to 'light' CSS variables.

8. **backdrop-filter blur value** — Sidebar uses `blur(32px)` while Reader uses `blur(20px)`. Both correct per their respective CSS files.

9. **Flat override pattern** — `[data-ui-theme="flat"] .sidebar-root` removes backdrop-filter and uses solid colors. Same pattern as bookshelf.css.