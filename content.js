const HIGHLIGHT_CLASS = "cf-highlighter-mark";
const HIGHLIGHT_SELECTOR = `.${HIGHLIGHT_CLASS}`;
const MATHJAX_SELECTOR = "mjx-container, .MathJax, .MathJax_Display";
const highlightHistory = [];

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "CF_HIGHLIGHT_SELECTION") {
    highlightCurrentSelection();
  }

  if (message?.type === "CF_REMOVE_HIGHLIGHT") {
    removeHighlightsFromSelection();
  }
});

document.addEventListener("keydown", (event) => {
  if (!isUndoShortcut(event) || isEditableElement(event.target)) {
    return;
  }

  if (undoLastHighlight()) {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

function highlightCurrentSelection() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return;
  }

  const ranges = getUsableRanges(selection);
  const batch = ranges.flatMap((range) => highlightRange(range));
  if (batch.length > 0) {
    highlightHistory.push(batch);
  }

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
    return [];
  }

  // MathJax owns a generated DOM tree, so mark the rendered container itself
  // instead of inserting nodes into the formula internals.
  const highlightedItems = highlightIntersectingMathJax(range);

  // Codeforces samples rely on preformatted whitespace. Wrapping only the
  // selected text-node slices preserves the surrounding sample block structure.
  const textPieces = getTextPiecesInRange(range)
    .filter(({ node, startOffset, endOffset }) => {
      return endOffset > startOffset
        && !getElementFromNode(node)?.closest(HIGHLIGHT_SELECTOR)
        && !getElementFromNode(node)?.closest(MATHJAX_SELECTOR);
    });

  textPieces.reverse().forEach(({ node, startOffset, endOffset }) => {
    highlightedItems.push(wrapTextPiece(node, startOffset, endOffset));
  });

  return highlightedItems.filter(Boolean);
}

function highlightIntersectingMathJax(range) {
  return collectIntersectingElements(range, MATHJAX_SELECTOR).map((element) => {
    if (element.classList.contains(HIGHLIGHT_CLASS)) {
      return null;
    }

    element.classList.add(HIGHLIGHT_CLASS);
    element.dataset.cfHighlighter = "mathjax";
    return { type: "mathjax", element };
  }).filter(Boolean);
}

function getTextPiecesInRange(range) {
  const root = range.commonAncestorContainer;
  const textNodes = root.nodeType === Node.TEXT_NODE
    ? [root]
    : collectTextNodes(root);

  return textNodes
    .filter((node) => node.nodeValue && rangeIntersectsNode(range, node))
    .map((node) => {
      const [startOffset, endOffset] = getSelectedTextOffsets(range, node);
      return { node, startOffset, endOffset };
    });
}

function collectTextNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];

  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }

  return nodes;
}

function getSelectedTextOffsets(range, textNode) {
  if (range.startContainer === textNode && range.endContainer === textNode) {
    return [range.startOffset, range.endOffset];
  }

  if (range.startContainer === textNode) {
    return [range.startOffset, textNode.length];
  }

  if (range.endContainer === textNode) {
    return [0, range.endOffset];
  }

  return [
    findFirstPointInsideRange(range, textNode),
    findLastPointInsideRange(range, textNode)
  ];
}

function findFirstPointInsideRange(range, textNode) {
  let low = 0;
  let high = textNode.length;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (range.comparePoint(textNode, middle) < 0) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return low;
}

function findLastPointInsideRange(range, textNode) {
  let low = 0;
  let high = textNode.length;

  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (range.comparePoint(textNode, middle) > 0) {
      high = middle - 1;
    } else {
      low = middle;
    }
  }

  return low;
}

function wrapTextPiece(textNode, startOffset, endOffset) {
  const selected = textNode.splitText(startOffset);
  selected.splitText(endOffset - startOffset);

  const wrapper = createHighlightElement();
  selected.parentNode.insertBefore(wrapper, selected);
  wrapper.appendChild(selected);
  return { type: "wrapper", element: wrapper };
}

function collectIntersectingHighlights(range) {
  return collectIntersectingElements(range, HIGHLIGHT_SELECTOR);
}

function collectIntersectingElements(range, selector) {
  const root = getElementFromNode(range.commonAncestorContainer);
  if (!root) {
    return [];
  }

  const candidates = new Set();
  const closestMatch = root.closest?.(selector);
  if (closestMatch) {
    candidates.add(closestMatch);
  }

  if (root.matches?.(selector)) {
    candidates.add(root);
  }

  root.querySelectorAll?.(selector).forEach((element) => candidates.add(element));

  return Array.from(candidates).filter((element) => rangeIntersectsNode(range, element));
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
  if (element.dataset.cfHighlighter === "mathjax") {
    element.classList.remove(HIGHLIGHT_CLASS);
    delete element.dataset.cfHighlighter;
    return;
  }

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

function undoLastHighlight() {
  while (highlightHistory.length > 0) {
    const batch = highlightHistory.pop();
    const liveItems = batch.filter(({ element }) => element?.isConnected);

    if (liveItems.length === 0) {
      continue;
    }

    liveItems.reverse().forEach(({ element }) => unwrapElement(element));
    return true;
  }

  return false;
}

function createHighlightElement() {
  const mark = document.createElement("mark");
  mark.className = HIGHLIGHT_CLASS;
  mark.dataset.cfHighlighter = "wrapper";
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
  return isEditableElement(element);
}

function isEditableElement(element) {
  return Boolean(getElementFromNode(element)?.closest("input, textarea, [contenteditable='true'], [contenteditable='']"));
}

function isUndoShortcut(event) {
  return event.key.toLowerCase() === "z"
    && (event.ctrlKey || event.metaKey)
    && !event.shiftKey
    && !event.altKey;
}
