# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Hook Tabs is a Chrome extension (Manifest V3) that opens a small popup window for fuzzy-searching and jumping between open browser tabs without touching the mouse, triggered by a keyboard shortcut (default `Ctrl+B`). It's a personal project, kept intentionally simple.

## Commands

- `pnpm dev` — Vite dev server (for iterating on `App.tsx` UI in isolation; the extension APIs like `chrome.tabs` only work when loaded as an actual extension, not in this dev server).
- `pnpm build` — type-checks (`tsc -b`) then builds the extension into `dist/`.
- `pnpm lint` — ESLint over the project.
- `pnpm prettier` — formats the codebase in place (`semi: false`, `singleQuote: true`, `tabWidth: 2`).
- `pnpm preview` — preview the Vite build output.

There is no test suite in this repo.

### Loading the extension in Chrome

After `pnpm build`, load `dist/` as an unpacked extension via `chrome://extensions` (Developer mode → Load unpacked). Reload the extension after each rebuild to pick up changes to `background.js` or `manifest.json`; the popup UI (`index.html`/React app) just needs a rebuild since it's loaded fresh each time it opens.

## Architecture

Two independent runtime contexts, both shipped from this one repo:

1. **Background service worker** (`public/background.js`, copied as-is into `dist/`, not built/bundled by Vite). Listens for the `open-hook-tabs` command (registered in `public/manifest.json` under `commands`), and opens a small centered popup `chrome.windows.create` window pointing at `index.html`. It tracks the popup's window ID (`hookTabsWindowId`) so a second shortcut press focuses the existing popup instead of spawning a new one, and clears that ID via `chrome.windows.onRemoved`.

2. **Popup UI** (`src/App.tsx`, built by Vite as a normal React app into `dist/assets`). On mount it queries all open tabs via `chrome.tabs.query`, filtering out any tab whose URL is the extension's own popup (`chrome.runtime.getURL('')`) to avoid listing itself. All tab state lives in this one component (`tabs` = full list, `filteredTabs` = search-filtered list) — there's no separate state management layer.

Because the two contexts don't share JS state, anything the background worker needs to know about the popup (e.g. which window it opened) must go through Chrome APIs (`chrome.windows`, `chrome.tabs`), not in-memory variables shared with `App.tsx`.

### Popup UI interaction model

`App.tsx` is keyboard-driven by design (see README — built to avoid using a mouse):

- Typing in the search input filters by tab title/URL (case-insensitive substring match) via `filterTabs`.
- `ArrowUp`/`ArrowDown` move `selectedIndex` through `filteredTabs`; the selected `<li>` auto-scrolls into view.
- `Enter` activates the selected tab and focuses its window (`openTab`), then closes the popup.
- `ArrowLeft` closes the selected tab (`closeTab`) and keeps the list in sync locally (no re-query).
- `ArrowRight` toggles pinned state for the selected tab (`togglePinTab`), also updated optimistically in local state.
- `Escape`, or the popup window losing OS focus (`blur` listener with a 100ms grace check via `document.hasFocus()`), closes the popup.

When adding tab actions, follow the existing pattern: call the `chrome.tabs`/`chrome.windows` API, then mirror the change into both `tabs` and `filteredTabs` state rather than re-querying all tabs.

### Build specifics

- `vite.config.ts` uses the React Compiler (`babel-plugin-react-compiler` via `@rolldown/plugin-babel`), so avoid manual `useMemo`/`useCallback` micro-optimizations — they're handled by the compiler.
- Everything under `public/` (manifest, background script, icons) is copied verbatim into `dist/` by Vite; only `src/` goes through the React/TS build pipeline.
- Styling uses CSS Modules (`App.module.css`) plus global `src/styles/reset.css` and `src/styles/variables.css` — no CSS-in-JS or utility framework.
