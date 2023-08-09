let windowCounter = 0;
let settings;

(async () => {
    settings = (await chrome.runtime.sendMessage({ message: "getSettings" })).settings;
    dispatchEvent(new CustomEvent("getSettings", { detail: { settings: settings } }));

    const tabs = await chrome.runtime.sendMessage({ message: "getAll" });
    const list = populateTemplates(tabs);

    // Get length of each window and append windows to list
    displayWindowGroup(list);

    // If no windows or tabs, display 404 message
    display404();
})();

self.addEventListener("getSettings", (event) => {
    const settings = event.detail.settings;
    setColorScheme(settings);
});

/**
 * Set the color theme of the popup from settings
 * @param {JSON} settings
 */
function setColorScheme(settings) {
    const themes = {
        light: {
            black: "rgba(30, 30, 30, 1)",
            blue: "rgba(116, 208, 251, 1)",
            green: "rgba(75, 203, 75, 1)",
            orange: "rgba(232, 126, 39, 1)",
            purple: "rgba(201, 74, 202, 1)",
            red: "rgba(255, 157, 155, 1)",
            white: "rgba(220, 220, 220, 1)",
        },
        dark: {
            black: "rgba(80, 80, 80, 1)",
            blue: "rgba(126, 218, 261, 1)",
            green: "rgba(85, 213, 85, 1)",
            orange: "rgba(240, 151, 78, 1)",
            purple: "rgba(211, 84, 212, 1)",
            red: "rgba(255, 167, 165, 1)",
            white: "rgba(240, 240, 240, 1",
        },
    };
    if (!settings || !settings.theme) return;
    const theme = settings.theme;

    document.getElementById("titleImage").src = `images/favicon/${theme}R.png`;

    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.style.setProperty("--headerColor", themes.dark[theme]);
    } else {
        document.documentElement.style.setProperty("--headerColor", themes.light[theme]);
    }
}

/**
 * Populate templates and generate list of elements
 * @param {JSON} tabs
 * @returns List of tabs
 */
function populateTemplates(tabs) {
    const list = {};

    for (const [id, tab] of Object.entries(tabs)) {
        try {
            const tabItem = populateTabTemplate({ ...tab, id: id });

            // Create window object if it does not already exist
            if (!list[tab.windowId]) {
                list[tab.windowId] = populateWindowTemplate(tab.windowId, tab.incognito);
            }
            list[tab.windowId].querySelector("ul").append(tabItem);
        } catch (err) {
            console.error(err, id, tab);
        }
    }

    return list;
}

/**
 * Populate the tab template with tab information
 * @param {JSON} tab
 * @returns Document fragment
 */
function populateTabTemplate(tab) {
    const listTemplate = document.getElementById("listTemplate");
    const url = new URL(tab.url);
    const tabItem = listTemplate.content.cloneNode(true);

    tabItem.querySelector(".linkTitle").id = tab.id;
    tabItem.querySelector(".linkTitle").textContent = tab.title;
    tabItem.querySelectorAll(".linkLink").forEach((link) => {
        link.href = url;
    });
    tabItem.querySelector(".linkIcon").src = tab.favicon;

    return tabItem;
}

/**
 * Create a window grouping using the window template
 * @param {Number} windowId
 * @returns windowList HTMLElement
 */
function populateWindowTemplate(windowId, incognito = false) {
    const windowTemplate = document.getElementById("windowTemplate");
    const windowList = windowTemplate.content.cloneNode(true);

    windowList.querySelector("ul").setAttribute("id", windowId);

    // Display incognito icon
    if (incognito) {
        const parent = windowList.getElementById(windowId).parentElement;
        const child = parent.firstElementChild.children[2];

        child.style.display = "inline";
        parent.dataset.incognito = "true";
    }

    return windowList;
}

/**
 * Add window grouping element to the list and display
 * @param {Array} list Array of HTMLElement
 */
