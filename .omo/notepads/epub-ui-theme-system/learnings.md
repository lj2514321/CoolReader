# epub-ui-theme-system learnings

## Task 1: CSS theme system bootstrap (2026-05-30)

### What was done
- Created src/styles/tokens.css with CSS custom properties:
  - --radius-card: 14px
  - --radius-btn: 10px
  - --radius-panel: 16px
  - --transition-theme: background 0.3s ease, border 0.3s ease, box-shadow 0.3s ease, color 0.3s ease
- Created src/styles/theme.css as entry point with commented @import chain for future component/theme CSS files
- Updated src/main.tsx to import both CSS files

### Build verification
- 
pm run build passed with no errors
- electron-vite successfully bundled the CSS files into out/renderer/assets/index-BavCWkSe.css

### Notes
- electron-vite handles CSS imports via Vite, no special configuration needed
- theme.css uses commented @import statements as placeholder for future component/theme files

## Task 1 (this session): data-ui-theme infrastructure

### What was done
- Created src/styles/themes/ directory
- Created src/styles/themes/theme-glass.css with [data-ui-theme="glass"] selector (baseline placeholder)
- Created src/styles/themes/theme-flat.css with "Will be filled in Wave 3" placeholder
- Updated src/styles/theme.css to @import both theme files
- Modified src/App.tsx:
  - Added imports: `import { useTheme, setThemeOnRoot } from './styles/useTheme'` and `import './styles/theme.css'`
  - Destructured `{ theme: uiTheme, setTheme: setUiTheme }` from `useTheme()`
  - Added `useEffect(() => { setThemeOnRoot(uiTheme) }, [uiTheme])` to sync attribute with state
  - Added `data-ui-theme={uiTheme}` to root `<div>` at line ~198
- Build passed with no errors (electron-vite bundled CSS, 2.42 kB output)

