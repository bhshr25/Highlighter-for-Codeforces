# CF Highlighter

CF Highlighter is a Manifest V3 Chrome extension for highlighting selected text and MathJax-rendered expressions on `https://codeforces.com/*`.

## What it does

- Adds a **Highlight Selection** context menu item on Codeforces pages.
- Highlights selected normal text and MathJax content with a marker-like yellow background.
- Adds a **Remove Highlight** context menu item for selected highlighted content.
- Supports the `Alt+Shift+D` keyboard shortcut to highlight the current selection.
- Supports `Ctrl+Z` / `Command+Z` to undo the most recent highlight on the current page.

## Installation

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this `cf-highlighter` folder.
5. Visit a Codeforces page, select text or a formula, right-click, and choose **Highlight Selection**.

## Files

- `manifest.json` defines the MV3 extension, Codeforces host permissions, content script, context menu permission, and keyboard shortcut.
- `background.js` creates the context menu entries and sends commands to the active Codeforces tab.
- `content.js` performs DOM-safe highlighting and highlight removal using Selection and Range APIs.
- `styles.css` provides the marker-style highlight appearance.

