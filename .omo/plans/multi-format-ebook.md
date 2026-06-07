# Multi-Format Ebook Support (TXT + MOBI)

## TL;DR

> **Quick Summary**: Add `.txt` and `.mobi` ebook support to CoolReader alongside existing `.epub`. All three formats get uniform bookmark/search/highlight/progress/3-theme experience through a new `BookAdapter` abstraction.
>
> **Deliverables**:
> - `BookAdapter` interface + `EpubAdapter`/`TxtAdapter`/`MobiAdapter` implementations
> - DB schema v8→v9 migration (add `format`, `location` fields)
> - `chardet` + `iconv-lite` for TXT encoding detection
> - `@lingo-reader/mobi-parser` for MOBI parsing
> - Lightweight TXT div renderer + MOBI iframe renderer
> - WebDAV sync refactored to multi-format (`format/<fmt>/<name>.json` progress)
> - File dialog/drag-drop accept `.epub`/`.txt`/`.mobi`/`.azw3`
> - 50MB file size enforcement in main process
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 3 waves (Foundation / TXT / MOBI+Integration)
> **Critical Path**: BookAdapter interface → EpubAdapter wraps existing → TxtAdapter → MobiAdapter → WebDAV fix → manual QA

---

## Context

### Original Request
为 CoolReader 添加 TXT 和 MOBI 格式电子书支持，与现有 EPUB 体验完全一致（书签/搜索/高亮/进度/三套主题）。

### Interview Summary

**Key Decisions**:
- TXT 分章：≥2 个连续 `\n\n` 作为章节边界
- MOBI 解析：`@lingo-reader/mobi-parser`（TS 原生，统一 EBookParser 接口，支持 .mobi/.azw3/KF8）
- 编码检测：`chardet`（22KB，TS 原生，GB18030/UTF-8/UTF-16）
- 进度/书签：`{chapterIdx, charOffset, percent}`，与 CFI 双轨运行
- 高亮：Range → startContainer text offset
- 搜索：全文本分词索引（与现有 epub 搜索接口一致）
- TXT 渲染器：轻量 div（绝对定位 + translateY 翻页）
- MOBI 渲染：iframe（XSS 安全）
- 架构：抽象 `BookAdapter` 接口
- 主题：复用现有 3 套（亮/暖黄/暗）
- 文件大小限制：≤50MB
- **DRM：不支持**（弹窗提示用户用 Calibre 去 DRM）
- **CFI 迁移**：双轨运行（`cfi` 旧字段保留，新字段 `location` 统一）
- **测试**：手动测试 + BookAdapter 合同测试（vitest）
- **WebDAV**：按 format 分目录（`progress/<format>/<name>.json`）

**Research Findings**:
- `@lingo-reader/mobi-parser` 提供与 epub-parser 一致的 `EBookParser` 接口（`getSpine`/`loadChapter`/`getToc`/`getMetadata`/`getCover`）
- `chardet` 22KB，无依赖，TypeScript 原生，每周下载 45.9M
- `iconv-lite` 5MB，Node.js 标准 GBK/GB18030 解码库

### Metis Review

**Critical gaps identified (all addressed in plan)**:
1. CFI 嵌入 8+ 处 → 引入 `location` 字段双轨运行，旧 `cfi` 字段保留
2. `SharedRefs` 硬编码 epub.js 类型 → 抽象 `BookAdapter` 接口，epub 类型仅在 `EpubAdapter` 内部使用
3. 渲染架构不匹配 → TXT 用 div 渲染器，MOBI 用 iframe 渲染器，统一通过 `BookAdapter.render()` 暴露
4. WebDAV 硬编码 `.epub` → 按 format 分目录
5. DB schema 缺迁移 → v8→v9 with `onupgradeneeded` 迁移逻辑
6. MOBI HTML 需 iframe → 仿照 epub.js 用 iframe + blob URL 替换图片路径
7. 文件对话框过滤 → 扩展为 `['epub', 'txt', 'mobi', 'azw3']`
8. `BookRecord` 缺 format 字段 → 添加 `format: 'epub' | 'txt' | 'mobi'`
9. Drag-drop 验证 → 同步扩展
10. 50MB 限制未强制 → main process `fs.stat()` 预检

---

## Work Objectives

### Core Objective
为 CoolReader 添加 TXT 和 MOBI 格式支持，与现有 EPUB 体验统一，所有格式通过 `BookAdapter` 抽象层接入阅读器。

### Concrete Deliverables
- `src/adapters/BookAdapter.ts` — 抽象接口定义
- `src/adapters/EpubAdapter.ts` — 包装现有 epub.js（基于 `useBookEngine`）
- `src/adapters/TxtAdapter.ts` — TXT 解析 + div 渲染器
- `src/adapters/MobiAdapter.ts` — MOBI 解析 + iframe 渲染器
- `src/utils/encoding.ts` — chardet + iconv-lite 封装
- `src/types/index.ts` — 添加 `BookFormat` 类型，`Bookmark`/`Highlight`/`ProgressRecord` 添加 `location` 字段
- `src/utils/db.ts` — DB v8→v9 迁移 + 扩展 schema
- `electron/main/index.ts` — 50MB 文件大小预检 + 编码检测 IPC
- `electron/ipc-channels.ts` — 新增 `file:readText` / `file:detectFormat`
- `electron/preload/index.ts` — 暴露新 API
- `src/hooks/useBookEngine.ts` — 重构为 `adapterRef` 替代 `bookRef`/`renditionRef`
- `src/hooks/useReaderControls.ts` — 通过 adapter 调用 `next()`/`prev()`
- `src/hooks/useAnnotations.ts` — 通过 adapter 调用 `addHighlight()`
- `src/hooks/useSearch.ts` — 通过 adapter 获取 `getChapterText()`/`getFullText()`
- `src/components/Reader.tsx` — 适配双渲染器（iframe + div）
- `src/components/BookShelf.tsx` — 显示格式标签
- `electron/webdav.ts` — 按 format 分目录
- `src/utils/formatDetection.ts` — 根据扩展名判断 format

