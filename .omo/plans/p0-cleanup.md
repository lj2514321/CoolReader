# P0 Cleanup — Type Errors + vitest + Dead Directive

## TL;DR

> **Quick Summary**: Eliminate the ~20 TypeScript errors that block `npx tsc --noEmit`, install the missing `vitest` dev dependency so the `BookAdapter` contract test can actually run, and remove one dead `@ts-expect-error` directive. No behavioral changes — pure type/test-infrastructure cleanup.
>
> **Deliverables**:
> - `src/types/epub.d.ts` — type-patch extension covering EpubAdapter v1.5.3 API surface
> - `src/adapters/EpubAdapter.ts` — DOM null guards + `getCfiFromRange` null safety + `registerCss` overload fix
> - `src/hooks/useEpub/useBookEngine.ts` — `Uint8Array` → `ArrayBuffer` coercion + `packaging.metadata` guard
> - `src/adapters/TxtAdapter.ts` — `parent.innerHTML` cast to `HTMLElement`
> - `src/components/Sidebar.tsx` — remove dead `@ts-expect-error`
> - `package.json` + `package-lock.json` — add `vitest ^1.6.0` devDependency + `"test"` script
> - `npx tsc --noEmit` exits 0
> - `npx vitest run src/adapters/__tests__/contract.test.ts` passes (3 adapters × 18 methods = 54 assertions)
>
> **Estimated Effort**: Short (~2-3h)
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: vitest install → epub.d.ts patch → EpubAdapter guards → useBookEngine guards → TxtAdapter cast → Sidebar cleanup → tsc clean → contract test passes

---

## Context

### Original Request
用户请求 "先规划 p0 方案吧"，对应 `.omo/notepads/project-analysis-v3.md`（v1.5.3 真实状态分析）中的 3 个 P0 项：
1. `npx tsc --noEmit` 编译失败，~20 类型错误
2. `src/adapters/__tests__/contract.test.ts:7` 缺 `vitest` 依赖，合同测试从未跑过
3. `src/components/Sidebar.tsx:35` 多余的 `@ts-expect-error` 死指令

### Interview Summary

**Key Decisions** (用户已确认范围):
- 范围限定 P0 三件事，不扩到 P1/P2
- 不重写 `EpubAdapter.setBook()` 后向兼容 helper（保留到 P1-4）
- 不动 `Reader.tsx` 33.7KB 重构（保留 P2）
- 不修 `any` 残回（保留 P1-8）
- 类型补丁只补 `epub.d.ts` 缺的内容，不重构

**Technical Choices**:
- vitest 版本：`^1.6.0`（与 vite ^5.0.0 兼容，npm weekly 下载稳定）
- vitest 安装方式：`npm install -D vitest`，加 `"test": "vitest run"` script
- 不引入 `@vitest/expect`（vitest 已自带）
- `tsconfig.json` 不改 `types` 字段（避免破坏其他类型加载）

**Research Findings**:
- `src/types/epub.d.ts` 是 v1.5.2 any-cleanup 计划产物，106 行
- 实际 epubjs v0.3.93 真实导出：`View` 在 `epubjs/types/managers/view`（EpubAdapter:1 import 错误），`EpubNavItem` 类型名已改为 `NavItem`（EpubAdapter:2 import 错误）
- `ePub()` 在 v0.3.93 签名接受 `string | ArrayBuffer`，但当前 `electronAPI.readFile` 返回 `ArrayBuffer` 通过 IPC，再 `.buffer.slice()` 包装，类型补丁写的是 `ArrayBuffer` 但 epubjs 实际可能是 `Uint8Array` 子类型兼容
- `EpubAdapter.ts:326` `themes.registerCss(css)` 单参数签名被 EpubAdapter 当 2 参数调用 `themes.registerCss('custom', css)`

### Metis Review

**Identified Gaps** (addressed):
1. **类型补丁可能进一步破坏其他文件**：v1.5.2 的 epub.d.ts 当前是 useBookEngine 等 5 个文件已通过；本计划只**扩展** `View`/`Book`/`Rendition` 接口，**不修改**现有签名 → 最小爆炸面
2. **vitest 安装需 lockfile 同步**：直接 `npm install -D vitest` 会自动更新 package-lock.json，commit 时一起提交
3. **`themes.registerCss` 双签名问题**：epub.d.ts:85 写的是 `registerCss(css: string)` 单参数，但 EpubAdapter:326 调用 `themes.registerCss('custom', css)`，需要扩展为 `registerCss(name: string, css?: string)` 双参数
4. **contract.test.ts 的 5 处类型问题**：vitest 类型加载后还会有 `EpubAdapter`/`TxtAdapter`/`MobiAdapter` 实例化参数 shape 错误 — 计划在"vitest install"任务后追加"contract test 烟雾测试"任务
5. **EpubAdapter destroy 内 `(this as any)._messageHandler`**（EpubAdapter:154/156）— 是 plan v1.5.3 引入的 any 残留，本计划**不修**（保留到 P1）
6. **Sidebar.tsx 的 `(item.subitems ?? []).length` 真的没问题**：原代码 `// @ts-expect-error` 注释说 "subitems is optional, guard with ??"，但代码已经写了 `?? []`，所以 ts-expect-error 找不到错 → 确认是死指令

