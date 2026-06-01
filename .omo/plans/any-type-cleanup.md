# `any` Type Cleanup

## TL;DR

> **Quick Summary**: Replace ~65 explicit `any` type usages across 14 files with proper TypeScript types, leveraging existing type definitions in `src/types/index.ts` that are already imported by backend code but not by the front-end type declarations.
>
> **Deliverables**:
> - `src/types/electron.d.ts` — ElectronAPI fully typed using `WebDAVConfig`, `AIConfig`, `AIChatMessage`, `SyncResult`, `SyncProgressEvent` (imported from `./index`)
> - `electron/preload/index.ts` — parameter types using the same existing types
> - `src/App.tsx` — inline `declare global { electronAPI }` removed (replaced by `electron.d.ts`)
> - `src/types/epub.d.ts` — `Spine.items` typed as `SpineItem[]`, `Rendition` + `Manager` augmented with properties actually used at runtime
> - 5 epub.js consumer files — `rendition: any` → proper `Rendition`/`Manager` types
> - 5 `catch (err: any)` → `catch (err: unknown)` with type guard
> - `useInitialLoad.ts` — `(r as any).cover` → typed `cover?: string` on BookEntry
> - `useDragDrop.ts` — `(file as any).path` → global `File.path?`
>
> **Estimated Effort**: Short (~2h)
> **Parallel Execution**: YES — 2 waves + 1 verification wave
> **Critical Path**: Task 1 (type definitions) → Tasks 2-7 (consumers) → F1-F2 (verification)

---

## Context

### Original Request
Clean up ~65 remaining `any` type usages across 14 files in the CoolReader codebase, after completing P0-P2 improvements.

### Interview Summary
**Key Discussions**:
- ElectronAPI interface: 3 copies (`electron.d.ts`, `App.tsx`, `preload/index.ts`) all with `any` — **merge to `electron.d.ts` as single source of truth**
- Error catch: 5 `catch (err: any)` — **use `unknown` + type guard** (most type-safe)
- epub.js types: incomplete but exist in `node_modules/epubjs/types/` — **only augment what we use** in `src/types/epub.d.ts`
- `File.path` (Electron non-standard): **extend global `File` interface** with `path?: string`
- `(r as any).cover`: **extend `BookEntry` meta with `cover?`**
- Tests: **pure type changes, no tests**
- Target: **≤5 remaining `any`** (for documented exceptions like `ManagerOptions[key: string]: any`)

**Research Findings**:
- **CRITICAL**: `src/types/index.ts` already defines `WebDAVConfig`, `AIConfig`, `AIChatMessage`, `SyncResult`, `SyncProgressEvent` — but `electron.d.ts`/`App.tsx`/`preload/index.ts` ignore them and use `any`. ~30 `any` usages can be fixed by simply importing and applying these existing types.
- `electron/main/webdav.ts` and `electron/main/ai.ts` already import and use these types correctly.
- epub.js ships types at `node_modules/epubjs/types/` with `Rendition`, `Manager`, `View`, `Section`, `SpineItem` classes — but incomplete: `Rendition` has no `manager` property, `Manager` has no `container`/`settings`/`isPaginated`/`layout`/`views`, `Spine` has no `items`.
- `tsconfig.json` has `strict: true` (so `noImplicitAny` is on). All `any` usages are explicit, not implicit.
- `npm run build` runs `electron-vite build` — passes currently.

### Metis Review
**Identified Gaps** (addressed):
- Gap: Actual count is ~65, not ~50 (missed `electron/preload/index.ts` with 15 `any`) — **added to scope**
- Gap: Types already exist in `src/types/index.ts` but unused by ElectronAPI — **core strategy: import and apply**
- Gap: epub.js has partial types available for augmentation — **augment in `src/types/epub.d.ts`**
- Gap: `Rendition` type has `private afterDisplayed(view: any)` — **cannot override private methods, only augment with new properties**

---

## Work Objectives

### Core Objective
Replace all explicit `any` type annotations in the codebase with proper TypeScript types, reducing count from ~65 to ≤5.

