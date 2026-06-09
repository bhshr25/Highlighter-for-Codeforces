# CF Highlighter

CF Highlighter is a Manifest V3 Chrome extension for highlighting selected text and MathJax-rendered expressions on `https://codeforces.com/*`.

## What it does

- Highlights selected normal text and MathJax content with a marker-like yellow background.
- Adds a **Highlight Selection** context menu item on Codeforces pages.
- Adds a **Remove Highlight** context menu item for selected highlighted content.
- Supports the `Alt+Shift+D` keyboard shortcut to highlight the current selection.
- Supports the `Alt+Shift+C`keyboard shortcut to clear all highlights.
- Supports double click on highlight to clear it.
- Supports `Ctrl+Z` / `Command+Z` to undo the most recent highlight on the current page.

## Installation

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this `cf-highlighter` folder.

## Files

* `manifest.json`: Defines the MV3 extension, Codeforces host permissions, injected content scripts, context menu permissions, and registers the global keyboard shortcuts.
* `background.js`: Creates the right-click context menu entries, listens for keyboard commands, and safely dispatches messaging events to the active tab.
* `content.js`:  Performs DOM-safe highlighting and removal using Selection and Range APIs. It handles assigning unique highlight IDs, manages the undo history stack (`Ctrl+Z`), supports targeted highlight removal via double-click, and listens for the clear-all command (`Alt+Shift+C`).
* `styles.css`: Provides the visual marker-style highlight appearance seamlessly across both standard text and MathJax elements.