---

## Work Objectives

### Core Objective
让 `npx tsc --noEmit` 通过 + `npx vitest run` 跑通合同测试 + 移除 1 行死指令，三个独立、可验证的目标。

### Concrete Deliverables
- `src/types/epub.d.ts` 扩展（不改现有 106 行签名）
- `src/adapters/EpubAdapter.ts` 类型安全修复（5 处）
- `src/hooks/useEpub/useBookEngine.ts` 类型安全修复（3 处）
- `src/adapters/TxtAdapter.ts` 类型安全修复（1 处）
- `src/components/Sidebar.tsx` 死指令清理（1 行）
- `package.json` 加 `vitest` devDep + `"test"` script
- `package-lock.json` 自动同步

### Definition of Done
- [ ] `npx tsc --noEmit` exit code 0，无错误无新增警告
- [ ] `npx vitest run src/adapters/__tests__/contract.test.ts` 全绿（3 adapters × 18 methods + 1 format check = ~57 assertions）
- [ ] `Sidebar.tsx` 编译无 `@ts-expect-error` 残留
- [ ] `npm run build` exit code 0（vite 编译不破现有逻辑）
- [ ] git log 包含 6 个原子 commit（按 wave）

### Must Have
- 全部 tsc P0 错误清零
- vitest 安装 + 合同测试可跑通
- 类型补丁不破坏 useBookEngine / useReaderControls / useSearch 现有通过的文件

### Must NOT Have (Guardrails)
- **不修改任何业务逻辑**（不改翻页、主题、阅读体验）
- **不重写 EpubAdapter / TxtAdapter / MobiAdapter**
- **不删除 `EpubAdapter.setBook()` helper**（P1 范围）
- **不修 `any` 残留**（P1-8 范围）
- **不重构 useBookEngine**（P1-5 范围）
- **不拆 Reader.tsx**（P2 范围）
- **不升级 epubjs / vite / typescript 版本**
- **不修改 tsconfig.json**（类型补丁独立于 tsconfig 即可生效）
- **不动 v1.5.3 plan 中 EpubAdapter.ts:154/156 的 `(this as any)._messageHandler`**（保留到 P1）
- **不动 `window.electronAPI!.xxx()` 4 处非空断言**（P2-7 范围）
- **不动 DB v8→v9 schema、UI 主题、背景配置**

### Spec Framework Integration
- **Detected Framework**: None
- 此项目无 OpenSpec/Spec Kit 框架，使用纯 Markdown plan

---

## Verification Strategy (MANDATORY)

> **完全 agent-executed** — 无 human intervention。所有验证用 `npx tsc --noEmit` 与 `npx vitest run` 命令。

### Test Decision
- **Infrastructure exists**: PARTIAL — `contract.test.ts` 已存在但 `vitest` 未安装
- **Automated tests**: TDD-style — 先让合同测试跑通（vitest 装好后立即验证 3 个 adapter 接口完整）
- **Framework**: vitest ^1.6.0
- **If TDD**: RED → 装 vitest → 看测试 import 失败 → GREEN → 修类型让测试 PASS

### QA Policy
每个任务 MUST 包含 agent-executed QA 场景，证据保存到 `.omo/evidence/p0-cleanup/`。

- **TypeScript 编译**：Bash `npx tsc --noEmit 2>&1 | tee .omo/evidence/p0-cleanup/tsc-final.txt`
- **vitest 合同测试**：Bash `npx vitest run src/adapters/__tests__/contract.test.ts 2>&1 | tee .omo/evidence/p0-cleanup/vitest-final.txt`
- **build 验证**：Bash `npm run build 2>&1 | tee .omo/evidence/p0-cleanup/build-final.txt`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — 3 tasks, all parallelizable):
├── Task 1: Install vitest + add test script [quick]
├── Task 2: Extend src/types/epub.d.ts (type patches for EpubAdapter API) [quick]
└── Task 3: Remove dead @ts-expect-error from Sidebar.tsx [quick]