function displayWindowGroup(list) {
    document.getElementById("fourOhFour").style.display = "none";
    Object.values(list).forEach((element) => {
        windowCounter++;

        // Get length of elements and update window title
        const length = element.querySelector("ul").getElementsByTagName("li").length;
        element.querySelector("#windowTitle").textContent = `Window ${windowCounter}`;
        element.querySelector("#windowLength").textContent = length;

        // Individual window button listeners
        element.querySelector("#openWindowButton").addEventListener("click", openWindow);
        element.querySelector("#deleteWindowButton").addEventListener("click", deleteWindow);
        element.querySelector("#openWindowButton").windowId = element.querySelector("ul").id;
        element.querySelector("#deleteWindowButton").windowId = element.querySelector("ul").id;

        // Append element to the document and update window counter
        document.querySelector("ul").append(element);
    });
}

/**
 * Update a window group's tab count
 * @param {HTMLElement} windowGroup
 */
function updateTabCount(windowGroup) {
    const length = windowGroup.querySelector("ul").getElementsByTagName("li").length;
    windowGroup.querySelector("#windowLength").textContent = length;
}

/**
 * Display no windows message if there are no more windows
 */
function display404() {
    if (windowCounter <= 0) {
        document.getElementById("fourOhFour").style.display = "block";
    }
}

/**
 * Check if a window is open by its ID
 * @param {Number} Window ID
 */
async function isWindowOpen(id) {
    try {
        await chrome.windows.get(id);
        return true;
    } catch {
        return false;
    }
}

// Open all / delete all button listeners
document.getElementById("openButton").addEventListener("click", openAll);
document.getElementById("deleteButton").addEventListener("click", deleteAll);
document.getElementById("settingsButton").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
});

/**
 * Open all tabs/windows in their respective windows
 */
async function openAll() {
    const openWindowButtons = document.querySelectorAll("#openWindowButton");
    openWindowButtons.forEach((window) => {
        window.dispatchEvent(new Event("click"));
    });
}

/**
 * Delete all tabs/windows
 */
function deleteAll() {
    // Delete window tabs from DB
    chrome.runtime.sendMessage({ message: "deleteAll" }, () => {
        const list = document.querySelector("#tabList");
        while (list.firstChild) {
            list.removeChild(list.firstChild);
        }
        windowCounter = 0;
        display404();
    });

    // Delete windows from Chrome
    if (settings.discardAll) {
        chrome.windows.getAll().then((windows) => {
            windows.forEach((window) => {
                chrome.windows.remove(window.id);
            });
        });
    }
}

/**
 * Open all tabs within a window grouping
 * - If a window group exists, bring to front
 * @param {PointerEvent} event
 */
async function openWindow(event) {
    let windowId = parseInt(event.target.windowId);
    const list = document.getElementById(windowId).querySelectorAll("li");
    const setIncognito =
        document.getElementById(windowId).parentElement.dataset.incognito === "true";

    // Check if window with that ID still exists
    if (await isWindowOpen(windowId)) {
        // Bring existing window to the front
        chrome.windows.update(windowId, { focused: true });
    } else {
        // Else create a new window, add to DB, and delete the old window from the UI
        const window = await chrome.windows.create({ incognito: setIncognito });
        let pendingTab = undefined;
        const newWindowId = window.id;

        pendingTab = window.tabs[0].id;

        // Delete old window tabs from DB
        deleteWindow(event, "openWindow");

        const tabs = {};
        const promises = [];

        // Create tabs within the window group
        for (const item of list) {
            promises.push(
                (() => {
                    return new Promise((resolve) => {
                        const url = item.querySelector("a").href;
                        const title = item.querySelector("a").textContent;

                        chrome.tabs.create(
                            {
                                active: false,
                                url: url,
                                windowId: parseInt(newWindowId),
                            },
                            (tab) => {
                                tabs[tab.id] = {
                                    title: title,
                                    url: url,
                                    windowId: newWindowId,
                                };
                                resolve(tab);
                            }
                        );
                    });
                })()
            );
        }

        // Display window groupings
        Promise.all(promises).then(() => {
            // Deletes the new tab that is created when the window is created
            if (pendingTab) chrome.tabs.remove(pendingTab);
        });
    }
}

/**
 * Delete all tabs within a window grouping
 * @param {PointerEvent} event
 */
