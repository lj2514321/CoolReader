# P2 Improvements — Code Hygiene, Logging, and Type Safety

## TL;DR

> **Quick Summary**: 3 independent improvements across magic number extraction, console logging standardization, and SharedRefs type safety.
>
> **Deliverables**:
> - `src/utils/constants.ts` — extracted named constants from Reader.tsx magic numbers
> - `src/utils/logger.ts` — environment-aware logging utility (debug/info/warn/error)
> - All 31 console calls replaced with logger (9 files)
> - SharedRefs type-safety enhanced: `readonly` refs + domain-split interfaces + write-on-documentation
>
> **Estimated Effort**: Medium (2-3 hours)
> **Parallel Execution**: YES — Wave 1 has 2 parallel tasks
> **Critical Path**: P2-3 → depends on understanding ref ownership before adding readonly

---

## Context

### Original Request

Based on Metis analysis of remaining P2 issues after P0+P1 completion:

| Priority | Issue | Impact | Effort |
|----------|-------|--------|--------|
| P2 | Magic numbers in Reader.tsx (~13 values) | Maintainability | 20min |
| P2 | 31 console calls across 9 files, no logging utility | Security, debuggability | 20min |
| P2 | SharedRefs tight coupling (22 refs × 5 hooks) | Architecture risk | 45-60min |

### Metis Review

**Key findings used in this plan:**
- Magic numbers are all in Reader.tsx — no constants/config file exists
- 31 console calls: 5 error + 18 warn + 8 log — file paths exposed in production
- SharedRefs: 22 MutableRefObjects shared across 5 hooks — no read/write ownership documentation
- 73 `any` type usages across 16 files flagged as potential P2-4 but deferred

### Anti-Pattern Safeguards (from Metis)
- `constants.ts` ≤ 50 lines — no config classes or factory functions
- `logger.ts` ≤ 30 lines — exactly 4 exported functions, no classes or DI
- SharedRefs: type-safety only — no state management library, no event system
- MUST NOT: over-abstract, create configuration systems, or add runtime validation

---

## Work Objectives

### Core Objective
Improve code hygiene, security, and type safety through 3 targeted P2 improvements

### Concrete Deliverables
- `src/utils/constants.ts` — 13+ named constants grouped by domain
- `src/utils/logger.ts` — 4-function logging utility with env-aware filtering
- Logger integration across all 9 files (31 console calls replaced)
- SharedRefs type-safety: readonly refs + domain-split typed views + ownership doc

### Must Have
- Zero functional changes — extraction only
- Reader.tsx imports constants from `constants.ts` and uses them
- All 31 console calls replaced — zero `console.log/warn/error/info` remain
- SharedRefs: hook signatures unchanged, no runtime behavior change
- `npm run build` exits 0

### Must NOT Have
- ❌ No new logic, no behavior changes
- ❌ No state management libraries (Zustand/Jotai/Redux)
- ❌ No event systems or pub/sub architecture
- ❌ No configuration files
- ❌ No CSS changes
- ❌ No epub.js logic changes

---

## Verification Strategy

### QA Policy
Every task includes agent-executed QA scenarios (not human testing).
Evidence saved to `.omo/evidence/`.

- **Build verification**: `npm run build` must exit 0
- **Lint verification**: `grep` for remaining console.log/warn/error/info in src/ (except electron/)
- **Type check**: `npx tsc --noEmit` (if available) or build verification

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — 3 parallel tasks):
├── P2-1: Extract magic numbers → constants.ts [quick]
├── P2-2a: Create logger.ts [quick]
└── P2-2b: Replace all console calls with logger [quick]

Wave 2 (After Wave 1 — 1 task):
└── P2-3: SharedRefs type-safety + documentation [deep]

