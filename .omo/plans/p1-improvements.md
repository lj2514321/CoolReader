# P1 Improvements — Architecture, Performance, Type Safety

## TL;DR

> **Quick Summary**: 5 independent improvements across Reader.tsx decomposition, hook refactoring, inline style extraction, React.memo optimization, and electronAPI type safety.
>
> **Deliverables**:
> - Reader.tsx split into Reader + ReaderSearchPanel + ReaderMarkersPanel + useReaderKeyboard
> - useBookEngine.ts refactored into focused sub-modules
> - Remaining inline styles migrated to reader.css
> - React.memo optimization on Reader component
> - electronAPI Non-null assertions replaced with graceful fallback
>
> **Estimated Effort**: Medium (3-4 hours)
> **Parallel Execution**: YES — 5 tasks in 3 waves
> **Critical Path**: Task 1 → Task 5

---

## Context

### Original Request

Based on project analysis (`omo/notepads/project-analysis.md`), the following P1 issues remain after completing P0 code deduplication:

| Priority | Issue | Impact |
|----------|-------|--------|
| P1 | Reader.tsx 763 lines — too large | Maintainability |
| P1 | useBookEngine.ts 370 lines — too complex | Maintainability |
| P1 | Reader.tsx still has inline styles (~15-20) | Consistency |
| P1 | Reader no React.memo (>30 props, full re-render) | Performance |
| P1 | window.electronAPI! Non-null assertions (6 places) | Type safety |

### Metis Review

- Identified that ReaderSearchPanel and ReaderMarkersPanel are pure UI components with no logic — can be extracted without affecting parent state management
- useBookEngine shares refs via SharedRefs — cannot fully decompose without affecting useReaderControls and useSearch, but can inline-load internal initialization logic
- electronAPI non-null assertions are only in AIPanel.tsx and useBookEngine.ts — limited scope

---

## Work Objectives

### Core Objective
Improve code quality, performance, and type safety across 5 targeted refactoring tasks

### Concrete Deliverables
- `src/components/Reader.tsx` — reduced from 763 → ~500 lines
- `src/components/ReaderSearchPanel.tsx` (new) — search panel extracted
- `src/components/ReaderMarkersPanel.tsx` (new) — markers/bookmarks panel extracted
- `src/hooks/useEpub/` — refactored with sub-utilities
- `src/utils/eletronAPI.ts` (new) — safe typed wrapper for electronAPI

### Must Have
- Zero functional changes — only refactoring
- Each component still receives state/props from Reader (no shared state inversion)
- inline style → CSS class migration: only static styles, keep dynamic ones inline
- React.memo comparison: default shallow comparison (React.memo is enough)

### Must NOT Have
- ❌ No state management changes (no Context, no Redux)
- ❌ No epub.js logic changes
- ❌ No CSS variable name changes
- ❌ No changes to Sidebar.tsx, BookShelf.tsx, or Library.tsx

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — 3 parallel tasks):
├── T1: UseReaderKeyboard hook extraction (Reader.tsx) [quick]
├── T2: ReaderSearchPanel + ReaderMarkersPanel extraction [quick]
├── T3: electronAPI safe wrapper [quick]
└── T4: Reader inline style → CSS migration [quick]

Wave 2 (After Wave 1 — 1 task):
├── T5: useBookEngine.ts refactoring [deep]
└── T6: React.memo on Reader [quick]