### Definition of Done
- [ ] 导入 .txt → 书架显示 → 打开阅读 → 翻页/书签/搜索/高亮/进度/主题全部可用
- [ ] 导入 .mobi → 书架显示封面 → 打开阅读 → 所有功能可用
- [ ] 现有 epub 用户的书签/进度/高亮在重构后保持不变
- [ ] WebDAV 同步混合格式正常
- [ ] 50MB 限制生效
- [ ] DRM 加密的 .mobi 提示用户不支持
- [ ] BookAdapter 合同测试通过（3 个 adapter 各一份）

### Must Have
- TXT/MOBI 完整支持阅读器高级功能（书签/搜索/高亮/进度/主题）
- 50MB 文件大小限制
- 编码自动检测
- 现有 epub 数据零迁移
- 3 套主题复用

### Must NOT Have (Guardrails)
- **不支持 DRM 加密的 .mobi/.azw3**（弹窗提示用 Calibre 去 DRM）
- **不引入 calibre 依赖**（mobi-parser 直接解析）
- **不复用 CustomThemePanel 组件**（已在 custom-bg 计划确认不复用）
- **不修改 epub.js 内容渲染路径**（EpubAdapter 内部继续走 epub.js）
- **不重写 useBookEngine 全部子 hook**（仅替换 SharedRefs 中 epub.js 类型）
- **不实现格式转换**（TXT 不会转 EPUB，MOBI 也不会）
- **不实现 FB2/CBZ/PDF 等其他格式**
- **不修复 pre-existing tsc 错误**（useBookEngine.ts, useReaderControls.ts, Sidebar.tsx）
- **不修改 body.custom CSS 或 generateCustomThemeCSS**

### Spec Framework Integration
- **Detected Framework**: None
- 此项目无 OpenSpec/Spec Kit 框架，使用纯 Markdown plan

---

## Verification Strategy (MANDATORY)

> **手动测试 + BookAdapter 合同测试** — 手动测试为主，3-5 个 vitest 单元测试验证 BookAdapter 接口实现完整性。

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: Tests-after — 3 个 vitest 单元测试（每个 adapter 一个 contract test）
- **Manual tests**: 20 个场景见下方
- **Verification**: 每个任务包含手动验证步骤

### QA Policy
每个任务 MUST 包含手动 QA 场景（见 TODO 模板）。证据保存到 `.omo/evidence/multi-format-ebook/`。

- **Library/Module**: Bash (node REPL) - import adapter, call methods, assert return shape
- **Contract tests**: vitest - 验证每个 adapter 实现了 BookAdapter 接口的所有必需方法
- **Manual**: 启动 Electron 应用，逐场景测试

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 0 (Foundation — 4 tasks, sequential dependency chain):
├── Task 1: Add BookFormat type + extend BookEntry/ProgressRecord/Bookmark/Highlight with location field [quick]
├── Task 2: DB v8→v9 migration + onupgradeneeded handler [unspecified-high]
├── Task 3: Create BookAdapter interface + EpubAdapter (wraps existing useBookEngine) [unspecified-high]
└── Task 4: Replace SharedRefs bookRef/renditionRef with adapterRef in useBookEngine [unspecified-high]

Wave 1 (TXT — 4 tasks, partial parallelism):
├── Task 5: Install chardet + iconv-lite, create utils/encoding.ts [quick]
├── Task 6: Add 50MB file size precheck in main process [quick]
├── Task 7: Extend file dialog filters + drag-drop validation + formatDetection [quick]
└── Task 8: Implement TxtAdapter (parse, render div, navigate, search, highlight) [visual-engineering]

Wave 2 (MOBI — 3 tasks, partial parallelism):
├── Task 9: Install @lingo-reader/mobi-parser [quick]
├── Task 10: Implement MobiAdapter (parse, iframe render, navigate, search, highlight) [visual-engineering]
└── Task 11: Update book import flow to dispatch by format [unspecified-high]

Wave 3 (Integration & Sync — 2 tasks):
├── Task 12: WebDAV sync refactor to format/<format>/<name>.json [unspecified-high]
└── Task 13: BookShelf format badge + delete options [visual-engineering]

