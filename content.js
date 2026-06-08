const HIGHLIGHT_CLASS = "cf-highlighter-mark";
const HIGHLIGHT_SELECTOR = `.${HIGHLIGHT_CLASS}`;

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "CF_HIGHLIGHT_SELECTION") {
    highlightCurrentSelection();
  }

  if (message?.type === "CF_REMOVE_HIGHLIGHT") {
    removeHighlightsFromSelection();
  }
});

function highlightCurrentSelection() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return;
  }

  const ranges = getUsableRanges(selection);
  ranges.forEach((range) => highlightRange(range));
  selection.removeAllRanges();
}

function removeHighlightsFromSelection() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return;
  }

  const highlights = new Set();
  getUsableRanges(selection).forEach((range) => {
    collectIntersectingHighlights(range).forEach((node) => highlights.add(node));
  });

  highlights.forEach((highlight) => unwrapElement(highlight));
  selection.removeAllRanges();
}

function getUsableRanges(selection) {
  return Array.from({ length: selection.rangeCount }, (_, index) => {
    const range = selection.getRangeAt(index);
    return isRangeInsideEditableControl(range) ? null : range.cloneRange();
  }).filter(Boolean);
}

function highlightRange(range) {
  if (!range || range.collapsed || range.toString().trim() === "") {
    return;
  }

  const commonElement = getElementFromNode(range.commonAncestorContainer);
  if (commonElement?.closest(HIGHLIGHT_SELECTOR)) {
    return;
  }

  const wrapper = createHighlightElement();

  try {
    range.surroundContents(wrapper);
  } catch {
    // Complex selections can partially contain element nodes, which makes
    // surroundContents throw. Extracting the fragment and reinserting it keeps
    // the DOM structure intact without touching document.body.innerHTML.
    const fragment = range.extractContents();
    wrapper.appendChild(fragment);
    range.insertNode(wrapper);
  }

  wrapper.normalize();
}

function collectIntersectingHighlights(range) {
  const root = getElementFromNode(range.commonAncestorContainer);
  if (!root) {
    return [];
  }

  const candidates = root.matches?.(HIGHLIGHT_SELECTOR)
    ? [root]
    : Array.from(root.querySelectorAll(HIGHLIGHT_SELECTOR));

  return candidates.filter((highlight) => rangeIntersectsNode(range, highlight));
}

function rangeIntersectsNode(range, node) {
  if (typeof range.intersectsNode === "function") {
    return range.intersectsNode(node);
  }

  const nodeRange = document.createRange();
  nodeRange.selectNode(node);
  return range.compareBoundaryPoints(Range.END_TO_START, nodeRange) < 0
    && range.compareBoundaryPoints(Range.START_TO_END, nodeRange) > 0;
}

function unwrapElement(element) {
  const parent = element.parentNode;
  if (!parent) {
    return;
  }

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }

  parent.removeChild(element);
  parent.normalize();
}

function createHighlightElement() {
  const mark = document.createElement("mark");
  mark.className = HIGHLIGHT_CLASS;
  mark.dataset.cfHighlighter = "true";
  return mark;
}

function getElementFromNode(node) {
  if (!node) {
    return null;
  }

  return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
}

function isRangeInsideEditableControl(range) {
  const element = getElementFromNode(range.commonAncestorContainer);
  return Boolean(element?.closest("input, textarea, [contenteditable='true'], [contenteditable='']"));
}