### Notes
- `useTheme` hook already had `setThemeOnRoot` function that sets `document.documentElement.dataset.uiTheme`
- The useEffect call in App.tsx is redundant since useTheme's internal useEffect already calls setThemeOnRoot on mount; but kept for explicit control flow visibility
- Default UI theme is 'glass' (from useTheme's getInitialTheme)
- Root div renders with `data-ui-theme="glass"` by default

## Task: Extract settings form inline styles to CSS

### What was done
- Created `src/styles/components/settings-form.css` with all required classes:
  - `.form-container`, `.form-field`, `.form-label`
  - `.form-input`, `.form-input:focus`, `.form-input::placeholder`
  - `.form-helper`, `.form-btn`, `.form-btn.primary`, `.form-btn:disabled`
  - `.form-status`, `.form-status.success`, `.form-status.error`
  - `.form-progress`, `.form-progress-track`, `.form-progress-fill`
  - `.form-section`, `.form-section-title`
  - `.form-actions`, `.form-result`, `.form-result.error`, `.form-result-errors`
- Refactored `SyncSettings.tsx`: removed `CSSProperties` constants, replaced all `style={{...}}` with `className`
- Refactored `AISettings.tsx`: same treatment
- Both files now import `../styles/components/settings-form.css`
- Build passed with no errors (electron-vite bundled CSS)

### Notes
- Dynamic styles (opacity based on state, progress bar width) kept as inline `style` since they depend on runtime values
- Used `.form-btn` base class + inline `style` for background variations (test=blue, save=purple, sync=gradient)
- `.form-status.success` / `.form-status.error` for color-coded status messages
- `.form-result.error` modifier for sync error state styling

## Task 6: BookShelf.tsx CSS extraction (2026-05-30)

### What was done
- Created src/styles/components/bookshelf.css with all extracted inline styles:
  - .bookshelf (container)
  - .book-card and .book-card:hover (main book card with hover effect via CSS)
  - .book-cover-container, .book-cover-img, .book-cover-gradient, .book-cover-fallback
  - .book-progress-bar, .book-progress-fill (progress bar with dynamic width via inline style)
  - .book-title, .book-author, .book-chapter, .book-timestamp, .book-card-info
  - .continue-reading-card and .continue-reading-card:hover
  - .continue-reading-cover, .continue-reading-cover-fallback
  - .continue-reading-info, .continue-reading-progress, .continue-reading-progress-bar, .continue-reading-progress-fill, .continue-reading-progress-meta
  - .bookshelf-header, .bookshelf-header-timer, .bookshelf-header-time, .bookshelf-header-time-value, .bookshelf-header-time-label, .bookshelf-header-spacer
  - .search-input (with placeholder pseudo-class)
  - .sort-controls, .sort-btn, .sort-btn:hover, .sort-btn.active
  - .continue-reading-section, .continue-reading-section-title, .continue-reading-scroll
  - .bookshelf-empty, .bookshelf-empty-content, .bookshelf-empty-icon, .bookshelf-empty-title, .bookshelf-empty-desc
  - .bookshelf-grid, .bookshelf-grid-inner
  - .delete-modal-overlay, .delete-modal, .delete-modal-icon, .delete-modal-title, .delete-modal-desc, .delete-modal-actions
  - .modal-btn, .modal-btn-delete, .modal-btn-delete:hover, .modal-btn-remove, .modal-btn-remove:hover, .modal-btn-cancel, .modal-btn-cancel:hover
  - .goal-mini, .goal-mini.complete
- Refactored BookShelf.tsx:
  - Added `import '../styles/components/bookshelf.css'`
  - Removed unused `import { glass, colors } from '../utils/styles'` (kept colors for BookCard gradient)
  - Replaced all `style={{...}}` with `className={...}` except:
    - Dynamic gradient backgrounds for book covers (runtime color values from colors[i % colors.length])
    - Dynamic progress fill width (width: `${book.progress}%`)
  - Removed onMouseEnter/onMouseLeave handlers for hover (now CSS-based)
- Build passed with no errors

### Notes
- Hover effects on .book-card and .sort-btn are now pure CSS (no JS handlers needed)
- The `glass` object from styles.ts was only used in the empty state — now using CSS classes
- Keep `colors` import for runtime gradient generation in BookCard and ContinueReadingCard
- Dynamic inline styles kept ONLY where values are truly dynamic (runtime-computed gradients, progress percentage)

## Task: Extract inline styles from ReadingStats.tsx (2026-05-30)

### What was done
- Created `src/styles/components/reading-stats.css` with all extracted classes:
  - `.stats-container`, `.stats-title`, `.stats-grid`
  - `.stat-card`, `.stat-card.accent`, `.stat-label`, `.stat-value`
  - `.stat-goal-bar`, `.stat-goal-fill`, `.stat-goal-progress`, `.stat-goal-progress.achieved`, `.stat-goal-progress.active`, `.stat-goal-label`
  - `.chart-container`, `.chart-title`, `.chart-bars`, `.chart-bar-wrapper`, `.chart-bar`, `.chart-bar-label`
  - `.stats-book-list`, `.stats-book-list-title`, `.stats-book-row`, `.stats-book-divider`, `.stats-book-icon`, `.stats-book-title`, `.stats-book-duration`
  - `.stats-loading`
- Refactored `src/components/ReadingStats.tsx` to use className instead of style={{}}
- Imported CSS via `import '../styles/components/reading-stats.css'`
- Build passed with no errors

### Notes
- CSS import path must be relative from component: `../styles/components/reading-stats.css` (NOT `./reading-stats.css`)
- GoalBar inner div uses dynamic class: `stat-goal-progress ${pct >= 100 ? 'achieved' : 'active'}`
- Chart bar height is dynamic via inline style (percentage-based), kept as inline since it varies per data point
- stat-card.accent for special border when reading goal is active
- stat-card combined with conditional class string for accent state
- book row divider applied conditionally via `${i < bookTotals.length - 1 ? ' stats-book-divider' : ''}`

## Task: SidebarNav theme support (this session)

### What was done
- Extracted root div inline styles from `SidebarNav.tsx` (lines 14-24) into CSS class `sidebar-nav-container`
- `SidebarNav.css` updated:
  - `[data-ui-theme="glass"] .sidebar-nav-container` wrapper for glass gradient/border
  - `[data-ui-theme="flat"] .sidebar-nav-container` with flat overrides (solid bg, subtle border, smaller border-radius)
  - Shared `.nav-btn` styles unchanged (hover animation preserved)
- Build passed with no errors (electron-vite bundled all 196 modules, 16.19 kB CSS output)

### Files modified
- `src/components/SidebarNav.tsx`: replaced root div `style={{...}}` with `className="sidebar-nav-container"`
- `src/components/SidebarNav.css`: added theme wrappers + flat section

### Notes
- Root div styles extracted; remaining `style={{` in SidebarNav.tsx are for text content (logo, bookCount, button container) — these are element-specific, not layout
- `src/components/TitleBar.tsx` had a broken import `import './styles/components/titlebar.css'` (wrong relative path from components/) — already fixed by previous session but caused build failure; verified path is `../styles/components/titlebar.css`
- Flat theme uses: background #ffffff, border 1px solid #e5e7eb, border-radius 4px

## Task: Extract inline styles from TitleBar.tsx (2026-05-30)

### What was done
- Created `src/styles/components/titlebar.css` with all extracted classes:
  - `.titlebar-container` — root div (height 36px, transparent bg, flex layout, user-select none, flex-shrink 0)
  - `.titlebar-label` — "CoolReader" text span (font-size 12px, rgba(255,255,255,0.3), margin-left 16px, font-weight 500, letter-spacing 0.3px)
  - `.titlebar-buttons` — button container div (display flex, height 100%)
  - `.titlebar-btn` — base button style (width 44px, height 100%, rgba text, flex center, transition background 0.12s)
  - `.titlebar-btn:hover` — hover state (rgba(255,255,255,0.06) background)
  - `.titlebar-btn.close:hover` — close button red hover (#e81123 bg, white text)
- Refactored `src/components/TitleBar.tsx` to use className instead of style={{}} and removed onMouseEnter/onMouseLeave handlers
- Imported CSS via `import '../styles/components/titlebar.css'`
- Build passed with no errors

### Files created
- `src/styles/components/titlebar.css`

### Files modified
- `src/components/TitleBar.tsx`: replaced all inline styles with CSS classes, removed hover handlers

### Notes
- Root div keeps `titlebar-drag` class for Electron drag region functionality
- Button container div keeps `titlebar-no-drag` class for Electron no-drag region
- Hover effects converted from JS (onMouseEnter/onMouseLeave) to CSS :hover pseudo-class
- Close button uses combined class `"titlebar-btn close"` for specific hover styling
- All button font-sizes vary slightly (14px for minimize/close, 12px for maximize) — kept as inline style since CSS class can't express this variation without additional specificity
- CSS transition on `.titlebar-btn` handles all hover state transitions uniformly

## Task: Extract inline styles from Library.tsx (2026-05-30)

### What was done
- Created `src/styles/components/library.css` with all extracted layout classes:
  - `.library-root` — root flex container (height 100%, flex row, relative, overflow hidden)
  - `.library-glow-1` — top radial glow decoration (rgba(99,102,241,0.12))
  - `.library-glow-2` — bottom radial glow decoration (rgba(168,85,247,0.08))
  - `.library-content` — content area (flex 1, relative, overflow hidden, z-index 1, perspective 1200px)
  - `.library-page` — page container (position absolute, inset 0, transition, transformStyle preserve-3d, backfaceVisibility hidden)
- Refactored `src/components/Library.tsx`:
  - Added `import '../styles/components/library.css'`
  - Replaced root div `style={{...}}` with `className="library-root"`
  - Replaced glow divs with `className="library-glow-1"` / `className="library-glow-2"`
  - Replaced content div with `className="library-content"`
  - Replaced page divs with `className="library-page"` + inline style for dynamic pointerEvents and animation transforms
- Added `[data-ui-theme="flat"] .library-glow-1, .library-glow-2 { display: none }` for flat theme
- Build passed with no errors (27.71 kB CSS output)

### Files created
- `src/styles/components/library.css`

### Files modified
- `src/components/Library.tsx`: replaced layout inline styles with CSS classes, kept dynamic styles inline

### Notes
- Dynamic styles kept inline: `pointerEvents` (conditional based on transition/libPage state), `booksAnim`/`statsAnim`/`settingsAnim` (runtime-computed opacity and transform)
- Page divs still have `overflow: 'hidden'` inline for stats and settings pages (only books page doesn't need it — BookShelf handles its own overflow)
- Glow decorations hidden in flat theme since they're purely aesthetic glass effects
- The `transformStyle: 'preserve-3d'` and `backfaceVisibility: 'hidden'` are now in CSS, not inline

## Task: Extract inline styles from SettingsPage.tsx (2026-05-30)

### What was done
- Created `src/styles/components/settings.css` with all extracted classes:
  - `.settings-container`, `.settings-title` (main list view container)
  - `.setting-item`, `.setting-item:hover` (main setting row — hover via CSS, not JS)
  - `.setting-label`, `.setting-value`, `.setting-arrow` (inner elements)
  - `.settings-sub-view` (detail panel with animation states)
  - `.settings-back-btn`, `.settings-back-arrow`, `.settings-sub-title` (back button area)
  - `.settings-sub-content` (glass card wrapper for sub-view content)
  - `.goal-label`, `.goal-input-row`, `.goal-input`, `.goal-unit`, `.goal-hint` (reading goal form)
  - `.radio-group`, `.radio-option`, `.radio-option:hover`, `.radio-option.selected` (radio group)
  - `.radio-input`, `.radio-label`, `.radio-desc`
  - `.toggle-row`, `.toggle-info-title`, `.toggle-info-desc`, `.toggle-switch`
  - `.save-btn` (gradient button)
  - `.bg-preset-grid`, `.bg-preset-item`, `.bg-preset-item.active`, `.bg-preset-preview`, `.bg-preset-check`, `.bg-preset-name`
- Refactored `SettingsPage.tsx`:
  - Removed `const settingItem: CSSProperties = {...}` constant
  - Replaced ALL `style={{...}}` with `className` references
  - Added `import '../styles/components/settings.css'`
  - Replaced hover `onMouseEnter`/`onMouseLeave` on `.setting-item` with CSS `:hover`
  - Replaced hover on back arrow with CSS `:hover`
  - Animation state logic computed into CSS class strings (e.g., `listClass = 'settings-container visible no-pointer'`)
  - Kept `style={{ background: p.gradient }}` on `.bg-preset-preview` since it's dynamic runtime value
- Added `[data-ui-theme="flat"]` overrides section with solid white backgrounds, #e5e7eb borders, darker text colors
- Build passed with no errors (electron-vite bundled CSS, 27.71 kB CSS output)

### Files created
- `src/styles/components/settings.css`

### Files modified
- `src/components/SettingsPage.tsx`: replaced all inline styles with CSS classes, removed CSSProperties constant

### Notes
- Animation state (push/pop sub-view) preserved — computed CSS class strings combine visibility, opacity/transform, and pointer-events states
- `.setting-item:hover` replaces JS hover handlers (background gradient change)
- `.settings-back-arrow:hover` replaces JS hover handlers (color change to #fff)
- Flat theme overrides: `.setting-item` becomes white bg with gray border; `.settings-sub-content` becomes white bg with subtle border; radio option selected uses #eff6ff bg with #6366f1 border
- Dynamic values like background gradient for each preset kept as inline `style={{ background: p.gradient }}`
- Removed `import type { CSSProperties } from 'react'` since no longer used

## Task 11: Remove unused glass/btnGlass from styles.ts (2026-05-30)

### What was done
- Searched all TS/TSX files for imports/references to `glass` and `btnGlass`
- `glass`: found only in styles.ts itself (definition) + theme.css/theme-glass.css (string match for CSS class names) — no actual JS imports
- `btnGlass`: found only in styles.ts — no imports anywhere
- Both were dead exports after Wave 2 CSS extraction
- Removed both from styles.ts, removed `CSSProperties` import (no longer needed)
- Retained: `colors` (book cover gradients), `defGrad` (default bg gradient), `bgPresets` (bg preset selector data)

### Files modified
- `src/utils/styles.ts`: removed `glass`, `btnGlass`, and `CSSProperties` import

### Verification
- Build passed with no errors (electron-vite bundled 197 modules, 19.27 kB CSS output)
