chrome.tabs.onCreated.addListener(async (tab) => {
    if (!tab.id || !tab.title || !tab.url) return;

    chrome.storage.local.set({
        [tab.id]: {
            title: tab.title,
            url: tab.url,
            window: tab.windowId,
        },
    });
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        chrome.storage.local.set({
            [tab.id]: {
                title: tab.title,
                url: tab.url,
                window: tab.windowId,
            },
        });
    }
});

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    chrome.storage.local.remove(tabId.toString());
});

chrome.tabs.onReplaced.addListener(async (addedTabId, removedTabId) => {
    const oldTab = await chrome.storage.local.get(removedTabId.toString());

    chrome.storage.local.remove(removedTabId.toString());
    chrome.storage.local.set({
        [addedTabId]: {
            ...oldTab[removedTabId],
        },
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === "getAll") {
        chrome.storage.local.get(null, (tabs) => {
            sendResponse(tabs);
        });
    } else if (request.message === "deleteAll") {
        chrome.storage.local.clear();
        sendResponse(true);
    } else if (request.message === "deleteWindow") {
        chrome.storage.local.remove(request.keys);
        sendResponse(true);
    }

    return true;
});