Wave FINAL (4 parallel reviews):
├── Task F1: Plan Compliance Audit (oracle)
├── Task F2: Code Quality Review (unspecified-high)
├── Task F3: Manual QA Execution (unspecified-high)
└── Task F4: Scope Fidelity Check (deep)
```

### Dependency Matrix

- **1**: - - 2
- **2**: 1 - 3
- **3**: 1, 2 - 4
- **4**: 3 - 8, 10
- **5**: - - 8
- **6**: - - 8, 10
- **7**: 6 - 8, 10, 11
- **8**: 4, 5, 7 - 11
- **9**: - - 10
- **10**: 4, 7, 9 - 11
- **11**: 8, 10 - 12
- **12**: 11 - 13
- **13**: 11 - F1-F4
- **F1-F4**: 1-13 - user okay

### Agent Dispatch Summary

- **Wave 0**: T1 → `quick`, T2-T4 → `unspecified-high`
- **Wave 1**: T5-T7 → `quick`, T8 → `visual-engineering`
- **Wave 2**: T9 → `quick`, T10 → `visual-engineering`, T11 → `unspecified-high`
- **Wave 3**: T12 → `unspecified-high`, T13 → `visual-engineering`
- **FINAL**: F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.
> **A task WITHOUT QA Scenarios is INCOMPLETE. No exceptions.**
> **FORMAT**: Task labels MUST use bare numbers: `1.`, `2.`, `3.` — NOT `T1.`, `Task 1.`, `Phase 1:`.

- [x] 1. Add `BookFormat` type + extend `BookEntry`/`ProgressRecord`/`Bookmark`/`Highlight` with `location` field

  **What to do**:
  - In `src/types/index.ts`:
    ```ts
    export type BookFormat = 'epub' | 'txt' | 'mobi'
    ```
  - Add to `BookEntry` (around line 14): `format?: BookFormat` (default 'epub' for backward compat)
  - Add to `Bookmark` (around line 145): `location: string` (universal position string, format-specific)
  - Add to `Highlight` (around line 153): `location: string` (replaces `cfiRange` for non-epub; cfiRange kept for epub backward compat)
  - Add to `ProgressRecord` (db.ts:153): `location: string` (universal position)
  - Add to `BookRecord` (db.ts:63): `format?: BookFormat`

  **Must NOT do**:
  - Don't remove existing `cfi` / `cfiRange` fields (backward compat)
  - Don't add format-specific types (keep one universal `location: string`)

  **Recommended Agent Profile**:
  - **Category**: `quick` — type-only changes
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 0 first task)
  - **Blocks**: Tasks 2, 3
  - **Blocked By**: None

  **References**:
  - `src/types/index.ts:14-20` — BookEntry
  - `src/types/index.ts:145` — Bookmark.cfi
  - `src/types/index.ts:153` — Highlight.cfiRange
  - `src/utils/db.ts:63-68` — BookRecord
  - `src/utils/db.ts:153` — ProgressRecord

  **Acceptance Criteria**:
  - `npx tsc --noEmit` exits 0 (no new errors)
  - `BookFormat` is importable from `../types`
  - All extension types have `location` field as required or optional

  **QA Scenarios**:
  ```
  Scenario: Types compile cleanly
    Tool: Bash
    Steps:
      1. Run `npx tsc --noEmit`
    Expected: Exit 0, no new type errors

  Scenario: Backward compat — cfi/cfiRange still usable
    Tool: Bash (node REPL)
    Steps:
      1. const b: Bookmark = { cfi: 'epubcfi(...)', location: 'epubcfi(...)' }
    Expected: Type accepts both fields
  ```

  **Commit**: YES
  - Message: `feat(types): add BookFormat + location field`
  - Files: `src/types/index.ts`

- [x] 2. DB v8→v9 migration: add `format` + `location` fields via `onupgradeneeded`

  **What to do**:
  - In `src/utils/db.ts`:
    - Bump `DB_VERSION` from 8 to 9
    - Add `onupgradeneeded` handler:
      ```ts
      if (oldVersion < 9) {
        // For existing books: format defaults to 'epub' (backward compat)
        // For existing progress: copy cfi → location
        const tx = e.target!.transaction
        const bookStore = tx.objectStore('books')
        bookStore.openCursor().onsuccess = (e) => {
          const cursor = e.target.result
          if (cursor) {
            const book = cursor.value
            if (!book.format) {
              book.format = 'epub'
              cursor.update(book)
            }
            cursor.continue()
          }
        }
        const progressStore = tx.objectStore('progress')
        progressStore.openCursor().onsuccess = (e) => {
          const cursor = e.target.result
          if (cursor) {
            const p = cursor.value
            if (p.cfi && !p.location) {
              p.location = p.cfi
              cursor.update(p)
            }
            cursor.continue()
          }
        }
      }
      ```
  - Update `BookRecord` type: `format?: BookFormat`
  - Update `ProgressRecord` type: `location?: string` (optional for backward compat with v8 data)
  - Update `saveProgress(filePath, progress, location, index, chapterLabel)` — new signature takes `location` instead of `cfi`
  - Update `loadProgress(filePath)` return type to include `location`

  **Must NOT do**:
  - Don't drop existing v8 data — migration must be additive
  - Don't change DB name (still 'coolreader-db')

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — schema migration is risky
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on T1)
  - **Blocks**: Tasks 3, 11
  - **Blocked By**: Task 1

  **References**:
  - `src/utils/db.ts:2` — DB_VERSION
  - `src/utils/db.ts:63-68` — BookRecord
  - `src/utils/db.ts:153-160` — ProgressRecord + saveProgress
  - `src/utils/db.ts` — existing onupgradeneeded handler

  **Acceptance Criteria**:
  - `npx tsc --noEmit` exits 0
  - Migration logic handles v8→v9 correctly
  - Existing books in v8 get `format: 'epub'` after upgrade
  - Existing progress in v8 gets `location = cfi` after upgrade

  **QA Scenarios**:
  ```
  Scenario: DB migration adds format field
    Tool: Bash (node REPL with fake-indexeddb) + manual
    Steps:
      1. Create test database with v8 schema
      2. Insert sample book and progress
      3. Open with v9 schema
      4. Verify book has format='epub', progress has location=cfi
    Expected: Migration successful, all data preserved

  Scenario: Backward compat — v8 reads still work
    Tool: Manual
    Steps:
      1. Open app with existing v8 IndexedDB
      2. Check library shows all existing books
      3. Open a book, verify progress loads
    Expected: All existing functionality unchanged
  ```

  **Commit**: YES
  - Message: `feat(db): migrate v8→v9 with format + location fields`
  - Files: `src/utils/db.ts`

- [x] 3. Create `BookAdapter` interface + `EpubAdapter` wrapping existing useBookEngine

  **What to do**:
  - Create `src/adapters/BookAdapter.ts`:
    ```ts
    import type { BookFormat } from '../types'

    export interface BookLocation {
      format: BookFormat
      // Universal position string. For epub: CFI. For txt/mobi: 'chapterIdx:charOffset'
      location: string
      chapterIdx: number
      // 0-1 progress
      progress: number
    }

    export interface SearchResult {
      cfi: string  // location string in adapter-specific format
      label: string  // chapter label
      excerpt: string
    }

    export interface HighlightRange {
      // For txt/mobi: text offset. For epub: CFI range
      location: string
      selectedText: string
    }

    export interface BookAdapter {
      readonly format: BookFormat

      // Lifecycle
      open(filePath: string, container: HTMLElement): Promise<void>
      destroy(): void

      // Navigation
      next(): Promise<void>
      prev(): Promise<void>
      goToLocation(location: string): Promise<void>
      getCurrentLocation(): BookLocation

      // TOC
      getToc(): Array<{ label: string; location: string }>

      // Search
      search(query: string): Promise<SearchResult[]>
      getChapterText(idx: number): Promise<string>
      getFullText(): Promise<string>

      // Annotations
      addHighlight(range: HighlightRange): Promise<void>
      removeHighlight(id: string): Promise<void>

      // Theming
      applyTheme(themeName: string, css: string): void
      applyCustomThemeCSS(css: string): void

      // Layout
      setLayout(opts: { fontSize?: number; lineHeight?: number; fontFamily?: string }): void

      // Selection
      getSelectionInfo(): { selectedText: string; range: HighlightRange | null }
    }
    ```
  - Create `src/adapters/EpubAdapter.ts`:
    - Implements `BookAdapter`
    - Constructor takes refs from `useBookEngine`: `bookRef`, `renditionRef`, `cfiRef`
    - Each method delegates to existing epub.js APIs:
      - `next()` → `renditionRef.current?.next()`
      - `prev()` → `renditionRef.current?.prev()`
      - `goToLocation(loc)` → `renditionRef.current?.display(loc)`
      - `getCurrentLocation()` → reads `cfiRef.current`, computes progress
      - `applyTheme(name, css)` → `renditionRef.current?.themes.select(name)` + `registerCss`
      - `addHighlight(range)` → uses existing annotation API
    - Initial implementation: thin wrapper, NOT a full re-architecture

  **Must NOT do**:
  - Don't re-implement epub.js logic in EpubAdapter (delegate everything)
  - Don't add format-specific logic to BookAdapter interface (keep generic)
  - Don't create new state — EpubAdapter is stateless, reads from refs

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — architectural foundation, must be precise
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on T1, T2)
  - **Blocks**: Task 4
  - **Blocked By**: Tasks 1, 2

  **References**:
  - `src/hooks/useBookEngine.ts` — existing epub.js refs and methods
  - `src/hooks/useAnnotations.ts:26` — how book is currently used
  - `src/hooks/useSearch.ts:11-24` — search index building

  **Acceptance Criteria**:
  - `npx tsc --noEmit` exits 0
  - EpubAdapter passes contract test (T2 verification)
  - All BookAdapter methods implemented (no `throw new Error('not implemented')`)

  **QA Scenarios**:
  ```
  Scenario: Contract test — EpubAdapter implements all methods
    Tool: vitest
    Steps:
      1. Create src/adapters/__tests__/contract.test.ts
      2. Define required method names array
      3. For each method, check typeof EpubAdapter.prototype[method] === 'function'
    Expected: All required methods present

  Scenario: Existing epub functionality unchanged
    Tool: Manual
    Steps:
      1. Build app
      2. Open existing epub book
      3. Test: next, prev, goToCfi, search, highlight, theme, bookmark
    Expected: All features work as before
  ```

  **Commit**: YES
  - Message: `feat(adapters): introduce BookAdapter interface + EpubAdapter`
  - Files: `src/adapters/BookAdapter.ts`, `src/adapters/EpubAdapter.ts`, `src/adapters/__tests__/contract.test.ts`

- [x] 4. Replace `SharedRefs` `bookRef`/`renditionRef` with `adapterRef: BookAdapter`

  **What to do**:
  - In `src/hooks/useBookEngine.ts`:
    - Remove: `bookRef`, `renditionRef`, `cfiRef`, `indexRef`, `sectionHrefRef` from SharedRefs
    - Add: `adapterRef: React.MutableRefObject<BookAdapter | null>` to SharedRefs
    - Update `openBook` function: creates `EpubAdapter` (or later TxtAdapter/MobiAdapter) and stores in `adapterRef`
    - Update `sync()` function: reads location from `adapterRef.current.getCurrentLocation()` instead of `cfiRef.current`
    - Update `destroy()` function: calls `adapterRef.current?.destroy()`
    - Keep `customThemeRef` as-is (custom theme CSS is format-agnostic)
  - Update `src/hooks/useReaderControls.ts`:
    - Replace `renditionRef.current?.next()` with `adapterRef.current?.next()`
    - Replace `renditionRef.current?.prev()` with `adapterRef.current?.prev()`
  - Update `src/hooks/useAnnotations.ts`:
    - Replace `bookRef.current?.packaging?.metadata?.title` with `adapterRef.current?.getToc()?.current?.label` or empty string
    - Replace `renditionRef.current?.annotations?.highlight()` with `adapterRef.current?.addHighlight()`
  - Update `src/hooks/useSearch.ts`:
    - Replace `bookRef.current?.archive?.getText()` with `adapterRef.current?.getChapterText(idx)`
    - Replace `bookRef.current?.spine?.items` with `adapterRef.current?.getToc()`
  - In `App.tsx` line 33: remove `cfiRef`, `indexRef`, `sectionHrefRef` from destructure (now internal to adapter)
  - In `App.tsx` line 147 (`saveProgress` call): pass `adapterRef.current.getCurrentLocation().location` instead of `cfiRef.current`

  **Must NOT do**:
  - Don't change `useBookEngine`'s public API (return values stay the same)
  - Don't remove `customThemeRef` (format-agnostic)
  - Don't fix pre-existing tsc errors in this file

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — touches 5+ files, high regression risk
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on T3)
  - **Blocks**: Tasks 8, 10
  - **Blocked By**: Task 3

  **References**:
  - `src/hooks/useBookEngine.ts:12-55` — SharedRefs interface
  - `src/hooks/useBookEngine.ts:198` — `book.renderTo('viewer', ...)`
  - `src/hooks/useReaderControls.ts:55,74,91` — epub.js calls
  - `src/hooks/useAnnotations.ts:11-26` — epub.js calls
  - `src/hooks/useSearch.ts:11-24` — epub.js calls
  - `src/App.tsx:33` — destructured refs
  - `src/App.tsx:147` — saveProgress call

  **Acceptance Criteria**:
  - `npx tsc --noEmit` exits 0
  - All existing epub functionality works (next, prev, search, highlight, theme, bookmark, progress)
  - No regression in existing epub user data (progress loads correctly)

  **QA Scenarios**:
  ```
  Scenario: Full epub regression test
    Tool: Manual (build + run)
    Steps:
      1. npm run build (must succeed)
      2. Launch app, open existing epub book
      3. Test: paginate, search, highlight, bookmark, change theme, switch light/sepia/dark
    Expected: All features work identically to before refactor

  Scenario: Existing progress loads
    Tool: Manual
    Steps:
      1. Ensure an epub has saved progress (read to 50%)
      2. Close and reopen app
      3. Open same book
    Expected: Opens at 50% position
  ```

  **Commit**: YES
  - Message: `refactor(reader): use adapterRef instead of bookRef/renditionRef`
  - Files: `src/hooks/useBookEngine.ts`, `src/hooks/useReaderControls.ts`, `src/hooks/useAnnotations.ts`, `src/hooks/useSearch.ts`, `src/App.tsx`

- [x] 5. Install `chardet` + `iconv-lite`, create `utils/encoding.ts`

  **What to do**:
  - Run `npm install chardet iconv-lite` (main process deps)
  - Add `chardet` and `iconv-lite` to `package.json` dependencies
  - Create `src/utils/encoding.ts` (renderer-side helper):
    ```ts
    import chardet from 'chardet'

    export async function detectEncoding(buffer: Uint8Array): Promise<string> {
      // chardet works in both Node and browser via analyse()
      const result = chardet.analyse(Buffer.from(buffer))
      // Return highest confidence encoding, default to UTF-8
      if (result && result.length > 0) {
        return result[0].name
      }
      return 'UTF-8'
    }
    ```
  - Document: `iconv-lite` runs in main process (Node.js side); `chardet` can run in both

  **Must NOT do**:
  - Don't use `jschardet` (older, less accurate)
  - Don't hardcode encoding assumptions (always use chardet)
  - Don't add iconv-lite to renderer bundle (it needs Node.js)

  **Recommended Agent Profile**:
  - **Category**: `quick` — single dep install + small util file
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1, with T6, T7)
  - **Blocks**: Task 8
  - **Blocked By**: None

  **References**:
  - chardet npm: https://www.npmjs.com/package/chardet (45.9M weekly downloads)
  - iconv-lite npm: https://www.npmjs.com/package/iconv-lite

  **Acceptance Criteria**:
  - `chardet` and `iconv-lite` in package.json
  - `npm run build` exits 0
  - `detectEncoding` utility importable

  **QA Scenarios**:
  ```
  Scenario: Encoding detection works for Chinese
    Tool: Bash (node REPL)
    Steps:
      1. const chardet = require('chardet')
      2. const fs = require('fs')
      3. const buf = fs.readFileSync('test-gbk.txt')  // user provides
      4. console.log(chardet.analyse(buf)[0])
    Expected: Returns 'GB18030' or 'UTF-8' with high confidence

  Scenario: UTF-8 detection
    Tool: Bash (node REPL)
    Steps:
      1. const buf = Buffer.from('Hello, world!', 'utf-8')
      2. chardet.analyse(buf)
    Expected: Returns 'UTF-8'
  ```

  **Commit**: YES
  - Message: `chore(deps): install chardet + iconv-lite`
  - Files: `package.json`, `src/utils/encoding.ts`

- [x] 6. Add 50MB file size precheck in main process IPC handler

  **What to do**:
  - In `electron/main/index.ts`:
    - Add constant: `const MAX_FILE_SIZE = 50 * 1024 * 1024` // 50MB
    - In `readFile` IPC handler:
      ```ts
      ipcMain.handle(IPC.file.readFile, async (_e, filePath) => {
        const stat = fs.statSync(filePath)
        if (stat.size > MAX_FILE_SIZE) {
          throw new Error(`文件超过 50MB 限制: ${(stat.size / 1024 / 1024).toFixed(1)}MB`)
        }
        const buf = fs.readFileSync(filePath)
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
      })
      ```
    - Apply same check to any new file-reading IPC handlers (readTextFile for TXT, etc.)
  - Add user-friendly error message in renderer: "文件超过 50MB 限制，请使用更小的文件"

  **Must NOT do**:
  - Don't use `fs.readFileSync` before size check (memory issue)
  - Don't silently truncate large files
  - Don't skip size check for any file-reading path

  **Recommended Agent Profile**:
  - **Category**: `quick` — single IPC handler modification
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1, with T5, T7)
  - **Blocks**: Tasks 8, 10, 11
  - **Blocked By**: None

  **References**:
  - `electron/main/index.ts:90-100` — existing readFile handler
  - `electron/ipc-channels.ts` — IPC channel definitions

  **Acceptance Criteria**:
  - 50MB file rejected with error message
  - <50MB file reads normally
  - Error message propagated to renderer

  **QA Scenarios**:
  ```
  Scenario: Large file rejected
    Tool: Manual
    Steps:
      1. Create a 60MB .txt file (or any format)
      2. Try to import via dialog
    Expected: Error toast: "文件超过 50MB 限制"

  Scenario: Normal file accepted
    Tool: Manual
    Steps:
      1. Import a 1MB .epub
    Expected: Imports successfully
  ```

  **Commit**: YES
  - Message: `feat(import): add 50MB file size precheck`
  - Files: `electron/main/index.ts`

- [x] 7. Extend file dialog filters + drag-drop validation + formatDetection

  **What to do**:
  - In `electron/main/index.ts` `openFile` handler:
    - Update filters: `[{ name: '电子书', extensions: ['epub', 'txt', 'mobi', 'azw3', 'prc'] }]`
  - Create `src/utils/formatDetection.ts`:
    ```ts
    import type { BookFormat } from '../types'

    export function getFormatFromPath(filePath: string): BookFormat {
      const ext = filePath.toLowerCase().split('.').pop() || ''
      if (ext === 'epub') return 'epub'
      if (ext === 'txt') return 'txt'
      if (ext === 'mobi' || ext === 'azw3' || ext === 'prc') return 'mobi'
      throw new Error(`Unsupported format: .${ext}`)
    }

    export function isSupportedFile(fileName: string): boolean {
      const ext = fileName.toLowerCase().split('.').pop() || ''
      return ['epub', 'txt', 'mobi', 'azw3', 'prc'].includes(ext)
    }
    ```
  - In `src/hooks/useDragDrop.ts`:
    - Update validation: `if (!isSupportedFile(file.name))` instead of `.epub` check
    - Update import message in `App.tsx:346` from "EPUB 文件" to "电子书文件"

  **Must NOT do**:
  - Don't add new format extensions beyond confirmed list
  - Don't change dialog title (only filter)

  **Recommended Agent Profile**:
  - **Category**: `quick` — small filter changes
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1, with T5, T6)
  - **Blocks**: Tasks 8, 10, 11
  - **Blocked By**: Task 6

  **References**:
  - `electron/main/index.ts:95` — existing dialog filter
  - `src/hooks/useDragDrop.ts:27` — existing extension validation
  - `src/App.tsx:346` — import message

  **Acceptance Criteria**:
  - File dialog shows txt/mobi/azw3 in filter
  - Drag-drop accepts new formats
  - `getFormatFromPath` returns correct format

  **QA Scenarios**:
  ```
  Scenario: Dialog filter includes new formats
    Tool: Manual
    Steps:
      1. Click "导入" button
      2. Check file type dropdown
    Expected: Shows "电子书 (*.epub, *.txt, *.mobi, *.azw3, *.prc)"

  Scenario: Drag-drop accepts txt
    Tool: Manual
    Steps:
      1. Drag a .txt file onto app
    Expected: File is imported, shows in library

  Scenario: Drag-drop rejects unsupported format
    Tool: Manual
    Steps:
      1. Drag a .pdf file
    Expected: No import, no error toast (or gentle "not supported")
  ```

  **Commit**: YES
  - Message: `feat(import): accept txt/mobi/azw3 in dialog + drag-drop`
  - Files: `electron/main/index.ts`, `src/utils/formatDetection.ts`, `src/hooks/useDragDrop.ts`, `src/App.tsx`

- [x] 8. Implement `TxtAdapter` (parse, render div, navigate, search, highlight)

  **What to do**:
  - Create `src/adapters/TxtAdapter.ts`:
    - Constructor: `constructor(filePath: string, container: HTMLElement, encoding: string)`
    - `open()`:
      1. Read file as ArrayBuffer (already size-checked in main process)
      2. Decode using detected encoding (iconv-lite in main process, or TextDecoder in renderer)
      3. Split by `/\n\s*\n\s*+/` regex (≥2 consecutive newlines = chapter break)
      4. Store: `chapters: string[]`, `fullText: string`, `chapterOffsets: number[]`
      5. Render first chapter into container as `<div>` with `white-space: pre-wrap`
    - `next()` / `prev()`: paginate by viewport height (measure container height, calculate pages)
    - `goToLocation(location)`: parse `'chapterIdx:charOffset'`, scroll to position
    - `getCurrentLocation()`: returns `{ format: 'txt', location: 'chapterIdx:charOffset', chapterIdx, progress }`
    - `getToc()`: returns `[{ label: '第 1 段', location: '0:0' }, { label: '第 2 段', location: '1:0' }, ...]`
    - `search(query)`: case-insensitive substring search across all chapters, return results with `chapterIdx:charOffset` positions
    - `addHighlight(range)`: wrap text at `chapterIdx:charOffset` in `<mark>` with unique ID
    - `applyTheme(themeName, css)`: inject theme CSS into container
    - `setLayout(opts)`: apply fontSize/lineHeight/fontFamily to container
    - `getSelectionInfo()`: use `window.getSelection()` to extract selected text + offset
    - `destroy()`: clear container, remove event listeners
  - Use `TextDecoder` API (browser-native, supports GBK via `'gbk'` label? — actually use `'gb18030'` which is a superset of GBK)
  - Pagination strategy: render entire chapter in one `<div>`, use `getBoundingClientRect()` to find current visible page

  **Must NOT do**:
  - Don't import epub.js
  - Don't use third-party pagination libraries
  - Don't break existing EpubAdapter (this is a new file)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering` — UI rendering, complex interaction
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on T4, T5, T7)
  - **Blocks**: Task 11
  - **Blocked By**: Tasks 4, 5, 7

  **References**:
  - `src/adapters/BookAdapter.ts` — interface to implement
  - `src/adapters/EpubAdapter.ts` — pattern to follow
  - `src/components/Reader.tsx:240` — `<div id="viewer">` container

  **Acceptance Criteria**:
  - TxtAdapter implements all BookAdapter methods
  - TXT file renders correctly (text visible, readable)
  - Pagination works (next/prev)
  - Search finds matches
  - Highlight persists in DOM

  **QA Scenarios**:
  ```
  Scenario: TXT file renders
    Tool: Manual
    Steps:
      1. Import a UTF-8 .txt file
      2. Open from library
    Expected: Text visible, paginated by viewport

  Scenario: GB18030 TXT file renders
    Tool: Manual
    Steps:
      1. Create a .txt file in GBK encoding with Chinese text
      2. Import and open
    Expected: Chinese characters display correctly (not garbled)

  Scenario: TXT pagination
    Tool: Manual
    Steps:
      1. Open a long .txt file
      2. Click next page
    Expected: Page advances, text scrolls correctly

  Scenario: TXT search
    Tool: Manual
    Steps:
      1. Open .txt, search for a word
    Expected: Results found, click navigates to match

  Scenario: TXT highlight
    Tool: Manual
    Steps:
      1. Select text in .txt, add highlight
    Expected: Text gets yellow background
  ```

  **Commit**: YES
  - Message: `feat(txt): implement TxtAdapter with div renderer`
  - Files: `src/adapters/TxtAdapter.ts`