Wave 2 (Type Guards — 2 tasks, can parallelize after Wave 1):
├── Task 4: Fix EpubAdapter.ts DOM null guards + registerCss overload + getCfiFromRange safety [unspecified-high]
└── Task 5: Fix useBookEngine.ts Uint8Array coercion + packaging.metadata guards [unspecified-high]

Wave 3 (TxtAdapter + Final Verification):
├── Task 6: Fix TxtAdapter.ts:317 parent.innerHTML cast [quick]
└── Task 7: Run full tsc + vitest + build verification [quick]

Wave FINAL (4 parallel reviews):
├── Task F1: Plan Compliance Audit (oracle)
├── Task F2: Code Quality Review (unspecified-high)
├── Task F3: Real Type/Build/Test verification (deep)
└── Task F4: Scope Fidelity Check (deep)
```

### Dependency Matrix

- **1**: - - 7, F1-F4
- **2**: - - 4, 5, 7, F1-F4
- **3**: - - 7, F1-F4
- **4**: 2 - 7
- **5**: 2 - 7
- **6**: - - 7
- **7**: 1, 2, 3, 4, 5, 6 - F1-F4
- **F1-F4**: 1-7 - user okay

### Agent Dispatch Summary

- **Wave 1**: T1 → `quick`, T2 → `quick`, T3 → `quick` (3 in parallel)
- **Wave 2**: T4 → `unspecified-high`, T5 → `unspecified-high` (2 in parallel)
- **Wave 3**: T6 → `quick`, T7 → `quick` (2 in parallel)
- **FINAL**: F1 → `oracle`, F2 → `unspecified-high`, F3 → `deep`, F4 → `deep`

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.
> **FORMAT**: Task labels MUST use bare numbers: `1.`, `2.`, `3.` — NOT `T1.`, `Task 1.`, `Phase 1:`.

- [x] 1. Install vitest devDependency + add `"test"` script to package.json

  **What to do**:
  - Run `npm install -D vitest@^1.6.0`
  - Verify `package.json` devDependencies now contains `"vitest": "^1.6.0"`
  - Verify `package-lock.json` auto-updated
  - Add to `package.json` scripts:
    ```json
    "test": "vitest run",
    "test:watch": "vitest"
    ```
  - Document: vitest 与 vite ^5.0.0 兼容，weekly downloads 稳定

  **Must NOT do**:
  - 不要安装 `@vitest/expect`（vitest 已自带 expect）
  - 不要安装 `jsdom` 或 `happy-dom`（合同测试是纯结构性检查，不需要 DOM）
  - 不要改 `"build"` / `"dev"` / `"dist"` / `"preview"` 现有 scripts
  - 不要把 `vitest.config.ts` 写到项目根（保持简单）

  **Recommended Agent Profile**:
  - **Category**: `quick` — single package install + 1 line script addition
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Task 7, F1-F4
  - **Blocked By**: None (foundation task)

  **References**:

  **Pattern References**:
  - `src/adapters/__tests__/contract.test.ts:7` — `import { describe, it, expect } from 'vitest'` 等待 vitest 安装后类型可解析
  - `package.json:6-10` — 现有 scripts 结构

  **External References**:
  - vitest docs: https://vitest.dev/guide/installation.html
  - vitest 1.6.0 release: https://github.com/vitest-dev/vitest/releases/tag/v1.6.0

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: vitest installed and importable
    Tool: Bash
    Preconditions: 项目根目录
    Steps:
      1. npm install -D vitest@^1.6.0
      2. cat package.json | grep vitest
    Expected Result: package.json devDependencies 包含 "vitest": "^1.6.0"
    Evidence: .omo/evidence/p0-cleanup/task-1-vitest-install.txt

  Scenario: contract test imports resolve
    Tool: Bash
    Preconditions: vitest installed
    Steps:
      1. npx tsc --noEmit 2>&1 | grep -i vitest
    Expected Result: 0 行匹配
    Evidence: .omo/evidence/p0-cleanup/task-1-tsc-vitest-clear.txt

  Scenario: vitest runner works
    Tool: Bash
    Steps:
      1. npx vitest --version
      2. npx vitest run src/adapters/__tests__/contract.test.ts 2>&1 | head -50
    Expected Result: vitest --version 输出 1.6.x；vitest run 至少能启动
    Evidence: .omo/evidence/p0-cleanup/task-1-vitest-runner.txt
  ```

  **Evidence to Capture**: 3 个 task-1-*.txt 文件

  **Commit**: YES
  - Message: `chore(deps): install vitest ^1.6.0 devDependency`
  - Files: `package.json`, `package-lock.json`

