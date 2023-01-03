// import dbWrapper from "./db.js";

// const db = new dbWrapper();

// async function dbHandler() {
//     if (!db) {
//         return new dbWrapper();
//     } else {
//         return db;
//     }
// }

chrome.tabs.onCreated.addListener(async (tab) => {
    if (!tab.id || !tab.title || !tab.url) return;

    // db.addToStore(tab.id, {
    //     title: tab.title,
    //     url: tab.url,
    //     window: tab.windowId,
    // });

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
        // db.updateToStore(tabId, {
        //     title: tab.title,
        //     url: tab.url,
        //     window: tab.windowId,
        //     },
        // });

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
    // db.deleteFromStore(tabId);
    chrome.storage.local.remove(tabId.toString());
});

chrome.tabs.onReplaced.addListener(async (addedTabId, removedTabId) => {
    // const oldTab = await db.getFromStore(removedTabId);
    // if (!oldTab || !oldTab.value) {
    //     console.log("broken");
    //     return;
    // }

    // db.deleteFromStore(removedTabId);
    // db.addToStore(addedTabId, oldTab.value);

    const oldTab = await chrome.storage.local.get(removedTabId.toString());

    chrome.storage.local.remove(removedTabId.toString());
    chrome.storage.local.set({
        [addedTabId]: {
            ...oldTab[removedTabId],
        },
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // const db = await dbHandler();
    if (request.message === "getTabs") {
        // return db.getAllFromStore().then((tabs) => {
        //     sendResponse(tabs);
        // });

        chrome.storage.local.get(null, (tabs) => {
            sendResponse(tabs);
        });
    } else if (request.message === "deleteAll") {
        // return db.deleteAllFromStore().then(() => {
        //     sendResponse(true);
        // });
        chrome.storage.local.clear();
        sendResponse(true);
    }

    return true;
});
