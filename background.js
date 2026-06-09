const MENU_HIGHLIGHT = "cf-highlighter-highlight";
const MENU_REMOVE = "cf-highlighter-remove";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_HIGHLIGHT,
    title: "Highlight Selection",
    contexts: ["selection"],
    documentUrlPatterns: ["https://codeforces.com/*"],
  });

  chrome.contextMenus.create({
    id: MENU_REMOVE,
    title: "Remove Highlight",
    contexts: ["selection"],
    documentUrlPatterns: ["https://codeforces.com/*"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId === MENU_HIGHLIGHT) {
    chrome.tabs.sendMessage(tab.id, {
      type: "CF_HIGHLIGHT_SELECTION",
    });
  }

  if (info.menuItemId === MENU_REMOVE) {
    chrome.tabs.sendMessage(tab.id, {
      type: "CF_REMOVE_HIGHLIGHT",
    });
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!tab?.id || !tab.url?.startsWith("https://codeforces.com/")) return;

  if (command === "highlight-selection") {
    chrome.tabs.sendMessage(tab.id, {
      type: "CF_HIGHLIGHT_SELECTION",
    });
  }

  if (command === "clear-highlights") {
    chrome.tabs.sendMessage(tab.id, {
      type: "CF_CLEAR_ALL_HIGHLIGHTS",
    });
  }
});