let windowCounter = 0;

(async () => {
    const tabs = await chrome.runtime.sendMessage({ message: "getAll" });
    const list = populateTemplates(tabs);

    // Get length of each window and append windows to list
    displayWindowGroup(list);

    // If no windows or tabs, display 404 message
    displayNoWindow();
})();

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
                list[tab.windowId] = populateWindowTemplate(tab.windowId);
            }
            list[tab.windowId].querySelector("ul").append(tabItem);
        } catch (err) {
            console.error(err, JSON.stringify(tab));
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

    tabItem.querySelector(".linkItem").id = tab.id;
    tabItem.querySelector(".linkItem").textContent = tab.title;
    tabItem.querySelector(".linkItem").href = url;

    return tabItem;
}

/**
 * Create a window grouping using the window template
 * @param {Number} windowId
 * @returns windowList HTMLElement
 */
function populateWindowTemplate(windowId) {
    const windowTemplate = document.getElementById("windowTemplate");
    const windowList = windowTemplate.content.cloneNode(true);
    windowList.querySelector("ul").setAttribute("id", windowId);
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
function displayNoWindow() {
    if (windowCounter <= 0) {
        document.getElementById("fourOhFour").style.display = "block";
    }
}

// Open all / delete all button listeners
document.getElementById("openButton").addEventListener("click", openAll);
document.getElementById("deleteButton").addEventListener("click", deleteAll);

/**
 * Open all tabs/windows in their respective windows
 */
async function openAll() {
    const tabs = await chrome.runtime.sendMessage({ message: "getAll" });

    for (const [_, tab] of Object.entries(tabs)) {
        chrome.tabs.create({
            active: false,
            url: tab.url,
            windowId: tab.windowId,
        });
    }
}

/**
 * Delete all tabs/windows
 */
function deleteAll() {
    chrome.runtime.sendMessage({ message: "deleteAll" }, () => {
        const list = document.querySelector("#tabList");
        while (list.firstChild) {
            list.removeChild(list.firstChild);
        }
        windowCounter = 0;
        displayNoWindow();
    });
}

/**
 * Open all tabs within a window grouping
 * @param {PointerEvent} event
 */
async function openWindow(event) {
    let windowId = event.target.windowId;
    const list = document.getElementById(windowId).querySelectorAll("li");
    let pendingTab = undefined;

    // Check if window with that ID still exists, if not, create a new window
    try {
        await chrome.windows.get(parseInt(windowId));
    } catch {
        const window = await chrome.windows.create();
        windowId = window.id;
        pendingTab = window.tabs[0].id;

        deleteWindow(event);
    }

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
                            windowId: parseInt(windowId),
                        },
                        (tab) => {
                            tabs[tab.id] = {};
                            tabs[tab.id].title = title;
                            tabs[tab.id].url = url;
                            tabs[tab.id].windowId = tab.windowId;
                            resolve(tab);
                        }
                    );
                });
            })()
        );
    }

    // Display window groupings
    Promise.all(promises).then(() => {
        // Deletes the newtab that is created when the window is created
        if (pendingTab) {
            const windowGroupList = populateTemplates(tabs);
            displayWindowGroup(windowGroupList);
            chrome.tabs.remove(pendingTab);
        }
    });
}

/**
 * Delete all tabs within a window grouping
 * @param {PointerEvent} event
 */
function deleteWindow(event) {
    const windowId = event.target.windowId;
    const list = document.getElementById(windowId).querySelectorAll("li");

    // Get all tab IDs within the window grouping
    const tabIdList = Array.from(list).map((item) => item.querySelector("a").id);

    // Send tab IDs for deletion from storage and remove window element
    chrome.runtime.sendMessage({ message: "deleteWindow", keys: tabIdList }, () => {
        UIdeleteWindowGroupById(windowId);
    });
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
        displayNoWindow();

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
        link.parentElement.parentElement.remove();
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
    UIdeleteTabById(tabId);
});

/**
 * Add tab to UI and create new window group if it does not exist
 */
chrome.tabs.onCreated.addListener((tab) => {
    if (!tab.id || (!tab.url && !tab.pendingUrl)) return;

    if (!tab.title) {
        tab.title = "Pending";
    }

    if (!tab.url && tab.pendingUrl) {
        tab.url = tab.pendingUrl;
    }

    if (document.getElementById(tab.windowId) === null) {
        // If the window group that the tab belongs to does not exist, then create new window
        const list = populateTemplates({ [tab.id]: tab });
        displayWindowGroup(list);
    } else {
        // Else append to existing window group
        const tabItem = populateTabTemplate(tab);
        const list = document.getElementById(tab.windowId);
        list.appendChild(tabItem);
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
chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
    const tabElement = document.getElementById(tabId).parentElement.parentElement;
    const oldWindowGroup = tabElement.parentElement.parentElement;
    tabElement.remove();
    updateTabCount(oldWindowGroup);

    const newWindow = document.getElementById(attachInfo.newWindowId);

    if (newWindow === null) {
        // If the new window does not exist, then create and display the new window
        const windowGroup = populateWindowTemplate(attachInfo.newWindowId);
        windowGroup.querySelector("ul").appendChild(tabElement);
        displayWindowGroup([windowGroup]);
    } else {
        // Else append to existing window group
        newWindow.appendChild(tabElement);
        updateTabCount(newWindow.parentElement);
    }
});