---

- [x] 2. Extend `src/types/epub.d.ts` with EpubAdapter v1.5.3 API surface

  **What to do**:
  - 在 `src/types/epub.d.ts` 现有 106 行基础上**追加**（不要删除现有接口）：
    1. **View 接口扩展** (epub.d.ts:5-15)：添加 `window?: Window`、`document?: Document` 属性（EpubAdapter:73-110 用 `view.document.getElementById`）
    2. **Rendition 接口扩展** (epub.d.ts:76-92)：
       - `currentLocation(): { start: { cfi: string; index: number; href?: string } } | undefined` (EpubAdapter:199 用)
       - `themes.registerCss(name: string, css?: string): void` 改为接受 (name, css) 双参数（EpubAdapter:326 用）
       - `hooks: { content: { register(cb: (view: View) => void): void } }` (EpubAdapter:73 用)
    3. **Book 接口扩展** (epub.d.ts:58-69)：
       - `ready: Promise<void>` (EpubAdapter:59 用)
       - `loaded: { navigation: Promise<{ toc: NavItem[] }> }` (EpubAdapter:61 用)
       - `renderTo(target: HTMLElement | string, options?: object): Rendition` (EpubAdapter:64 用)
       - `coverUrl(): Promise<string | null>` (useBookEngine:129 用)
       - `Spine.items` 类型从 `unknown[]` 改为 `{ href?: string }[]`（EpubAdapter:205 用 `.href`）
       - `packaging: { metadata: { title?: string; creator?: string } }` — 把 `packaging` 改为 required（useBookEngine.ts:125 用 `creator`）
       - `search(query: string): Promise<Array<{ cfi?: string; excerpt?: string }>>` (EpubAdapter:255 用)
    4. **导出补全**：在 `declare module 'epubjs'` 块底部添加 `export type { View } from 'epubjs/types/managers/view'` 让 `import { View } from 'epubjs'` 能解析
    5. **EpubNavItem 重命名**：在 `declare module 'epubjs/types/navigation'` 块添加 `export type EpubNavItem = NavItem`

  **Must NOT do**:
  - 不要删除 epub.d.ts 现有任何一行
  - 不要修改现有接口的已有字段签名（只扩展）
  - 不要把 `packaging` 的 metadata 类型从 `title?` 改到强制 required

  **Recommended Agent Profile**:
  - **Category**: `quick` — 类型补丁添加，纯 .d.ts 文件编辑
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Tasks 4, 5, 7
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/types/epub.d.ts:1-106` — 现有类型补丁格式
  - `src/adapters/EpubAdapter.ts:1-2` — 失败的 import 行
  - `src/adapters/EpubAdapter.ts:57` — `ePub(data)` 调用
  - `src/adapters/EpubAdapter.ts:73-110` — `view.document` 访问链
  - `src/adapters/EpubAdapter.ts:199` — `currentLocation()` 调用
  - `src/adapters/EpubAdapter.ts:205` — `spineItems?.[idx]?.href`
  - `src/adapters/EpubAdapter.ts:326` — `themes.registerCss('custom', css)`
  - `src/hooks/useEpub/useBookEngine.ts:123-129` — `ePub(data).ready/loaded.navigation/coverUrl` 调用链
  - `src/hooks/useEpub/useBookEngine.ts:125` — `book.packaging.metadata.title/creator`

  **External References**:
  - epubjs GitHub: https://github.com/futurepress/epub.js
  - @types/epubjs: https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/epubjs

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: View type now importable from epubjs
    Tool: Bash
    Steps:
      1. npx tsc --noEmit 2>&1 | grep -E "No exported member 'View'"
    Expected Result: 0 行匹配
    Evidence: .omo/evidence/p0-cleanup/task-2-view-import.txt

  Scenario: EpubNavItem type now importable
    Tool: Bash
    Steps:
      1. npx tsc --noEmit 2>&1 | grep -E "No exported member 'EpubNavItem'"
    Expected Result: 0 行匹配
    Evidence: .omo/evidence/p0-cleanup/task-2-navitem-import.txt

  Scenario: Book API surface complete
    Tool: Bash
    Steps:
      1. npx tsc --noEmit 2>&1 | grep -E "Property '(ready|loaded|renderTo|coverUrl|search)' does not exist"
    Expected Result: 0 行匹配
    Evidence: .omo/evidence/p0-cleanup/task-2-book-api.txt

  Scenario: Rendition API surface complete
    Tool: Bash
    Steps:
      1. npx tsc --noEmit 2>&1 | grep -E "Property '(currentLocation|hooks)' does not exist on type 'Rendition'"
    Expected Result: 0 行匹配
    Evidence: .omo/evidence/p0-cleanup/task-2-rendition-api.txt

  Scenario: themes.registerCss accepts (name, css) overload
    Tool: Bash
    Steps:
      1. npx tsc --noEmit 2>&1 | grep -E "Expected 1 arguments, but got 2"
    Expected Result: 0 行匹配
    Evidence: .omo/evidence/p0-cleanup/task-2-registercss-overload.txt

  Scenario: epub.d.ts does not break existing pass-through files
    Tool: Bash
    Steps:
      1. npx tsc --noEmit 2>&1 | grep -E "(enableSmoothScroll|animation|useReaderControls|useSearch)\.ts"
    Expected Result: 0 行匹配
    Evidence: .omo/evidence/p0-cleanup/task-2-no-regression.txt
  ```

  **Evidence to Capture**: 6 个 task-2-*.txt 文件

  **Commit**: YES
  - Message: `types(epub): extend epub.d.ts with EpubAdapter v1.5.3 API surface`
  - Files: `src/types/epub.d.ts`

