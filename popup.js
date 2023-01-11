(async () => {
    const list = {};
    const tabs = await chrome.runtime.sendMessage({ message: "getAll" });
    const windowTemplate = document.getElementById("windowTemplate");
    const listTemplate = document.getElementById("listTemplate");

    for (const [_, tab] of Object.entries(tabs)) {
        try {
            const url = new URL(tab.url);
            const tabItem = listTemplate.content.cloneNode(true);

            tabItem.querySelector(".linkItem").textContent = tab.title;
            tabItem.querySelector(".linkItem").href = url;

            // Create window object if it does not already exist
            if (!list[tab.window]) {
                const windowList = windowTemplate.content.cloneNode(true);
                windowList.querySelector("ul").setAttribute("id", tab.window);
                list[tab.window] = windowList;
            }
            list[tab.window].querySelector("ul").append(tabItem);
        } catch (err) {
            console.error(err, JSON.stringify(tab));
        }
    }

    // Get length of each window and append windows to list
    let counter = 1;
    Object.values(list).forEach((element) => {
        // Get length of elements and update window title
        const length = element.querySelector("ul").getElementsByTagName("li").length;
        element.querySelector("#windowTitle").textContent = `Window ${counter} (${length})`;

        // Individual window button listeners
        element.querySelector("#openWindowButton").addEventListener("click", openWindow);
        element.querySelector("#deleteWindowButton").addEventListener("click", deleteWindow);
        element.querySelector("#openWindowButton").windowId = element.querySelector("ul").id;
        element.querySelector("#deleteWindowButton").windowId = element.querySelector("ul").id;

        // Append element to the document and update window counter
        document.querySelector("ul").append(element);
        counter++;
    });

    // If no windows or tabs, display 404 message
    if (counter === 1) {
        document.getElementById("404").style.display = "block";
    }
})();

// Open all / delete all button listeners
document.getElementById("openButton").addEventListener("click", openAll);
document.getElementById("deleteButton").addEventListener("click", deleteAll);

// Open all tabs/windows in their respective windows
async function openAll() {
    const tabs = await chrome.runtime.sendMessage({ message: "getAll" });

    for (const [_, tab] of Object.entries(tabs)) {
        chrome.tabs.create({
            active: false,
            url: tab.url,
            windowId: tab.window,
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
    });
}

/**
 * Open all tabs within a window grouping
 * @param {PointerEvent} event 
 */
async function openWindow(event) {
    const windowId = event.target.windowId;
}

/**
 * Delete all tabs within a window grouping
 * @param {PointerEvent} event 
 */
function deleteWindow(event) {
    const windowId = event.target.windowId;
}