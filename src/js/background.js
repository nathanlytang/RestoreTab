const storage = chrome.storage.local;
const syncStorage = chrome.storage.sync;
let bgSettings = null;

const defaultSettings = {
    theme: "orange",
    incognito: false,
    incognitoOnly: false,
    discardAll: false,
};

(async () => {
    const settings = await syncStorage.get("settings");
    bgSettings = settings.settings || defaultSettings;
    dispatchEvent(new CustomEvent("getSettings", { detail: { settings: bgSettings } }));

    // Capture all existing tabs on startup (handles extension restart/reload)
    const allTabs = await chrome.tabs.query({});
    const entries = {};
    for (const tab of allTabs) {
        if (!tab.id) continue;
        if (tab.incognito && !bgSettings.incognito) continue;
        if (bgSettings.incognitoOnly && !tab.incognito) continue;

        const url = tab.url || tab.pendingUrl || "";
        if (!url) continue;

        entries[tab.id] = {
            title: tab.title || "Untitled",
            url: url,
            windowId: tab.windowId,
            favicon: faviconUrl(url),
            incognito: tab.incognito,
        };
    }
    if (Object.keys(entries).length > 0) {
        storage.set(entries);
    }
})();

/**
 * Get favicon URL of a tab
 * @param {String} u
 * @returns Favicon URL
 */
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
            incognito: false,
            incognitoOnly: false,
            discardAll: false,
        };
    }
    const theme = settings.theme ? settings.theme : "orange";
    chrome.action.setIcon({ path: `../images/favicon/${theme}.png` });
});

chrome.tabs.onCreated.addListener(async (tab) => {
    if (!bgSettings) return;
    if (tab.incognito && !bgSettings.incognito) return;
    if (bgSettings.incognitoOnly && !tab.incognito) return;
    if (!tab.id) return;

    const url = tab.url || tab.pendingUrl || "";
    if (!url) return;

    storage.set({
        [tab.id]: {
            title: tab.title || "New Tab",
            url: url,
            windowId: tab.windowId,
            favicon: faviconUrl(url),
            incognito: tab.incognito,
        },
    });
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (!bgSettings) return;
    if (tab.incognito && !bgSettings.incognito) return;
    if (bgSettings.incognitoOnly && !tab.incognito) return;
    if (changeInfo.url || changeInfo.title || changeInfo.status === "complete") {
        if (!tab.url) return;
        storage.set({
            [tab.id]: {
                title: tab.title || "Untitled",
                url: tab.url,
                windowId: tab.windowId,
                favicon: faviconUrl(tab.url),
                incognito: tab.incognito,
            },
        });
    }
});

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    storage.remove(tabId.toString());
});

chrome.tabs.onAttached.addListener(async (tabId, attachInfo) => {
    if (!bgSettings) return;
    const tab = await storage.get(tabId.toString());

    if (!tab[tabId]) return missingTab(tabId, attachInfo);
    if (tab[tabId].incognito && !bgSettings.incognito) return;
    if (bgSettings.incognitoOnly && !tab[tabId].incognito) return;

    storage.set({
        [tabId]: {
            title: tab[tabId].title,
            url: tab[tabId].url,
            windowId: attachInfo.newWindowId,
            favicon: faviconUrl(tab[tabId].url),
            incognito: tab[tabId].incognito,
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
            syncStorage.get("settings", (settings) => {
                sendResponse(settings);
            });
        }
    } else if (senderName === "options") {
        if (request.message === "save") {
            const oldIncognitoOnly = bgSettings ? bgSettings.incognitoOnly : false;
            syncStorage.set({
                settings: {
                    theme: request.settings.theme,
                    incognito: request.settings.incognito,
                    incognitoOnly: request.settings.incognitoOnly,
                    discardAll: request.settings.discardAll,
                },
            });
            bgSettings = {
                theme: request.settings.theme,
                incognito: request.settings.incognito,
                incognitoOnly: request.settings.incognitoOnly,
                discardAll: request.settings.discardAll,
            };

            if (request.settings.incognitoOnly && !oldIncognitoOnly) {
                // Toggled ON: remove all non-incognito tabs from storage
                storage.get(null, (allData) => {
                    const keysToRemove = [];
                    for (const [key, value] of Object.entries(allData)) {
                        if (key === "settings") continue;
                        if (value && !value.incognito) {
                            keysToRemove.push(key);
                        }
                    }
                    if (keysToRemove.length > 0) {
                        storage.remove(keysToRemove);
                    }
                });
            } else if (!request.settings.incognitoOnly && oldIncognitoOnly) {
                // Toggled OFF: re-capture all current non-incognito tabs
                chrome.tabs.query({}, (tabs) => {
                    for (const tab of tabs) {
                        if (tab.incognito) continue;
                        if (!tab.id || !tab.url) continue;
                        storage.set({
                            [tab.id]: {
                                title: tab.title || "Untitled",
                                url: tab.url,
                                windowId: tab.windowId,
                                favicon: faviconUrl(tab.url),
                                incognito: tab.incognito,
                            },
                        });
                    }
                });
            }
        }
    }

    return true;
});

async function missingTab(tabId, attachInfo) {
    const tab = await chrome.tabs.get(tabId);
    storage.set({
        [tabId]: {
            title: tab.title,
            url: tab.url,
            windowId: attachInfo.newWindowId,
            favicon: faviconUrl(tab.url),
            incognito: tab.incognito,
        },
    });
    return;
}