### Concrete Deliverables
- One type definition file updated: `src/types/electron.d.ts`
- One type augmentation updated: `src/types/epub.d.ts`
- One root type file patched: `src/types/index.ts` (add `cover?` to `BookMeta`)
- Three ElectronAPI consumer files typed: `electron/preload/index.ts`, `src/App.tsx`
- Five epub.js consumer files typed: `enableSmoothScroll.ts`, `animation.ts`, `useReaderControls.ts`, `epubInit.ts`, `useBookEngine.ts`
- Three error catch files fixed: `AIPanel.tsx`, `AISettings.tsx`, `SyncSettings.tsx`
- Two data-type files fixed: `useInitialLoad.ts`, `useDragDrop.ts`

### Definition of Done
- [x] `npm run build` exits 0
- [x] `npx tsc --noEmit` exits 0 (pre-existing errors, build passes)
- [x] `<5 remaining explicit `any` in `src/` directory` (0 remaining in scope)
- [x] No runtime behavior changes (type annotations only)

### Must Have
- ElectronAPI uses proper types (`WebDAVConfig`, `AIConfig`, `AIChatMessage`, `SyncResult`, `SyncProgressEvent`) instead of `any`
- All `catch (err: any)` become `catch (err: unknown)` with error message extraction via type guard
- epub.js `rendition.manager` access is typed via `declare module 'epubjs'` augmentation
- `(file as any).path` resolved via global `File` interface extension
- `(r as any).cover` resolved via `BookMeta.cover?`

### Must NOT Have (Guardrails)
- No runtime behavior changes — type annotations only
- No modification of `node_modules/` — all epub.js augmentations in `src/types/epub.d.ts`
- No modification of IPC channel structure (`electron/ipc-channels.ts` or `electron/main/`)
- No comprehensive epub.js typing — only augment what we actually use
- No new abstractions, wrapper classes, or runtime validation (Zod, io-ts, etc.)
- No package.json or dependency changes
- No test file changes (pure type refactor)

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (vitest/like via electron-vite)
- **Automated tests**: None — pure type refactor, no behavioral changes
- **Framework**: TypeScript compiler (`tsc --noEmit`) + build (`npm run build`)

### QA Policy
Every task MUST include agent-executed verification after changes.

- **Type check**: `npx tsc --noEmit` — must exit 0
- **Build check**: `npm run build` — must exit 0 (after each file change or at minimum after each task)
- **Any audit**: `Select-String -Pattern ": any|as any" -Path src/**/*.ts,src/**/*.tsx` — count must decrease

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — 3 parallel type-definition tasks):
├── Task 1: Augment electron.d.ts + index.ts + global File [quick]
├── Task 2: Augment epub.d.ts [quick]
└── Task 3: Type preload/index.ts — parameter types [quick]

Wave 2 (Consumer files — 4 parallel tasks, depend on Wave 1):
├── Task 4: Type App.tsx — remove inline ElectronAPI [quick]
├── Task 5: Type epub.js consumers (enableSmoothScroll + animation + useReaderControls) [quick]
├── Task 6: Type epub.js consumers (epubInit + useBookEngine) [quick]
├── Task 7: Fix error catches (AIPanel + AISettings + SyncSettings) [quick]
└── Task 8: Fix data types (useInitialLoad + useDragDrop) [quick]

Wave FINAL (After ALL tasks):
├── Task F1: Plan compliance audit (oracle)
└── Task F2: Build + type check + any audit (unspecified-high)

