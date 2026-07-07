# Repository Guidelines

## Project Structure & Module Organization

CoolReader is an Electron desktop reader built with React and TypeScript. Main-process code lives in `electron/main/`, preload APIs in `electron/preload/`, and shared IPC channel names in `electron/ipc-channels.ts`. Renderer code is under `src/`: `components/` for UI, `hooks/` for reader workflows, `adapters/` for EPUB/TXT/MOBI format implementations, `utils/` for persistence and helpers, `types/` for shared declarations, and `styles/` for CSS tokens and component styles. Tests currently live beside adapter code in `src/adapters/__tests__/`. Static app icons and screenshots are kept at the repository root; design notes are in `docs/`.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: start the Electron/Vite development environment.
- `npm run build`: compile the production Electron app into `out/`.
- `npm run dist`: build and package installers with `electron-builder`; output goes to `release/`.
- `npm run preview`: preview the built app.
- `npm test`: run Vitest once.
- `npm run test:watch`: run Vitest in watch mode during development.

## Coding Style & Naming Conventions

Use TypeScript throughout. Follow the existing React style: PascalCase component files such as `Reader.tsx`, camelCase hooks such as `useBookCover.ts`, and adapter classes named by format, for example `EpubAdapter.ts`. Keep Electron-only code in `electron/` and browser/renderer code in `src/`. Prefer explicit shared types in `src/types/` when data crosses components, adapters, IPC, or persistence boundaries. CSS is organized by tokens, themes, and component-specific files under `src/styles/`.

## Testing Guidelines

Vitest is the test framework. Place focused tests near the code they cover, using `__tests__` directories and `*.test.ts` naming, as in `src/adapters/__tests__/contract.test.ts`. Run `npm test` before submitting changes. Add or update tests when changing adapter contracts, book parsing behavior, persistence migrations, or IPC-facing data shapes.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commits, often scoped, for example `feat(design): ...` and `types(use-book-engine): ...`. Use concise subjects in the form `type(scope): summary` when practical. Pull requests should describe the user-visible change, list test results, call out affected formats or platforms, and include screenshots for UI changes. Link related issues when available and note any migration or configuration impact.

## Security & Configuration Tips

Preserve Electron `contextIsolation` boundaries: expose renderer capabilities through preload APIs instead of importing Node APIs into React components. Treat WebDAV and AI settings as user configuration; avoid logging secrets or storing new credentials outside the existing settings flow.