---

- [x] 3. Remove dead `@ts-expect-error` directive from Sidebar.tsx

  **What to do**:
  - In `src/components/Sidebar.tsx`:
    - Line 35: 删除 `// @ts-expect-error subitems is optional, guard with ?? [] for length check`
    - 保留 L36 的 `{(item.subitems ?? []).length > 0 && (...)}`（已经是正确的 `?? []` 守卫）

  **Must NOT do**:
  - 不要改 NavItem.subitems 的类型
  - 不要重写整个 TocList 组件
  - 不要把 `?? []` 改成 `|| []`

  **Recommended Agent Profile**:
  - **Category**: `quick` — 1 行删除
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **References**:
  - `src/components/Sidebar.tsx:35-38` — 删除 L35，保留 L36-L38
  - `src/types/index.ts:8-12` — NavItem 接口，`subitems?: NavItem[]` 已是 optional

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: TS2578 unused @ts-expect-error resolved
    Tool: Bash
    Steps:
      1. npx tsc --noEmit 2>&1 | grep "Unused '@ts-expect-error'"
    Expected Result: 0 行匹配
    Evidence: .omo/evidence/p0-cleanup/task-3-sidebar-ts2578.txt

  Scenario: Sidebar still type-safe after directive removal
    Tool: Bash
    Steps:
      1. npx tsc --noEmit 2>&1 | grep -E "Sidebar\.tsx" | grep -v "TS2578"
    Expected Result: 0 行匹配
    Evidence: .omo/evidence/p0-cleanup/task-3-sidebar-clean.txt
  ```

  **Evidence to Capture**: 2 个 task-3-*.txt 文件

  **Commit**: YES
  - Message: `fix(sidebar): remove dead @ts-expect-error directive`
  - Files: `src/components/Sidebar.tsx`

---

- [ ] 4. Fix EpubAdapter.ts DOM null guards + getCfiFromRange safety

  **What to do**:
  - In `src/adapters/EpubAdapter.ts`:
    1. **Line 80-85**: `let style = doc.getElementById('_reader_layout') as HTMLStyleElement` 改为 `as HTMLStyleElement | null`，并在 `if (!style)` 块内用 `const style = doc.createElement('style') as HTMLStyleElement` 后再 appendChild，最后用 `style!` 访问 `.textContent`（或重构成局部 const）
    2. **Line 129/134/139**: `typeof this.rendition.getCfiFromRange !== 'function'` guard 之后调用 `this.rendition.getCfiFromRange(range)` — TS 仍报 "possibly undefined"。改为先把方法存到局部变量：
       ```ts
       const cfiFn = this.rendition?.getCfiFromRange
       if (typeof cfiFn !== 'function') {
         this.onSelectionChange({ selectedText: e.data.text, range: null })
         return
       }
       try {
         const cfiRange = cfiFn(range)
         // ...
       }
       ```
    3. **Line 298-313 `clearHighlights()`**：`this.rendition!.annotations.remove(cfiRange, 'highlight')` — 改为局部变量先取：
       ```ts
       const rendition = this.rendition
       if (!rendition) return
       const annotations = rendition.annotations
       if (typeof annotations?.remove !== 'function') return
       this.highlightIdMap.forEach(cfiRange => {
         try { annotations.remove(cfiRange, 'highlight') } catch { /* ignore */ }
       })
       ```

  **Must NOT do**:
  - 不要修改 EpubAdapter 的业务逻辑
  - 不要删除 `(this as any)._messageHandler`（P1 范围）
  - 不要修改 `setBook()` helper
  - 不要碰 open()/next()/prev()/destroy() 主体
  - 不要重命名私有字段

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — 3 处类型守卫修改，影响核心文件
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2, 与 T5 并行)
  - **Parallel Group**: Wave 2 (with Task 5)
  - **Blocks**: Task 7
  - **Blocked By**: Task 2 (依赖类型补丁提供精确定义)

  **References**:
  - `src/adapters/EpubAdapter.ts:73-110` — content hook 注册块
  - `src/adapters/EpubAdapter.ts:80-85` — style 元素创建 + null 检查
  - `src/adapters/EpubAdapter.ts:122-150` — message handler 含 `getCfiFromRange` 调用
  - `src/adapters/EpubAdapter.ts:298-313` — `clearHighlights()` 方法
  - `src/types/epub.d.ts` — T2 扩展后的接口定义

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: EpubAdapter null guards pass
    Tool: Bash
    Steps:
      1. npx tsc --noEmit 2>&1 | grep -E "EpubAdapter\.ts" | grep -E "(TS18047|TS2722|TS2532)"
    Expected Result: 0 行匹配
    Evidence: .omo/evidence/p0-cleanup/task-4-epub-null-guards.txt

  Scenario: EpubAdapter tsc fully clean
    Tool: Bash
    Steps:
      1. npx tsc --noEmit 2>&1 | grep "EpubAdapter.ts"
    Expected Result: 0 行匹配
    Evidence: .omo/evidence/p0-cleanup/task-4-epub-clean.txt
  ```

  **Evidence to Capture**: 2 个 task-4-*.txt 文件

  **Commit**: YES
  - Message: `types(epub-adapter): add DOM null guards + getCfiFromRange safety`
  - Files: `src/adapters/EpubAdapter.ts`