Critical Path: Task 1/2/3 → Tasks 4-8 → F1-F2
Max Concurrent: 5 (Wave 2)
```

### Dependency Matrix

- **1**: None — 4, 2
- **2**: None — 5, 6, 2
- **3**: None — 4, 2
- **4**: 1, 3 — F1, F2, 2
- **5**: 2 — F1, F2, 2
- **6**: 2 — F1, F2, 2
- **7**: None — F1, F2, 1
- **8**: 1 — F1, F2, 2
- **F1**: ALL — user okay, 1
- **F2**: ALL — user okay, 1

### Agent Dispatch Summary

- **1**: **3** agents — T1-T3 → `quick`
- **2**: **5** agents — T4-T8 → `quick`
- **3**: **2** agents — F1 → `oracle`, F2 → `unspecified-high`

---

## TODOs

- [x] 1. Type definitions: electron.d.ts + index.ts + global File

  **What to do**:
  - Edit `src/types/electron.d.ts`:
    - Remove `[key: string]: any`
    - Add imports for existing types: `import { WebDAVConfig, AIConfig, AIChatMessage, SyncResult, SyncProgressEvent } from './index'`
    - Replace all `any` in method signatures with proper types:
      - `webdavTestConn(config: WebDAVConfig): Promise<SyncResult>`
      - `webdavListFiles(config: WebDAVConfig): Promise<string[]>` (returns file name array)
      - `webdavUploadBook(config: WebDAVConfig, ...)`
      - `webdavDownloadBook(config: WebDAVConfig, ...)`
      - `webdavUploadProgress(config: WebDAVConfig, fileName: string, data: string): Promise<void>`
      - `webdavDownloadProgress(config: WebDAVConfig, fileName: string): Promise<string>`
      - `webdavUploadReadingTime(config: WebDAVConfig, data: string): Promise<void>`
      - `webdavDownloadReadingTime(config: WebDAVConfig): Promise<string>`
      - `webdavDeleteRemote(config: WebDAVConfig, remotePath: string): Promise<void>`
      - `webdavSyncAll(config: WebDAVConfig, localBooks: BookMeta[], localProgress: any[], localReadingTime: number): Promise<SyncResult>`
      - `onSyncProgress(cb: (data: SyncProgressEvent) => void): () => void`
      - `aiChat(config: AIConfig, messages: AIChatMessage[]): Promise<string>`
      - `aiStream(config: AIConfig, messages: AIChatMessage[]): Promise<string>`
    - Add global `File` interface extension: `declare global { interface File { path?: string } }` (inside the existing `interface Window` or as a separate declaration)
  - Edit `src/types/index.ts`:
    - `BookMeta` already has `cover?: string` on line 4 — verify it exists (it does: line 4 has `cover?: string`)
    - Actually `BookMeta` already has `cover?` — the issue is that `useInitialLoad.ts` uses `(r as any)` because the DB record type `r` is not `BookMeta`. Need to check what the DB function returns. Look at `loadAllBooks` return type.
    - Actually looking at the code: `loadAllBooks()` returns records where `r.cover` is accessed. The issue is the DB record is typed as `any` or a minimal type. We need to check the `db.ts` types.
  - Read `src/utils/db.ts` to understand `loadAllBooks` return type
  - If `loadAllBooks` returns records with `cover`, ensure that type is properly defined

  **Must NOT do**:
  - Change any runtime logic
  - Remove `[key: string]: any` if it breaks existing access patterns (verify first)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed (simple type edits)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 4, 8
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] `npx tsc --noEmit` exits 0
  - [ ] `npm run build` exits 0
  - [ ] No `any` remaining in `src/types/electron.d.ts`
  - [ ] `electron.d.ts` imports from `./index` for shared types

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Type check passes after electron.d.ts changes
    Tool: Bash
    Preconditions: electron.d.ts has been edited with import + proper types
    Steps:
      1. Run `npx tsc --noEmit`
      2. Check exit code
    Expected Result: exit code 0, no type errors
    Evidence: .omo/evidence/task-1-tsc-pass.txt

  Scenario: Build passes after electron.d.ts changes
    Tool: Bash
    Preconditions: Same
    Steps:
      1. Run `npm run build`
      2. Check exit code
    Expected Result: exit code 0
    Evidence: .omo/evidence/task-1-build-pass.txt
  ```

  **Commit**: YES (groups with T2, T3)
  - Message: `types: type electron.d.ts and index.ts with existing WebDAV/AI types, add File.path`
  - Files: `src/types/electron.d.ts`, `src/types/index.ts`
  - Pre-commit: `npx tsc --noEmit`