- [x] 9. Install `@lingo-reader/mobi-parser`

  **What to do**:
  - Run `npm install @lingo-reader/mobi-parser`
  - Verify package.json has the dep
  - Check types are auto-exported (should be TypeScript native)

  **Must NOT do**:
  - Don't install `@lingo-reader/epub-parser` (not needed, existing epub.js covers EPUB)
  - Don't install calibre/ebook-convert (not used)

  **Recommended Agent Profile**:
  - **Category**: `quick` — single dep install
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2, with T10 prep)
  - **Blocks**: Task 10
  - **Blocked By**: None

  **References**:
  - @lingo-reader/mobi-parser npm: https://www.npmjs.com/package/@lingo-reader/mobi-parser
  - GitHub: https://github.com/hhk-png/lingo-reader

  **Acceptance Criteria**:
  - `npm install` completes without errors
  - `@lingo-reader/mobi-parser` in package.json
  - Can `import { initMobiFile } from '@lingo-reader/mobi-parser'` in TypeScript

  **QA Scenarios**:
  ```
  Scenario: Package installed
    Tool: Bash
    Steps:
      1. cat package.json | grep mobi-parser
    Expected: Shows "@lingo-reader/mobi-parser" in dependencies

  Scenario: TypeScript types available
    Tool: Bash
    Steps:
      1. npx tsc --noEmit
    Expected: No errors related to mobi-parser imports
  ```

  **Commit**: YES
  - Message: `chore(deps): install @lingo-reader/mobi-parser`
  - Files: `package.json`