---

- [ ] 5. Fix useBookEngine.ts Uint8Array coercion + packaging.metadata guards

  **What to do**:
  - In `src/hooks/useEpub/useBookEngine.ts`:
    1. **Line 123-124**: `const book = ePub(data)` + `await book.ready`
       - `data` 是 `ArrayBuffer | Uint8Array`，`ePub()` 接受 `string | ArrayBuffer`
       - 改为 `ePub(new Uint8Array(data).buffer as ArrayBuffer)` 或 `ePub(data instanceof ArrayBuffer ? data : new Uint8Array(data).buffer)`
    2. **Line 125**: `const { title, creator } = book.packaging.metadata`
       - TS18048 报 `'book.packaging' is possibly 'undefined'`
       - 加守卫：`const pkg = book.packaging; const meta = pkg?.metadata; const title = meta?.title || 'Untitled'; const creator = meta?.creator || 'Unknown'`
    3. **Line 129**: `const coverUrl = await book.coverUrl()` — 类型补丁提供后这条应自动通过，无需改

  **Must NOT do**:
  - 不要重构 useBookEngine 整体（502 行 / 6 职责是 P1 范围）
  - 不要修改 SharedRefs 结构
  - 不要删除或重命名 30 个 ref 字段
  - 不要碰 `openBook` 主流程的 EPUB inline 初始化（保留双路径直到 P1 统一）
  - 不要碰 Selection 消息处理

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — 3 处类型修复，核心 hook 文件
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2, 与 T4 并行)
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: Task 7
  - **Blocked By**: Task 2 (依赖类型补丁)

  **References**:
  - `src/hooks/useEpub/useBookEngine.ts:117-139` — `readFile` + `extractMeta` 函数
  - `src/hooks/useEpub/useBookEngine.ts:121` — `extractMeta` 签名
  - `src/types/index.ts:1-6` — BookMeta 接口
  - `src/types/epub.d.ts` — T2 扩展后的 Book 接口

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: useBookEngine Uint8Array resolved
    Tool: Bash
    Steps:
      1. npx tsc --noEmit 2>&1 | grep -E "useBookEngine\.ts.*Uint8Array"
    Expected Result: 0 行匹配
    Evidence: .omo/evidence/p0-cleanup/task-5-engine-uint8.txt

  Scenario: useBookEngine packaging guard added
    Tool: Bash
    Steps:
      1. npx tsc --noEmit 2>&1 | grep -E "useBookEngine\.ts.*(packaging|coverUrl)"
    Expected Result: 0 行匹配
    Evidence: .omo/evidence/p0-cleanup/task-5-engine-packaging.txt

  Scenario: useBookEngine fully clean
    Tool: Bash
    Steps:
      1. npx tsc --noEmit 2>&1 | grep "useBookEngine.ts"
    Expected Result: 0 行匹配
    Evidence: .omo/evidence/p0-cleanup/task-5-engine-clean.txt
  ```

  **Evidence to Capture**: 3 个 task-5-*.txt 文件

  **Commit**: YES
  - Message: `types(use-book-engine): add Uint8Array→ArrayBuffer coercion + packaging.metadata guards`
  - Files: `src/hooks/useEpub/useBookEngine.ts`

---

- [ ] 6. Fix TxtAdapter.ts:317 `parentNode.innerHTML` cast

  **What to do**:
  - In `src/adapters/TxtAdapter.ts`:
    - Line 315: `const parent = textNode.parentNode` (type `Node | null`)
    - 改为 `const parent = textNode.parentNode as HTMLElement | null`
    - 后续 `parent.innerHTML = ''` 会通过（HTMLElement 有 innerHTML）

  **Must NOT do**:
  - 不要修改 `applyHighlightInDom` 主体逻辑
  - 不要重构 TxtAdapter
  - 不要碰 renderCurrentChapter、search、getSelectionInfo 等其他方法

  **Recommended Agent Profile**:
  - **Category**: `quick` — 1 行类型断言
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3)
  - **Parallel Group**: Wave 3 (with Task 7)
  - **Blocks**: Task 7
  - **Blocked By**: None (独立于类型补丁)

  **References**:
  - `src/adapters/TxtAdapter.ts:305-325` — `applyHighlightInDom` 方法
  - `src/adapters/TxtAdapter.ts:315` — `parent` 变量声明

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: TxtAdapter innerHTML cast resolved
    Tool: Bash
    Steps:
      1. npx tsc --noEmit 2>&1 | grep -E "TxtAdapter\.ts.*innerHTML"
    Expected Result: 0 行匹配
    Evidence: .omo/evidence/p0-cleanup/task-6-txt-innerhtml.txt

  Scenario: TxtAdapter fully clean
    Tool: Bash
    Steps:
      1. npx tsc --noEmit 2>&1 | grep "TxtAdapter.ts"
    Expected Result: 0 行匹配
    Evidence: .omo/evidence/p0-cleanup/task-6-txt-clean.txt
  ```

  **Evidence to Capture**: 2 个 task-6-*.txt 文件

  **Commit**: YES
  - Message: `types(txt-adapter): cast parentNode to HTMLElement for innerHTML access`
  - Files: `src/adapters/TxtAdapter.ts`