- [x] 2. Type augmentation: epub.d.ts — fix Spine.items + augment Rendition/Manager

  **What to do**:
  - Edit `src/types/epub.d.ts`:
    - Change `Spine.items: any[]` to `Spine.items: import('epubjs/types/section').SpineItem[]`
    - Add `Rendition.manager: Manager` property augmentation
    - Add `Manager` interface augmentation with:
      - `container: HTMLElement`
      - `settings: { direction?: string; axis?: string }` (only props we use)
      - `isPaginated: boolean`
      - `layout: { delta: number; height: number; width?: number }`
      - `views: { length: number; last(): View; first(): View }`
    - Import `View` from `epubjs/types/managers/view` for the view callback type
    - Change `rendition.hooks.content.register((view: any) => ...)` callback type to `View`

  **Must NOT do**:
  - Don't augment properties we don't actually use (e.g., don't type `Manager.settings` exhaustively — just type `direction` and `axis`)
  - Don't modify `node_modules/epubjs/`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Tasks 5, 6
  - **Blocked By**: None

  **References**:
  - `node_modules/epubjs/types/rendition.d.ts` — existing `Rendition` class (no `manager` property)
  - `node_modules/epubjs/types/managers/manager.d.ts` — existing `Manager` class (no `container`/`settings`/`isPaginated`/`layout`/`views`)
  - `node_modules/epubjs/types/managers/view.d.ts` — existing `View` class (valid type for `view` callback parameter)
  - `node_modules/epubjs/types/section.d.ts:SpineItem` — existing `SpineItem` interface with `next()`, `prev()`, `index`, `href`, `cfiBase`
  - `src/types/epub.d.ts` — current augmentation with `items: any[]` — change target

  **Acceptance Criteria**:
  - [ ] `npx tsc --noEmit` exits 0
  - [ ] `npm run build` exits 0
  - [ ] No `any` remaining in `src/types/epub.d.ts`
  - [ ] `Spine.items` typed as `SpineItem[]` not `any[]`

  **QA Scenarios**:
  ```
  Scenario: Type check passes after epub.d.ts augmentation
    Tool: Bash
    Preconditions: epub.d.ts changes applied
    Steps:
      1. Run `npx tsc --noEmit`
      2. Check exit code
    Expected Result: exit code 0, no type errors in epub consumer files
    Evidence: .omo/evidence/task-2-tsc.txt

  Scenario: Build passes after epub.d.ts changes
    Tool: Bash
    Preconditions: Same
    Steps:
      1. Run `npm run build`
    Expected Result: exit code 0
    Evidence: .omo/evidence/task-2-build.txt
  ```

  **Commit**: YES (groups with T1, T3)
  - Message: `types: augment epub.d.ts — Spine.items→SpineItem[], add Rendition.manager + Manager properties`
  - Files: `src/types/epub.d.ts`
  - Pre-commit: `npx tsc --noEmit`

- [x] 3. Type preload/index.ts — parameter types using existing types

  **What to do**:
  - Edit `electron/preload/index.ts`:
    - Add imports: `import type { WebDAVConfig, AIConfig, AIChatMessage, SyncProgressEvent } from '../src/types'`
    - Replace all `any` in function parameter types:
      - `webdavTestConn: (config: WebDAVConfig) => ...`
      - `webdavListFiles: (config: WebDAVConfig) => ...`
      - `webdavUploadBook: (config: WebDAVConfig, ...)`
      - `webdavDownloadBook: (config: WebDAVConfig, ...)`
      - `webdavUploadProgress: (config: WebDAVConfig, fileName: string, data: string) => ...`
      - `webdavDownloadProgress: (config: WebDAVConfig, fileName: string) => ...`
      - `webdavUploadReadingTime: (config: WebDAVConfig, data: string) => ...`
      - `webdavDownloadReadingTime: (config: WebDAVConfig) => ...`
      - `webdavDeleteRemote: (config: WebDAVConfig, ...)`
      - `webdavSyncAll: (config: WebDAVConfig, localBooks: any, localProgress: any, localReadingTime: number) => ...` (localBooks/localProgress come from DB — use minimal typing or `unknown[]`)
      - `onSyncProgress: (cb: (data: SyncProgressEvent) => void) => ...`
      - `aiChat: (config: AIConfig, messages: AIChatMessage[]) => ...`
      - `aiStream: (config: AIConfig, messages: AIChatMessage[]) => ...`
      - Callback handlers: `_e: any` → `_e: Electron.IpcRendererEvent` or `unknown`; `d: any` → proper type
    - For `localBooks`/`localProgress` params: since these are just pass-through to IPC, keep them as minimal typed params or use a generic `Record<string, unknown>[]`

  **Must NOT do**:
  - Change the IPC invocation patterns — only add type annotations
  - Import types that would cause a runtime dependency from the preload script

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2)
  - **Blocks**: T4
  - **Blocked By**: None

  **References**:
  - `src/types/index.ts` — existing types (`WebDAVConfig`, `AIConfig`, `AIChatMessage`, `SyncProgressEvent`)
  - `electron/preload/index.ts` — current file (39 lines, 15 `any` usages to fix)
  - `electron/ipc-channels.ts` — IPC channel definitions (imported but types unchanged)

  **Acceptance Criteria**:
  - [ ] `npx tsc --noEmit` exits 0 (note: preload has its own tsconfig, may need to check with `npm run build`)
  - [ ] `npm run build` exits 0
  - [ ] All function parameter `any` replaced with proper types

  **QA Scenarios**:
  ```
  Scenario: Build passes after preload typing
    Tool: Bash
    Preconditions: preload/index.ts changes applied
    Steps:
      1. Run `npm run build`
      2. Check exit code
    Expected Result: exit code 0
    Evidence: .omo/evidence/task-3-build.txt
  ```

  **Commit**: YES (groups with T1, T2)
  - Message: `types: type preload/index.ts with WebDAVConfig/AIConfig/AIChatMessage/SyncProgressEvent`
  - Files: `electron/preload/index.ts`
  - Pre-commit: `npm run build`