function deleteWindow(event, callee = null) {
    const windowId = event.target.windowId;
    const list = document.getElementById(windowId).querySelectorAll("li");

    // Get all tab IDs within the window grouping
    const tabIdList = Array.from(list).map((item) => item.querySelectorAll("a")[1].id);

    // Send tab IDs for deletion from storage and remove window element
    chrome.runtime.sendMessage({ message: "deleteWindow", keys: tabIdList });

    // Delete chrome window
    if (callee !== "openWindow") {
        chrome.windows.remove(parseInt(windowId));
    }
}

/**
 * Update UI by removing window group
 * @param {String} windowId
 */
function UIdeleteWindowGroupById(windowId) {
    const list = document.getElementById(windowId);

    if (list) {
        list.parentElement.remove();
        windowCounter--;
        display404();

        // Update all window group numbers when window is deleted
        const windowGroups = document.querySelector("#tabList");
        let tempWindowCounter = 0;
        for (const windowItem of windowGroups.children) {
            tempWindowCounter++;
            windowItem.querySelector("#windowTitle").textContent = `Window ${tempWindowCounter}`;
        }
    }
}

/**
 * Update UI by removing tab in window group
 * @param {String} tabId
 */
function UIdeleteTabById(tabId) {
    const link = document.getElementById(tabId);
    if (link) {
        link.parentElement.remove();
    }
}

// Update UI when tabs and windows are changed (only when the UI is open)

/**
 * Delete window group in UI
 */
chrome.windows.onRemoved.addListener(async (windowId) => {
    UIdeleteWindowGroupById(windowId);
});

/**
 * Delete tab from window group in UI
 */
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    const windowGroup = document.getElementById(tabId).parentElement.parentElement.parentElement;

    UIdeleteTabById(tabId);
    updateTabCount(windowGroup);
});

/**
 * Add tab to UI and create new window group if it does not exist
 */
chrome.tabs.onCreated.addListener((tab) => {
    if (tab.incognito && !settings.incognito) return;

    if (!tab.id || (!tab.url && !tab.pendingUrl)) return;

    if (!tab.title) {
        tab.title = "Pending";
    }

    if (!tab.url && tab.pendingUrl) {
        tab.url = tab.pendingUrl;
    }

    let list = null;

    if (document.getElementById(tab.windowId) === null) {
        // If the window group that the tab belongs to does not exist, then create new window
        list = populateTemplates({ [tab.id]: tab });
        displayWindowGroup(list);
    } else {
        // Else append to existing window group
        const tabItem = populateTabTemplate(tab);
        list = document.getElementById(tab.windowId);
        list.appendChild(tabItem);
        updateTabCount(list.parentElement);
    }
});

/**
 * Update tab information on tab update
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    const tabElement = document.getElementById(tabId);
    if (!tabElement) return;

    if (changeInfo.url) {
        tabElement.href = changeInfo.url;
        tabElement.textContent = tab.title;
    }
    if (changeInfo.status === "complete") {
        if (tab.title !== "...") {
            tabElement.textContent = tab.title;
        }
    }
});

/**
 * Update UI when tab is moved between windows or new window created
 */
chrome.tabs.onAttached.addListener(async (tabId, attachInfo) => {
    const tabElement = document.getElementById(tabId).parentElement;
    const tabWindowElement = tabElement.parentElement;
    const oldWindowGroup = tabElement.parentElement.parentElement;

    const newWindow = document.getElementById(attachInfo.newWindowId);

    if (newWindow === null) {
        // If the new window does not exist, then create and display the new window
        const window = await chrome.windows.get(attachInfo.newWindowId);
        const windowGroup = populateWindowTemplate(attachInfo.newWindowId, window.incognito);

        windowGroup.querySelector("ul").appendChild(tabElement);

        updateTabCount(oldWindowGroup);
        displayWindowGroup({ [attachInfo.newWindowId]: windowGroup });
    } else {
        // Else append to existing window group
        newWindow.appendChild(tabWindowElement.firstElementChild);
        updateTabCount(newWindow.parentElement);
    }
});

/**
 * TODO:
 * - If the window does not exist and is opened, delete old instance from DB to be replaced by the new one
 * - Prompt user to enable incognito for best experience, blackout the Allow Incognito setting until they enable it
 * - Square the icons?
 */