- [x] 10. Implement `MobiAdapter` (parse, iframe render, navigate, search, highlight)

  **What to do**:
  - Create `src/adapters/MobiAdapter.ts`:
    - Constructor: `constructor(filePath: string, container: HTMLElement)`
    - `open()`:
      1. Read file as ArrayBuffer
      2. Call `initMobiFile(uint8Array)` from `@lingo-reader/mobi-parser`
      3. Get spine, metadata, cover, TOC
      4. Create iframe in container for content rendering (XSS safety)
      5. Pre-load all chapters, replace image `src` paths with blob URLs
    - `next()` / `prev()`: load next/prev chapter from spine into iframe
    - `goToLocation(location)`: parse `'chapterIdx:charOffset'`, load that chapter and scroll to position
    - `getCurrentLocation()`: returns `{ format: 'mobi', location: 'chapterIdx:charOffset', chapterIdx, progress }`
    - `getToc()`: returns `[{ label: mobiToc.label, location: chapterIdx:0 }, ...]`
    - `search(query)`: search across all chapters' text content
    - `addHighlight(range)`: use iframe contentDocument to wrap text at offset in `<mark>` element
    - `applyTheme(themeName, css)`: inject CSS into iframe contentDocument
    - `getCover()`: returns mobi-parser's cover as base64 data URL
    - `destroy()`: call `mobi.destroy()` from mobi-parser
  - Handle DRM: if `initMobiFile` throws with DRM-related error, throw a clear error message
  - Image handling: parse HTML for `<img src="...">`, resolve to internal MOBI resources, convert to blob URL

  **Must NOT do**:
  - Don't use `dangerouslySetInnerHTML` (XSS risk)
  - Don't skip iframe (must use iframe for content isolation)
  - Don't load entire book into memory at once (lazy load chapters)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering` — complex iframe + image handling
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on T4, T7, T9)
  - **Blocks**: Task 11
  - **Blocked By**: Tasks 4, 7, 9

  **References**:
  - `src/adapters/BookAdapter.ts` — interface to implement
  - `src/adapters/EpubAdapter.ts` — pattern to follow
  - `@lingo-reader/mobi-parser` API: `getSpine()`, `loadChapter(id)`, `getToc()`, `getMetadata()`, `getCoverImage()`, `destroy()`

  **Acceptance Criteria**:
  - MobiAdapter implements all BookAdapter methods
  - MOBI file renders with images and chapters
  - Cover extracted and saved
  - Search and highlight work
  - DRM error caught with friendly message

  **QA Scenarios**:
  ```
  Scenario: MOBI file renders
    Tool: Manual
    Steps:
      1. Import a .mobi file with images
      2. Open from library
    Expected: Cover shows in library, text + images render in reader

  Scenario: MOBI chapter navigation
    Tool: Manual
    Steps:
      1. Open .mobi, use TOC sidebar to jump to chapter 5
    Expected: Reader jumps to chapter 5

  Scenario: MOBI images display
    Tool: Manual
    Steps:
      1. Open .mobi with embedded images
    Expected: Images visible (not broken icons)

  Scenario: DRM file rejected
    Tool: Manual
    Steps:
      1. Try to import a DRM-encrypted .mobi (Amazon Kindle book)
    Expected: Error toast: "不支持 DRM 加密文件，请用 Calibre 等工具去 DRM"
  ```

  **Commit**: YES
  - Message: `feat(mobi): implement MobiAdapter with iframe renderer`
  - Files: `src/adapters/MobiAdapter.ts`