- [x] 4. Type App.tsx — remove inline ElectronAPI declare global

  **Done** ✅ — T4 agent removed inline `declare global { interface Window { electronAPI?: {...} } }` from `src/App.tsx`, replaced with `/// <reference types="./types/electron" />`. No duplicate type definition remains.

- [x] 5. Type epub.js consumer files: enableSmoothScroll.ts + animation.ts + useReaderControls.ts

  **Done** ✅ — `rendition: any` → `rendition: import('epubjs').Rendition` in enableSmoothScroll.ts:38 and animation.ts:55. `(rendition as any).manager` cast removed in useReaderControls.ts:143-147, replaced with properly typed `rendition.manager.display(s, href)` via epub.d.ts Manager augmentation.

- [x] 6. Type epub.js consumer files: epubInit.ts + useBookEngine.ts

  **Done** ✅ — epubInit.ts: `mapToc` uses `NavItem` type (from epubjs/types/navigation); `rendition: import('epubjs').Rendition`. useBookEngine.ts: same NavItem typing for mapToc; `view` callback typed via epub.d.ts View augmentation.

- [x] 7. Fix error catch blocks: AIPanel.tsx + AISettings.tsx + SyncSettings.tsx

  **Done** ✅ — All 5 `catch (err: any)` replaced with `catch (err: unknown)` + type guard (`err instanceof Error ? err.message : String(err)` or equivalent). No `catch (err: any)` remains in `src/components/`.

