const storage = chrome.storage.local;

(async () => {
    const settings = await storage.get("settings");
    dispatchEvent(new CustomEvent("getSettings", { detail: settings }));
})();

function faviconUrl(u) {
    const url = new URL(chrome.runtime.getURL("/_favicon/"));
    url.searchParams.set("pageUrl", u);
    url.searchParams.set("size", "16");
    return url.toString();
}

self.addEventListener("getSettings", (event) => {
    let settings = event.detail.settings;
    if (!settings) {
        settings = {
            theme: "orange",
        };
    }
    const theme = settings.theme ? settings.theme : "orange";
    chrome.action.setIcon({ path: `../images/favicon/${theme}.png` });
});

chrome.tabs.onCreated.addListener(async (tab) => {
    if (!tab.id || !tab.title || !tab.url) return;

    storage.set({
        [tab.id]: {
            title: tab.title,
            url: tab.url,
            windowId: tab.windowId,
            favicon: faviconUrl(tab.url),
            incognito: tab.incognito
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
                favicon: faviconUrl(tab.url),
                incognito: tab.incognito
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
            favicon: faviconUrl(tab[tabId].url),
            incognito: tab.incognito
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
    const senderArg = sender.url.split("/");
    const senderName = senderArg[senderArg.length - 1].split(".")[0];

    if (senderName === "popup") {
        if (request.message === "getAll") {
            storage.get(null, (tabs) => {
                delete tabs.settings;
                sendResponse(tabs);
            });
        } else if (request.message === "deleteAll") {
            storage.get("settings", (settings) => {
                storage.clear();
                storage.set(settings);
            });
            sendResponse(true);
        } else if (request.message === "deleteWindow") {
            storage.remove(request.keys);
            sendResponse(true);
        } else if (request.message === "getSettings") {
            storage.get("settings", (settings) => {
                sendResponse(settings);
            });
        }
    } else if (senderName === "options") {
        if (request.message === "save") {
            storage.set({
                settings: {
                    theme: request.settings.theme,
                    incognito: request.settings.incognito,
                },
            });
        }
    }

    return true;
});


// TODO: Change settings to store in chrome.storage.sync instead of local