---

- [ ] 7. Run full tsc + vitest + build verification

  **What to do**:
  - Run all 3 verification commands sequentially:
    1. `npx tsc --noEmit` — must exit 0
    2. `npx vitest run src/adapters/__tests__/contract.test.ts` — all tests must pass
    3. `npm run build` — vite build must exit 0
  - Save each output to `.omo/evidence/p0-cleanup/final-{tsc|vitest|build}.txt`
  - Generate summary report `.omo/evidence/p0-cleanup/SUMMARY.md`

  **Must NOT do**:
  - 不要修改任何代码（这是验证任务）
  - 不要 commit 验证脚本或证据文件到 git（`.omo/evidence/` 是 local-only 目录）

  **Recommended Agent Profile**:
  - **Category**: `quick` — 命令执行 + 报告生成
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: NO (依赖 1-6 全部完成)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 1, 2, 3, 4, 5, 6

  **References**:
  - `.omo/evidence/p0-cleanup/` 目录
  - `.omo/plans/p0-cleanup.md` Success Criteria

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: tsc clean
    Tool: Bash
    Steps:
      1. npx tsc --noEmit 2>&1 | tee .omo/evidence/p0-cleanup/final-tsc.txt
    Expected Result: 0 行 error，exit code 0
    Evidence: .omo/evidence/p0-cleanup/final-tsc.txt

  Scenario: vitest contract test passes
    Tool: Bash
    Steps:
      1. npx vitest run src/adapters/__tests__/contract.test.ts 2>&1 | tee .omo/evidence/p0-cleanup/final-vitest.txt
    Expected Result: 全部 PASS，含 "Test Files 1 passed"
    Evidence: .omo/evidence/p0-cleanup/final-vitest.txt

  Scenario: vite build succeeds
    Tool: Bash
    Steps:
      1. npm run build 2>&1 | tee .omo/evidence/p0-cleanup/final-build.txt
    Expected Result: exit 0
    Evidence: .omo/evidence/p0-cleanup/final-build.txt
  ```

  **Evidence to Capture**: 3 个 final-*.txt 文件 + 1 个 SUMMARY.md

  **Commit**: NO (验证任务，不提交代码)

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
>
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.**

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read `.omo/plans/p0-cleanup.md` end-to-end. For each "Must Have": verify implementation exists by running `npx tsc --noEmit` (exit 0) and `npx vitest run src/adapters/__tests__/contract.test.ts` (all green). For each "Must NOT Have": search codebase for forbidden patterns (EpubAdapter rewrite, Reader.tsx changes, tsconfig.json changes, any usage removal) — reject with file:line if found. Check evidence files exist in `.omo/evidence/p0-cleanup/`.
  Output: `Must Have [3/3] | Must NOT Have [N/N] | Tasks [7/7] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `npx tsc --noEmit` + `npm run build`. Review all changed files for: `as any`/`@ts-ignore`/`@ts-expect-error` removal/introduction, unused imports, commented-out code. Check git log for 6 atomic commits matching the wave structure. Verify `vitest` is in `package.json` devDependencies and `"test"` script exists.
  Output: `Build [PASS/FAIL] | TSC [PASS/FAIL] | Tests [N pass/N fail] | Commits [N/N] | VERDICT`