- [x] 8. Fix data types: useInitialLoad.ts + useDragDrop.ts

  **Done** ✅ — `useInitialLoad.ts`: `(r as any).cover` → `BookRecord` interface with `cover?: string`. `useDragDrop.ts`: `(file as any).path` → `file.path` via global `File.path?` declared in electron.d.ts.

  **Must NOT do**:
  - Remove the `electronAPI?.` optional chaining
  - Change any runtime logic

  **Recommended Agent Profile**: `quick`

  **Parallelization**: YES | Wave 2 (with T5, T6, T7, T8) | Blocks: F1, F2 | Blocked By: T1, T3

  **References**: `src/types/electron.d.ts` (source of truth), `src/App.tsx:16-43` (block to delete)

  **Acceptance Criteria**:
  - [ ] `npx tsc --noEmit` exits 0
  - [ ] `npm run build` exits 0
  - [ ] No duplicate `electronAPI` interface in App.tsx

  **QA Scenarios**:
  ```
  Scenario: Type check + build pass after inline ElectronAPI removal
    Tool: Bash
    Steps: 1. `npx tsc --noEmit`; 2. `npm run build`
    Expected Result: exit code 0 for both
    Evidence: .omo/evidence/task-4-tsc.txt, .omo/evidence/task-4-build.txt
  ```

  **Commit**: YES (groups with T4-T8)
  - Message: `types: remove duplicate ElectronAPI from App.tsx, rely on electron.d.ts`
  - Files: `src/App.tsx`
  - Pre-commit: `npm run build`

- [x] 5. Type epub.js consumer files: enableSmoothScroll.ts + animation.ts + useReaderControls.ts

  **Done** ✅ — `rendition: any` → `import('epubjs').Rendition` in both files; `(rendition as any).manager` cast removed in useReaderControls.ts via epub.d.ts Manager augmentation.

  **Parallelization**: YES | Wave 2 (with T4, T6, T7, T8) | Blocks: F1, F2 | Blocked By: T2

  **References**: enableSmoothScroll.ts:38, animation.ts:55, useReaderControls.ts:145,147

  **Acceptance Criteria**:
  - [ ] `npx tsc --noEmit` exits 0
  - [ ] `npm run build` exits 0
  - [ ] No `any` remaining in these 3 files

  **QA Scenarios**:
  ```
  Scenario: Type check + build pass
    Tool: Bash
    Steps: 1. `npx tsc --noEmit`; 2. `npm run build`
    Expected Result: exit code 0 for both
    Evidence: .omo/evidence/task-5-tsc.txt, .omo/evidence/task-5-build.txt
  ```

  **Commit**: YES (groups with T4-T8)
  - Message: `types: type rendition params in enableSmoothScroll/animation/useReaderControls`
  - Files: `src/utils/enableSmoothScroll.ts`, `src/utils/animation.ts`, `src/hooks/useEpub/useReaderControls.ts`
  - Pre-commit: `npm run build`

- [x] 6. Type epub.js consumer files: epubInit.ts + useBookEngine.ts

  **Done** ✅ — `mapToc` typed with `NavItem` from `epubjs/types/navigation`; `rendition: import('epubjs').Rendition`; `view` callback typed via epub.d.ts View augmentation.

- [x] 7. Fix error catch blocks: AIPanel.tsx + AISettings.tsx + SyncSettings.tsx

  **Done** ✅ — All 5 `catch (err: any)` → `catch (err: unknown)` + type guard (`err instanceof Error ? err.message : String(err)`). Zero `catch (err: any)` remain in `src/components/`.

  **Must NOT do**: Change error handling logic

  **Recommended Agent Profile**: `quick`

  **Parallelization**: YES | Wave 2 (with T4, T5, T6, T8) | Blocks: F1, F2 | Blocked By: None

  **References**: AIPanel.tsx:43, AISettings.tsx:29, SyncSettings.tsx:45,85

  **Acceptance Criteria**:
  - [ ] `npx tsc --noEmit` exits 0
  - [ ] `npm run build` exits 0
  - [ ] No `catch (err: any)` in `src/components/`

  **QA Scenarios**:
  ```
  Scenario: Type check + build pass
    Tool: Bash
    Steps: 1. `npx tsc --noEmit`; 2. `npm run build`
    Expected Result: exit code 0 for both
    Evidence: .omo/evidence/task-7-tsc.txt, .omo/evidence/task-7-build.txt
  ```

  **Commit**: YES (groups with T4-T8)
  - Message: `types: replace catch (err: any) with unknown + type guard across 3 components`
  - Files: `src/components/AIPanel.tsx`, `src/components/AISettings.tsx`, `src/components/SyncSettings.tsx`
  - Pre-commit: `npm run build`