Wave FINAL (After ALL — 2 parallel reviews):
├── F1: Plan compliance audit (oracle)
└── F2: Code quality + build verification (unspecified-high)
```

### Dependency Matrix
- **T1, T2, T3, T4**: Independent — Wave 1
- **T5**: Depends on T1 (to understand current Reader structure) — Wave 2
- **T6**: Depends on T2 (Reader composability) — Wave 2 (parallel with T5)
- **F1, F2**: All — Final

---

## TODOs

- [x] 1. **Extract useReaderKeyboard hook from Reader.tsx**

  **What to do**:
  - Create `src/hooks/useReaderKeyboard.ts`
  - Move the keyboard event handling logic (Reader.tsx:209-230) into the hook
  - The hook receives callback refs (nextRef, prevRef, bookmarkRef, showSearchRef, showLayoutRef, showMarkersRef, showAIRef, closeTopPanel) and returns nothing (pure side-effect hook)
  - Keep the UI panel toggle logic (closeTopPanel) in Reader.tsx — only the raw key handler moves

  **Hook signature**:
  ```typescript
  import { useEffect, useRef } from 'react'
  import { ReaderLayout } from '../types'

  export function useReaderKeyboard(
    nextRef: React.MutableRefObject<() => void>,
    prevRef: React.MutableRefObject<() => void>,
    bookmarkRef: React.MutableRefObject<() => void>,
    showSearchRef: React.MutableRefObject<boolean>,
    showLayoutRef: React.MutableRefObject<boolean>,
    showMarkersRef: React.MutableRefObject<boolean>,
    showAIRef: React.MutableRefObject<boolean>,
    setShowSearch: (v: boolean) => void,
    setShowLayout: (v: boolean) => void,
    setShowMarkers: (v: boolean) => void,
    setShowAI: (v: boolean) => void,
    closeTopPanel: () => void,
    showControls: () => void,
    layout: ReaderLayout,
    flowRef: React.MutableRefObject<string>
  ) {
    // useEffect with keyboard event handler
  }
  ```

  **Recommended Agent Profile**: `quick`

  **Parallelization**: Wave 1 (parallel with T2, T3, T4)

  **Acceptance Criteria**:
  - [ ] `src/hooks/useReaderKeyboard.ts` created
  - [ ] Reader.tsx imports and calls `useReaderKeyboard(…)`
  - [ ] All keyboard shortcuts still work: ArrowRight/Left, Space, Escape, Ctrl+F, F11
  - [ ] `npm run dev` starts without error

  **QA Scenarios**:
  ```
  Scenario: Keyboard shortcuts still work
    Tool: Playwright
    Steps:
      1. Open app and load a book
      2. Press ArrowRight — page turns forward
      3. Press Escape — panels close
      4. Press Ctrl+F — search opens
    Expected: All keyboard events handled correctly
    Evidence: .omo/evidence/t1-keyboard.txt

  Scenario: build passes
    Tool: Bash
    Steps: npm run build
    Expected: exit 0
    Evidence: .omo/evidence/t1-build.txt
  ```

  **Commit**: YES — `refactor(reader): extract useReaderKeyboard hook`

- [x] 2. **Extract ReaderSearchPanel and ReaderMarkersPanel**
- [x] 3. **Create safe electronAPI wrapper**
- [x] 4. **Migrate remaining Reader inline styles to CSS classes**

  **What to do**:
  - Scan Reader.tsx for static inline `style={{...}}` that can be moved to CSS classes
  - Target patterns:
    - `onMouseEnter/onMouseLeave` opacity toggles (Reader.tsx:268-269, 275-276, 618-619, 641-642) → can use CSS `:hover` pseudo-class
    - `transition: 'opacity 0.3s ease'` → already defined in CSS? Check and add if not
    - Search result items `padding: '8px 10px'`, `borderRadius: 8`, `cursor: 'pointer'` → add `.reader-search-result-item` class
    - Marker items `flexShrink: 0`, `opacity: 0.6` → add `.reader-marker-btn` class
    - Keep dynamic styles (progress bar width via `progress%`, AI button gradient, theme button active background)
  - Add new CSS classes to `src/styles/components/reader.css`

  **Recommended Agent Profile**: `quick`

  **Parallelization**: Wave 1 (parallel with T1, T2, T3)

  **Acceptance Criteria**:
  - [ ] New CSS classes added to reader.css
  - [ ] Reader.tsx inline styles reduced by ~10-15
  - [ ] `npm run dev` starts without error
  - [ ] Visual appearance unchanged

  **QA Scenarios**:
  ```
  Scenario: Visual regression check
    Tool: Playwright
    Steps:
      1. Start dev server
      2. Load a book
      3. Check top bar buttons look correct (hover effects work)
      4. Check search results display correct padding/rounding
      5. Check markers display correctly
    Expected: Visual appearance unchanged
    Evidence: .omo/evidence/t4-visual.png
  ```

  **Commit**: YES (groups with T2 files) — `refactor(reader): migrate static inline styles to CSS`

- [x] 5. **Refactor useBookEngine — extract initialization logic**

  **What to do**:
  - Identify independent sub-logic in useBookEngine.ts (370 lines):
    - `extractMeta` (L55-73) — already a separate function
    - `readFile` (L51-53) — already a separate function
    - Settings/state restoration (L129-139, 220-228) — ~30 lines of Promise.all
    - TOC parsing (L116-126) — inline `mapToc` function
    - Annotation loading (L275-287) — bookmarks + highlights
    - Content hook registration (L155-195) — relatively complex
  - Create `src/hooks/useEpub/epubInit.ts` with shared initialization utilities
  - Move TOC parsing and state restoration into the new file
  - Keep main flow (openBook, sync, relocation) in useBookEngine.ts
  - Move annotation loading into a separate async function `restoreAnnotations`
  - Target: reduce useBookEngine.ts from 370 → ~250 lines

  **Recommended Agent Profile**: `deep`

  **Parallelization**: Wave 2 (after T1)

  **Acceptance Criteria**:
  - [ ] `src/hooks/useEpub/epubInit.ts` created
  - [ ] useBookEngine.ts reduced by ~120 lines
  - [ ] `npm run build` exits 0
  - [ ] Book opening and navigation still works correctly

  **QA Scenarios**:
  ```
  Scenario: Book loading still works
    Tool: Playwright
    Steps:
      1. Open app
      2. Load an EPUB file
      3. Verify book renders correctly
      4. Navigate to next page
    Expected: Book loads and renders correctly
    Evidence: .omo/evidence/t5-book-load.txt

  Scenario: build passes
    Tool: Bash
    Steps: npm run build
    Expected: exit 0
    Evidence: .omo/evidence/t5-build.txt
  ```

  **Commit**: YES — `refactor(epub): extract initialization utilities from useBookEngine`

- [x] 6. **Add React.memo to Reader component**

  **What to do**:
  - Wrap the `Reader` function component with `React.memo` at the export:
    ```typescript
    export const Reader = React.memo(function Reader({...}: ReaderProps) { ... })
    ```
  - Add `import { useEffect, useRef, useState, memo } from 'react'` at the top
  - No custom comparison function needed — default shallow comparison is sufficient
  - This prevents the Reader component from re-rendering when parent (App.tsx or Library.tsx) re-renders but Reader's own props haven't changed

  **Recommended Agent Profile**: `quick`

  **Parallelization**: Wave 2 (parallel with 5 — operates on same file but independent change)

  **Acceptance Criteria**:
  - [ ] Reader exported as `React.memo(function Reader({...})` or `export const Reader = React.memo(...)`
  - [ ] `npm run build` exits 0

  **QA Scenarios**:
  ```
  Scenario: Build passes with React.memo
    Tool: Bash
    Steps: npm run build
    Expected: exit 0
    Evidence: .omo/evidence/t6-build.txt
  ```

  **Commit**: YES — `perf(reader): add React.memo to Reader component`

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
  For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check Reader.tsx line count (should be ~500).
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality + Build Verification** — `unspecified-high`
  Run `npm run build`. Check for any console.log, debugger, @ts-ignore added. Verify React.memo applied on Reader.
  Output: `Build [PASS/FAIL] | Scope [CLEAN/ISSUES] | VERDICT`

---

## Commit Strategy

| Task | Message | Files |
|------|---------|-------|
| 1 | `refactor(reader): extract useReaderKeyboard hook` | src/hooks/useReaderKeyboard.ts, src/components/Reader.tsx |
| 2 | `refactor(reader): extract SearchPanel and MarkersPanel components` | src/components/ReaderSearchPanel.tsx, src/components/ReaderMarkersPanel.tsx, src/components/Reader.tsx |
| 3 | `refactor: create safe electronAPI wrapper, remove non-null assertions` | src/utils/electronAPI.ts, src/components/AIPanel.tsx, src/hooks/useEpub/useBookEngine.ts |
| 4 | `refactor(reader): migrate static inline styles to CSS` | src/components/Reader.tsx, src/styles/components/reader.css |
| 5 | `refactor(epub): extract initialization utilities from useBookEngine` | src/hooks/useEpub/epubInit.ts, src/hooks/useEpub/useBookEngine.ts |
| 6 | `perf(reader): add React.memo to Reader component` | src/components/Reader.tsx |

---

## Success Criteria

### Verification Commands
```bash
npm run build   # Expected: exit 0
```

### Final Checklist
- [ ] Reader.tsx reduced from 763 to ~500 lines
- [ ] 3 new component/hook files created
- [ ] 1 new utility file created
- [ ] 5-10 new CSS classes added
- [ ] Zero functional changes
- [ ] Build exits 0