- [ ] F3. **Real Type/Build/Test Verification** — `deep`
  Clean run from scratch:
  1. `rm -rf node_modules/.vite out` (clean vite cache + build output)
  2. `npm install` (re-resolve deps)
  3. `npx tsc --noEmit` — must exit 0 with zero errors
  4. `npx vitest run` — contract test must pass all 3 adapters
  5. `npm run build` — vite build must exit 0
  6. Save evidence to `.omo/evidence/p0-cleanup/final-verification.txt`
  Output: `TSC [N errors → 0] | Vitest [N pass] | Build [PASS/FAIL] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task 1-7: read "What to do", read actual git diff. Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance — search for any of the forbidden patterns:
  - Forbidden: `EpubAdapter` business logic changes, `Reader.tsx` modifications, `tsconfig.json` modifications, `any` removal in MobiAdapter/EpubAdapter, `useBookEngine` refactor beyond type guards
  Detect cross-task contamination: Task 4 touching useBookEngine.ts files, Task 5 touching EpubAdapter.ts.
  Output: `Tasks [7/7 compliant] | Contamination [CLEAN/N issues] | Forbidden [0 found/N found] | VERDICT`

---

## Commit Strategy

- **T1**: `chore(deps): install vitest ^1.6.0 devDependency` - package.json, package-lock.json
- **T2**: `types(epub): extend epub.d.ts with EpubAdapter v1.5.3 API surface` - src/types/epub.d.ts
- **T3**: `fix(sidebar): remove dead @ts-expect-error directive` - src/components/Sidebar.tsx
- **T4**: `types(epub-adapter): add DOM null guards + registerCss overload + getCfiFromRange safety` - src/adapters/EpubAdapter.ts
- **T5**: `types(use-book-engine): add Uint8Array→ArrayBuffer coercion + packaging.metadata guards` - src/hooks/useEpub/useBookEngine.ts
- **T6**: `types(txt-adapter): cast parentNode to HTMLElement for innerHTML access` - src/adapters/TxtAdapter.ts
- **T7**: `chore(verify): run tsc + vitest + build verification` - .omo/evidence/p0-cleanup/

## Success Criteria

### Verification Commands
```bash
# TypeScript — must exit 0
npx tsc --noEmit

# Contract test — must show all green
npx vitest run src/adapters/__tests__/contract.test.ts

# Build — must exit 0
npm run build
```

### Final Checklist
- [ ] `npx tsc --noEmit` exit 0，零错误零警告
- [ ] `npx vitest run src/adapters/__tests__/contract.test.ts` 全绿（3 adapters × 17 methods + 1 format + 1 property = ~57 assertions PASS）
- [ ] `Sidebar.tsx` 无 `@ts-expect-error` 残留
- [ ] `package.json` devDependencies 包含 `vitest: ^1.6.0`
- [ ] `package.json` scripts 包含 `"test": "vitest run"`
- [ ] `package-lock.json` 已同步
- [ ] git log 含 6 个原子 commit（按 wave 结构）
- [ ] `npm run build` exit 0
- [ ] `EpubAdapter.ts` `(this as any)._messageHandler` 保留（P1 范围）
- [ ] `window.electronAPI!.xxx()` 4 处保留（P2 范围）
- [ ] `Reader.tsx` 无变更（P2 范围）