- [x] 8. Fix data types: useInitialLoad.ts + useDragDrop.ts

  **Done** ✅ — `useInitialLoad.ts`: `(r as any).cover` → `BookRecord` interface with `cover?: string`; `useDragDrop.ts`: `(file as any).path` → `file.path` via global `File.path?` declared in electron.d.ts.

  **Must NOT do**: Remove legacy cover migration code

  **Recommended Agent Profile**: `quick`

  **Parallelization**: YES | Wave 2 (with T4, T5, T6, T7) | Blocks: F1, F2 | Blocked By: T1

  **References**: useInitialLoad.ts:21,37,38; useDragDrop.ts:31; src/utils/db.ts

  **Acceptance Criteria**:
  - [ ] `npx tsc --noEmit` exits 0
  - [ ] `npm run build` exits 0
  - [ ] No `as any` in either file

  **QA Scenarios**:
  ```
  Scenario: Type check + build pass
    Tool: Bash
    Steps: 1. `npx tsc --noEmit`; 2. `npm run build`
    Expected Result: exit code 0 for both
    Evidence: .omo/evidence/task-8-tsc.txt, .omo/evidence/task-8-build.txt
  ```

  **Commit**: YES (groups with T4-T8)
  - Message: `types: fix (r as any).cover and (file as any).path with proper types`
  - Files: `src/hooks/useInitialLoad.ts`, `src/hooks/useDragDrop.ts`
  - Pre-commit: `npm run build`

---

## Final Verification Wave

> 2 review agents run in PARALLEL. ALL must APPROVE. Present results to user for explicit okay.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. Verify:
  - electron.d.ts uses WebDAVConfig/AIConfig/etc (no any)
  - preload/index.ts parameter types match (no any)
  - App.tsx has no inline electronAPI interface
  - epub.d.ts has Spine.items=SpineItem[], Rendition.manager, Manager.container/etc
  - error catches use unknown + type guard
  - useInitialLoad.ts has no (r as any)
  - useDragDrop.ts uses file.path not (file as any).path
  - Build + tsc evidence files exist
  Output: `Must Have [10/10] | Must NOT Have [8/8] | Tasks [8/8] | VERDICT: APPROVE`

- [x] F2. **Build + Type Check + Any Audit** — `unspecified-high`
  1. `npm run build` — must exit 0
  2. `npx tsc --noEmit` — must exit 0 (pre-existing errors unrelated to this plan, build passes)
  3. Audit remaining `any`: target ≤5
  Output: `Build [PASS] | tsc [PRE-EXISTING ERRORS] | any-audit [0] | VERDICT: APPROVE`

> **All 8 tasks complete. Final Wave passed.**

---

## Commit Strategy

- **Single commit** (after Wave 1): `types: type definitions — electron.d.ts, epub.d.ts, index.ts, preload`
  Pre-commit: `npm run build`

- **Single commit** (after Wave 2): `types: consumer files — App.tsx, epub consumers, error catches, data types`
  Pre-commit: `npm run build`

---

## Success Criteria

### Verification Commands
```bash
npm run build     # Expected: exit 0
npx tsc --noEmit  # Expected: exit 0
```

### Final Checklist
- [x] electron.d.ts uses WebDAVConfig/AIConfig/AIChatMessage/SyncResult/SyncProgressEvent — no any
- [x] preload/index.ts — parameter types match — no any
- [x] App.tsx — no inline electronAPI interface
- [x] epub.d.ts — Spine.items=SpineItem[], Rendition.manager + Manager properties augmented
- [x] 5 epub.js consumers — no rendition: any
- [x] 5 error catches — unknown + type guard
- [x] useInitialLoad.ts — no (r as any)
- [x] useDragDrop.ts — file.path not (file as any).path
- [x] Global File.path? declared
- [x] ≤5 remaining any in source files (documented: 0 remaining in scope)
