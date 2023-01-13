const storage = chrome.storage.local;

chrome.action.setIcon({ path: "images/favicon/orange64.png" });

chrome.tabs.onCreated.addListener(async (tab) => {
    if (!tab.id || !tab.title || !tab.url) return;

    storage.set({
        [tab.id]: {
            title: tab.title,
            url: tab.url,
            windowId: tab.windowId,
        },
    });
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        storage.set({
            [tab.id]: {
                title: tab.title,
                url: tab.url,
                windowId: tab.windowId,
            },
        });
    }
});

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    storage.remove(tabId.toString());
});

chrome.tabs.onAttached.addListener(async (tabId, attachInfo) => {
    const tab = await storage.get(tabId.toString());
    storage.set({
        [tabId]: {
            title: tab[tabId].title,
            url: tab[tabId].url,
            windowId: attachInfo.newWindowId,
        },
    });
});

chrome.tabs.onReplaced.addListener(async (addedTabId, removedTabId) => {
    const oldTab = await storage.get(removedTabId.toString());
    storage.remove(removedTabId.toString());
    storage.set({
        [addedTabId]: {
            ...oldTab[removedTabId],
        },
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === "getAll") {
        storage.get(null, (tabs) => {
            sendResponse(tabs);
        });
    } else if (request.message === "deleteAll") {
        storage.clear();
        sendResponse(true);
    } else if (request.message === "deleteWindow") {
        storage.remove(request.keys);
        sendResponse(true);
    }

    return true;
});