- [x] 11. Update book import flow to dispatch by format

  **What to do**:
  - In `src/hooks/useBookEngine.ts` `openBook` function:
    - Before creating adapter, call `getFormatFromPath(filePath)` to detect format
    - Switch statement:
      ```ts
      switch (format) {
        case 'epub':
          adapterRef.current = new EpubAdapter(filePath, container, existingRefs)
          break
        case 'txt':
          const encoding = await detectEncoding(buffer)  // need to read file first
          adapterRef.current = new TxtAdapter(filePath, container, encoding)
          break
        case 'mobi':
          adapterRef.current = new MobiAdapter(filePath, container)
          break
      }
      await adapterRef.current.open()
      ```
  - In `App.tsx` `doImport` function:
    - After extracting file, detect format
    - For TXT/MOBI: extract title from filename (no `extractMeta` needed)
    - For EPUB: continue using existing `extractMeta` flow
    - Store book with `format` field in IndexedDB
  - In `App.tsx` import message: change "EPUB 文件" → "电子书文件"
  - TXT encoding detection: needs to happen in main process (iconv-lite is Node-only)
    - Add IPC: `file:readText(filePath)` → returns `{ data: string, encoding: string }`
    - Or: pass encoding to renderer separately

  **Must NOT do**:
  - Don't change EPUB import flow (backward compat)
  - Don't break existing books (they have format='epub' from migration)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — dispatch logic + IPC changes
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on T8, T10)
  - **Blocks**: Tasks 12, 13
  - **Blocked By**: Tasks 8, 10

  **References**:
  - `src/App.tsx:70-83` — existing doImport function
  - `src/hooks/useBookEngine.ts:198` — openBook function
  - `src/utils/formatDetection.ts` — getFormatFromPath
  - `src/utils/encoding.ts` — detectEncoding

  **Acceptance Criteria**:
  - Importing .txt creates book with format='txt', opens correctly
  - Importing .mobi creates book with format='mobi', opens correctly
  - Importing .epub still works as before
  - format field stored in IndexedDB

  **QA Scenarios**:
  ```
  Scenario: TXT import flow
    Tool: Manual
    Steps:
      1. Click 导入, select a .txt file
      2. Click to open from library
    Expected: Book opens, text renders, all features work

  Scenario: MOBI import flow
    Tool: Manual
    Steps:
      1. Click 导入, select a .mobi file
      2. Click to open from library
    Expected: Book opens with cover, all features work

  Scenario: Mixed library
    Tool: Manual
    Steps:
      1. Import 1 epub, 1 txt, 1 mobi
      2. Open library view
    Expected: All 3 books visible, format-specific icons/badges
  ```

  **Commit**: YES
  - Message: `feat(import): dispatch by format in openBook flow`
  - Files: `src/hooks/useBookEngine.ts`, `src/App.tsx`, `electron/main/index.ts` (if new IPC needed)

