const template = document.getElementById("tabsTemplate");
const list = [];

// const tabs = await getAllFromStore();
chrome.runtime.sendMessage({ message: "getTabs" }, (tabs) => {
    // TODO: Check window ID to group tabs by window
    for (const tab of tabs) {
        const tabItem = template.content.firstElementChild.cloneNode(true);
        tabItem.querySelector(".title").textContent = tab.value.title;
        try {
            tabItem.querySelector(".path").textContent = new URL(tab.value.url);
        } catch {
            console.error(tab);
        }

        list.push(tabItem);
    }
    // list.push(tabs.map((tab) => [tab.value.title, tab.value.url].join(": ")));
    document.querySelector("ul").append(...list, list.length);
});
