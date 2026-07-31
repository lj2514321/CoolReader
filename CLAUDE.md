# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install dependencies.
- `npm run dev` — start Electron development mode with hot reload.
- `npm run build` — build main, preload, and renderer output under `out/`.
- `npm run dist` — run the production build and package installers via electron-builder into `release/`.
- `npm run preview` — preview the built Electron app.
- `npm test` or `npm run test` — run the Vitest suite once.
- `npm run test:watch` — run Vitest in watch mode.
- `npx vitest run <path-to-test>` — run a single test file. Tests live in `src/adapters/__tests__/` (the `contract.test.ts` adapter contract test) and `src/utils/__tests__/` (animation, customTheme, readerProgress).

There is currently no dedicated lint script in `package.json`; use `npm run build` and the relevant Vitest command as the main validation path.

## Architecture overview

CoolReader is a desktop ebook reader built on Electron 28, React 18, TypeScript, electron-vite, and electron-builder. The build has three entry points configured in `electron.vite.config.ts`: Electron main process (`electron/main/index.ts`), preload bridge (`electron/preload/index.ts`), and renderer (`index.html` / `src/main.tsx`).

The Electron main process owns OS-facing work: frameless window creation, portable data directory setup, open-file dialogs, file reads/deletes, wallpaper image selection, WebDAV calls, and OpenAI-compatible chat/streaming API calls. IPC channel names are centralized in `electron/ipc-channels.ts`. The preload exposes a typed `window.electronAPI` surface with `contextIsolation: true` and `nodeIntegration: false`; renderer code should go through this bridge instead of importing Node/Electron APIs directly.

The renderer root is `src/App.tsx`. It coordinates the library page and reader page, imports books, tracks current book/page transitions, persists progress and reading time, and passes state into the major UI components. Persistent renderer data lives in IndexedDB through `src/utils/db.ts` using the `epub-reader` database; stores include books, progress, reading time, settings, bookmarks, highlights, per-book reading time, and covers. WebDAV sync mirrors books plus format-aware progress files under remote `progress/<format>/<basename>.json`.

Reading logic is centered on the `useEpub` hook family in `src/hooks/useEpub/`. `index.ts` creates shared refs and composes `useBookEngine`, `useReaderControls`, `useAnnotations`, and `useSearch`. `useBookEngine` owns book lifecycle, metadata extraction, adapter selection, progress refs, TOC state, theme/custom theme loading, and reading-time initialization. `useReaderControls` owns navigation, layout changes, theme application, and reading-time persistence. `useAnnotations` handles bookmarks/highlights and persists them to IndexedDB. `useSearch` builds or delegates full-text search and result navigation.

Multi-format support is abstracted behind `src/adapters/BookAdapter.ts`. EPUB uses `EpubAdapter` around epub.js; TXT uses `TxtAdapter`; MOBI/AZW3/PRC use `MobiAdapter` with `@lingo-reader/mobi-parser`. New format behavior should be added through this adapter boundary and covered by the adapter contract test. EPUB still has some legacy direct epub.js handling via `bookRef`/`renditionRef`, while TXT/MOBI primarily use `adapterRef` and universal locations such as `chapterIdx:charOffset`.

TXT and MOBI adapters render book content inside iframes, so their documents can't dispatch React events directly. `src/utils/readerContentEvents.ts` bridges this: click/keydown handlers are bound to the embedded document and re-dispatched on `window` as `coolreader:content-click` / `coolreader:content-key` CustomEvents, with coordinates translated relative to the `#viewer` element (see `getReaderRelativeBounds`). Reader components subscribe to these window events. `src/utils/readerProgress.ts` holds pure progress helpers (section+page fraction → percent, line-aligned scroll steps) used by `useProgressTimer` and the adapters.

Styles are regular CSS plus theme tokens under `src/styles/`. Component-level CSS is split under `src/styles/components/`, with theme helpers in `src/styles/useTheme.ts`, `src/styles/theme.css`, `src/styles/tokens.css`, and `src/styles/themes/theme-glass.css`. Reader customization relies on `ReaderLayout`, theme state, and generated custom theme CSS from `src/utils/customTheme.ts`.

## Project-specific notes

- Supported book formats are EPUB, TXT, MOBI, AZW3, and PRC; format detection is in `src/utils/formatDetection.ts`.
- Main-process file reads enforce a 50MB ebook size limit, and wallpaper images are limited to 2MB when imported through the wallpaper picker.
- The adapter contract test (`src/adapters/__tests__/contract.test.ts`) structurally asserts the `BookAdapter` interface: any method or property added to `BookAdapter` MUST also be added to its `REQUIRED_METHODS`/`REQUIRED_PROPERTIES` lists, or the test fails.
- AI settings target an OpenAI-compatible `/chat/completions` endpoint and support both non-streaming and SSE streaming responses.
- When changing IPC behavior, update the channel constants, main handler, preload bridge, and renderer type declarations together.
- When changing storage shape, update the IndexedDB version/migration logic in `src/utils/db.ts` and consider WebDAV compatibility for synced progress data.
