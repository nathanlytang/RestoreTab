import * as db from "./db.js";

db.openDB();

chrome.tabs.onCreated.addListener(async (tab) => {
    if (!tab.id || !tab.title || !tab.url) return;

    db.addToStore(tab.id, {
        title: tab.title,
        url: tab.url,
        window: tab.windowId,
    });
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        db.updateToStore(tabId, {
            title: tab.title,
            url: tab.url,
            window: tab.windowId,
        });
    }
});

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    db.deleteFromStore(tabId);
});

chrome.tabs.onReplaced.addListener(async (addedTabId, removedTabId) => {
    const oldTab = await db.getFromStore(removedTabId);
    if (!oldTab.value) return;

    db.deleteFromStore(removedTabId);
    db.addToStore(addedTabId, oldTab.value);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === "getTabs") {
        db.getAllFromStore().then((tabs) => {
            sendResponse(tabs);
        });
    } else if (request.message === "deleteAll") {
        db.deleteAllFromStore().then(() => {
            sendResponse(true);
        });
    }

    return true;
});