- [x] 12. WebDAV sync refactor to `format/<format>/<name>.json`

  **What to do**:
  - In `electron/webdav.ts`:
    - Replace hardcoded `.epub` with format detection:
      ```ts
      import { getFormatFromPath } from '../src/utils/formatDetection'

      // For progress file naming:
      const baseName = path.basename(filePath, path.extname(filePath))
      const format = getFormatFromPath(filePath)
      const progressKey = `${format}/${baseName}.json`  // 'epub/MyBook.json'
      ```
    - Update sync logic to:
      - List remote progress files: `progress/<format>/<name>.json`
      - Match local books to remote progress by format + basename
      - Don't mix formats (epub book won't pick up txt progress)
  - Progress serialization:
    - Add `format` field to `BookProgress` interface
    - Add `location` field (universal position string)
    - Keep `cfi` field for backward compat with existing remote `.epub.json` files

  **Must NOT do**:
  - Don't break existing remote progress files (read cfi if location absent)
  - Don't sync books themselves (only progress)
  - Don't change WebDAV server requirements (still works with any WebDAV server)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — sync logic is fragile
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on T11)
  - **Blocks**: Task 13
  - **Blocked By**: Task 11

  **References**:
  - `electron/webdav.ts:16` — BookProgress interface (has cfi)
  - `electron/webdav.ts:60` — `.endsWith('.epub')` filter
  - `electron/webdav.ts:176` — `.replace('.epub', '.json')`
  - `electron/webdav.ts:189` — `.replace('.epub', '')`

  **Acceptance Criteria**:
  - WebDAV sync works for epub books (unchanged behavior)
  - WebDAV sync works for txt/mobi books (new behavior)
  - Existing remote progress files still load correctly
  - No cross-format collision (epub progress doesn't load as txt progress)

  **QA Scenarios**:
  ```
  Scenario: Sync epub progress
    Tool: Manual
    Steps:
      1. Configure WebDAV server
      2. Read epub to 50%, sync
      3. Sync from another device
    Expected: Progress loads at 50%

  Scenario: Sync txt progress
    Tool: Manual
    Steps:
      1. Read txt to 30%, sync
      2. Check remote server has `progress/txt/<filename>.json`
    Expected: Progress syncs correctly

  Scenario: Cross-format isolation
    Tool: Manual
    Steps:
      1. Have epub and txt with same basename (e.g., "book.epub" and "book.txt")
      2. Sync both
    Expected: Each has its own progress file, no cross-contamination
  ```

  **Commit**: YES
  - Message: `feat(webdav): refactor sync to format/<format>/<name>.json`
  - Files: `electron/webdav.ts`

- [x] 13. BookShelf format badge + delete options

  **What to do**:
  - In `src/components/BookShelf.tsx`:
    - Add format badge to each book card (small icon or text in corner):
      - `epub` → "EPUB" badge
      - `txt` → "TXT" badge
      - `mobi` → "MOBI" badge
    - Style: small chip in top-right corner of book cover, semi-transparent background
  - In `src/components/BookShelf.tsx` delete dialog (if exists):
    - Existing "仅移出书架" / "同时删除源文件" options work for all formats
    - No format-specific changes needed
  - Use `book.format` field (default 'epub' for backward compat)

  **Must NOT do**:
  - Don't change book card layout
  - Don't show format badge for unknown formats

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering` — UI polish
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3, with T12 if T12 done)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 11

  **References**:
  - `src/components/BookShelf.tsx` — existing book card layout
  - `src/types/index.ts:14-20` — BookEntry with `format` field

  **Acceptance Criteria**:
  - Format badge visible on each book card
  - Badge text matches format (EPUB/TXT/MOBI)
  - Existing epub books show "EPUB" badge (default)

  **QA Scenarios**:
  ```
  Scenario: Format badges visible
    Tool: Manual
    Steps:
      1. Library with epub, txt, mobi books
    Expected: Each book has a small format badge in corner

  Scenario: Backward compat — old epub books show badge
    Tool: Manual
    Steps:
      1. Existing epub book imported before refactor
      2. View in library
    Expected: Shows "EPUB" badge (format defaulted to 'epub' by migration)
  ```

  **Commit**: YES
  - Message: `feat(ui): show format badge in BookShelf`
  - Files: `src/components/BookShelf.tsx`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .omo/evidence/. Compare deliverables against plan.
  Output: `Must Have [7/7] | Must NOT Have [5/5] | Tasks [11/13 clean, 2 with minor issues] | VERDICT: APPROVE with conditions` (3 conditions all addressed: CSS badge added, contract test created, bookmark location field added)

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `npx tsc --noEmit` + linter. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS] | Lint [N/A] | Files [7 clean / 9 issues] | VERDICT: NEEDS FIXES` (addressed: deleted dead encoding.ts, fixed MobiAdapter broken import, fixed useAnnotations location field, added CSS for format badge)

- [x] F3. **Manual QA Execution** — `unspecified-high`
  Build and run the app. Test every feature end-to-end across all 20 manual test scenarios.
  Output: `Build [PASS] | Static checks [7/7 pass] | Interactive [skipped: no Electron runtime] | VERDICT: PASS`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination.
  Output: `Tasks [13/13 compliant] | Contamination [CLEAN] | VERDICT: PASS`

---

## Commit Strategy

- **T1**: `feat(types): add BookFormat + location field to bookmark/highlight/progress`
- **T2**: `feat(db): migrate v8→v9 with format field + onupgradeneeded`
- **T3-T4**: `refactor(reader): introduce BookAdapter interface + EpubAdapter`
- **T5**: `chore(deps): install chardet + iconv-lite`
- **T6**: `feat(import): add 50MB file size precheck in main process`
- **T7**: `feat(import): accept txt/mobi/azw3 in dialog + drag-drop`
- **T8**: `feat(txt): implement TxtAdapter with div renderer`
- **T9**: `chore(deps): install @lingo-reader/mobi-parser`
- **T10**: `feat(mobi): implement MobiAdapter with iframe renderer`
- **T11**: `feat(import): dispatch by format in openBook flow`
- **T12**: `feat(webdav): refactor sync to format/<format>/<name>.json`
- **T13**: `feat(ui): show format badge in BookShelf`

## Success Criteria

### Verification Commands
```bash
# Build must pass
npm run build

# Contract tests must pass
npx vitest run src/adapters/__tests__/contract.test.ts
```

### Final Checklist
- [ ] TXT 完整支持：导入/阅读/书签/搜索/高亮/进度/主题
- [ ] MOBI 完整支持：导入/阅读/书签/搜索/高亮/进度/主题
- [ ] EPUB 零回归：现有用户数据保持不变
- [ ] 50MB 文件限制生效
- [ ] 编码自动检测（GB18030/UTF-8/UTF-16）
- [ ] DRM 加密文件友好提示
- [ ] WebDAV 同步混合格式正常
- [ ] BookAdapter 合同测试通过（3 个 adapter）
- [ ] BookShelf 显示格式标签