Wave FINAL (After ALL — 2 parallel reviews):
├── F1: Plan compliance audit (oracle)
└── F2: Code quality + build verification (unspecified-high)
```

### Dependency Matrix
- **P2-1, P2-2a, P2-2b**: Independent — Wave 1 (parallel)
- **P2-3**: Depends on P2-2b (file familiarity) — Wave 2
- **F1, F2**: All — Final

---

## TODOs

- [x] 1. **Extract magic numbers from Reader.tsx — create constants.ts**

  **What to do**:
  - Create `src/utils/constants.ts` with the following named constants:

    ```typescript
    // ===== Timing =====
    export const UI_AUTO_HIDE_DELAY = 3000        // ms, toolbar auto-hide delay
    export const WHEEL_THROTTLE_DELAY = 200        // ms, wheel event throttle interval
    export const SEARCH_DEBOUNCE_DELAY = 300       // ms, search input debounce delay

    // ===== Click Zones =====
    export const CLICK_ZONE_LEFT = 0.22            // left 22% → prev page
    export const CLICK_ZONE_RIGHT = 0.78           // right 22% → next page

    // ===== Font Limits =====
    export const FONT_SIZE_MIN = 75                // minimum font size (%)
    export const FONT_SIZE_MAX = 200               // maximum font size (%)
    export const FONT_WEIGHT_MIN = 300             // minimum font weight
    export const FONT_WEIGHT_MAX = 700             // maximum font weight
    export const FONT_WEIGHT_STEP = 100            // font weight step increment

    // ===== Layout Limits =====
    export const LINE_HEIGHT_MIN = 10              // line height internal min (1.0)
    export const LINE_HEIGHT_MAX = 25              // line height internal max (2.5)
    export const LINE_HEIGHT_STEP = 0.2            // line height step
    export const MARGIN_MIN = 0                    // margin min (px)
    export const MARGIN_MAX = 40                   // margin max (px)

    // ===== UI positioning =====
    export const SELECTION_TOOLBAR_OFFSET = 16     // min left offset for selection toolbar (px)
    export const SELECTION_TOOLBAR_HALF_WIDTH = 100 // half-width for centering calc (px)
    ```

  - Update `src/components/Reader.tsx`:
    - Add `import { UI_AUTO_HIDE_DELAY, WHEEL_THROTTLE_DELAY, ... } from '../utils/constants'`
    - Replace each magic number with its named constant
    - Do NOT change any logic, only the literal values

  **Recommended Agent Profile**: `quick`

  **Parallelization**: Wave 1 (parallel with tasks 2, 3)

  **Acceptance Criteria**:
  - [ ] `src/utils/constants.ts` created with all constants
  - [ ] Reader.tsx imports and uses constants
  - [ ] `npm run build` exits 0
  - [ ] File check: constants.ts ≤ 50 lines

  **QA Scenarios**:
  ```
  Scenario: Build passes with constants
    Tool: Bash
    Steps: npm run build
    Expected: exit 0
    Evidence: .omo/evidence/p2-1-build.txt

  Scenario: All magic numbers replaced
    Tool: Bash
    Steps: grep -n "3000\|200\|0.22\|0.78\|75\|FONT_SIZE_MAX" src/components/Reader.tsx | grep -v "import\|//\|constants"
    Expected: zero matches (all numbers should be imported constants, not inline)
    Evidence: .omo/evidence/p2-1-no-magic.txt
  ```

  **Commit**: YES — `refactor(reader): extract magic numbers to constants.ts`

- [x] 2. **Create logger.ts utility**

  **What to do**:
  - Create `src/utils/logger.ts` (≤30 lines) with:
    ```typescript
    const isDev = import.meta.env.DEV

    export const logger = {
      debug: (...args: unknown[]) => isDev && console.log('[debug]', ...args),
      info:  (...args: unknown[]) => isDev && console.log('[info]', ...args),
      warn:  (...args: unknown[]) => console.warn('[warn]', ...args),
      error: (...args: unknown[]) => console.error('[error]', ...args),
    }
    ```
  - `debug` and `info` → only in dev mode (filtered by `import.meta.env.DEV`)
  - `warn` and `error` → always visible (even in production)
  - Unified prefix format: `[debug]`, `[info]`, `[warn]`, `[error]`
  - Type-safe: accept `unknown[]` spread arguments

  **Must NOT do**:
  - No classes, no interfaces, no configuration
  - No logging initialization or setup
  - No file/network I/O

  **Recommended Agent Profile**: `quick`

  **Parallelization**: Wave 1 (parallel with tasks 1, 3)

  **Acceptance Criteria**:
  - [ ] `src/utils/logger.ts` created with 4 functions
  - [ ] File check: ≤ 30 lines
  - [ ] Dev filtering works via `import.meta.env.DEV`
  - [ ] `npm run build` exits 0

  **QA Scenarios**:
  ```
  Scenario: Build passes with logger
    Tool: Bash
    Steps: npm run build
    Expected: exit 0
    Evidence: .omo/evidence/p2-2-build.txt
  ```

  **Commit**: YES — `feat: create logger.ts utility`

- [x] 3. **Replace all console calls with logger across 9 files**

  **What to do**:
  - Replace all 31 console.log/warn/error/info calls with `logger.debug/info/warn/error`

  **Target files and replacement rules:**

  | File | Replace console.xxx → | Count | Sensitive? |
  |------|-----------------------|-------|------------|
  | `electron/main/index.ts` | `console.log` → `logger.info` | ~3 | YES — file paths (use `path.basename()`) |
  | `electron/main/ai.ts` | `console.error` → `logger.error` | ~1 | No |
  | `src/utils/db.ts` | `console.warn` → `logger.warn` | ~3 | No |
  | `src/hooks/useInitialLoad.ts` | `console.error` → `logger.error` | ~2 | No |
  | `src/hooks/useEpub/useSearch.ts` | `console.warn` → `logger.warn` | ~5 | YES — file paths (use `path.basename()`) |
  | `src/hooks/useEpub/useReaderControls.ts` | `console.warn/error` → `logger.warn/error` | ~5 | YES — file paths |
  | `src/hooks/useEpub/useBookEngine.ts` | `console.warn/error` → `logger.warn/error` | ~5 | No |
  | `src/hooks/useEpub/useAnnotations.ts` | `console.warn` → `logger.warn` | ~3 | No |
  | `src/hooks/useEpub/epubInit.ts` | `console.warn` → `logger.warn` | ~4 | No |

  **Sensitive data handling**:
  - For file paths logged in production (`useSearch.ts:38`, `useReaderControls.ts:235`, `electron/main/index.ts:102`):
    - Wrap with `path.basename()` where possible
    - Or use `/* sanitized: basename only */` comment

  **Cleanup**: After all replacements, grep to confirm zero `console.log/warn/error/info` remain in `src/` (except logger.ts itself)

  **Recommended Agent Profile**: `quick`

  **Parallelization**: Wave 1 (parallel with tasks 1, 2)

  **Acceptance Criteria**:
  - [ ] All 31 console calls replaced
  - [ ] `grep -rn "console\.\(log\|warn\|error\|info\)" src/` returns only logger.ts
  - [ ] File paths sanitized (not exposing full absolute paths)
  - [ ] `npm run build` exits 0

  **QA Scenarios**:
  ```
  Scenario: Build passes
    Tool: Bash
    Steps: npm run build
    Expected: exit 0
    Evidence: .omo/evidence/p2-3-build.txt

  Scenario: No raw console calls remain
    Tool: Bash
    Steps: grep -rn "console\.\(log\|warn\|error\|info\)" src/ --include="*.ts" --include="*.tsx" | grep -v "logger.ts"
    Expected: zero matches
    Evidence: .omo/evidence/p2-3-grep.txt
  ```

  **Commit**: YES — `refactor: replace console calls with logger across 9 files`

- [x] 4. **SharedRefs type-safety + documentation**

  **What to do**:

  **Phase A — Add `readonly` refs to SharedRefs interface**:
  - In `src/hooks/useEpub/useBookEngine.ts`, review the SharedRefs interface (lines 10-32)
  - Identify refs that should be read-only from consumer hooks' perspective:
    - `progressRef`, `cfiRef`, `indexRef`, `sectionHrefRef` — consumers should not set these
    - `totalSectionsRef`, `tocRef`, `searchIndexRef` — build-only, then read-only
    - `bookRef`, `renditionRef` — set by useBookEngine only, consumers read only
  - Add type alias for consumer-visible refs:
    ```typescript
    // Consumer-safe view of SharedRefs (readonly subset)
    export type SharedRefsConsumer = {
      readonly [K in keyof SharedRefs]: SharedRefs[K] extends React.MutableRefObject<infer T>
        ? { readonly current: T }
        : SharedRefs[K]
    }
    ```
  - Update consumer hooks (`useReaderControls`, `useSearch`, `useAnnotations`, `useProgressTimer` (`src/hooks/useProgressTimer.ts`)) to accept `SharedRefsConsumer` instead of full `SharedRefs`
  - Keep useBookEngine using the full mutable `SharedRefs`

  **Phase B — Domain-split typed views**:
  - Add interfaces that group refs by domain (no actual splitting, just type-level grouping):
    ```typescript
    export interface NavigationRefs {
      progressRef: SharedRefs['progressRef']
      cfiRef: SharedRefs['cfiRef']
      indexRef: SharedRefs['indexRef']
      sectionHrefRef: SharedRefs['sectionHrefRef']
    }
    export interface BookStateRefs {
      bookRef: SharedRefs['bookRef']
      renditionRef: SharedRefs['renditionRef']
      tocRef: SharedRefs['tocRef']
    }
    ```
  - Use these in hook parameter types so each hook only sees the refs it needs

  **Phase C — Add ownership documentation**:
  - Add JSDoc comments to each ref field in SharedRefs documenting:
    - Who creates it (owner)
    - Who reads it (consumers)  
    - Who writes it (writers)
  - Example:
    ```typescript
    /** @owner useBookEngine @readers [useReaderControls, useSearch, useProgressTimer] @writers [useBookEngine] */
    progressRef: React.MutableRefObject<number>
    ```

  **Must NOT do**:
  - Do NOT change any hook signatures externally (they still accept SharedRefs)
  - Do NOT introduce any state management libraries
  - Do NOT create event systems or pub/sub
  - No runtime behavior changes
  - No CSS, no epub.js logic changes

  **Recommended Agent Profile**: `deep`

  **Parallelization**: Wave 2 (after tasks 1-3)

  **Acceptance Criteria**:
  - [ ] `readonly` consumer type alias created
  - [ ] Domain-split interfaces created
  - [ ] JSDoc ownership comments on all 22 refs
  - [ ] Consumer hooks use stricter types where possible
  - [ ] `npm run build` exits 0
  - [ ] Book navigation, search, annotations still work

  **QA Scenarios**:
  ```
  Scenario: Build passes
    Tool: Bash
    Steps: npm run build
    Expected: exit 0
    Evidence: .omo/evidence/p2-4-build.txt
  ```

  **Commit**: YES — `refactor(epub): add SharedRefs readonly types + ownership doc`

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found.
  Output: `Must Have [10/10] | Must NOT Have [5/5] | Tasks [4/4] | VERDICT: APPROVE`

- [x] F2. **Code Quality + Build Verification** — `unspecified-high`
  Run `npm run build`. Verify zero `console.log/warn/error/info` remain (outside logger.ts). Check for AI slop.
  Output: `Build [PASS] | Console [CLEAN] | path.basename [0] | AI Slop [CLEAN] | VERDICT: APPROVE`

---

## Commit Strategy

| Task | Message | Files |
|------|---------|-------|
| 1 | `refactor(reader): extract magic numbers to constants.ts` | src/utils/constants.ts, src/components/Reader.tsx |
| 2 | `feat: create logger.ts utility` | src/utils/logger.ts |
| 3 | `refactor: replace console calls with logger across 9 files` | 9 files (see task detail) |
| 4 | `refactor(epub): add SharedRefs readonly types + ownership doc` | src/hooks/useEpub/useBookEngine.ts (+4 related) |

---

## Success Criteria

### Verification Commands
```bash
npm run build   # Expected: exit 0
grep -rn "console\.\(log\|warn\|error\|info\)" src/   # Expected: only logger.ts
```

### Final Checklist
- [ ] `src/utils/constants.ts` created with 13+ named constants
- [ ] `src/utils/logger.ts` created with env-aware filtering
- [ ] Zero `console.log/warn/error/info` in src/ (except logger.ts)
- [ ] SharedRefs: readonly refs added where appropriate
- [ ] Build exits 0
