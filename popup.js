// window.addEventListener("error", (event) => {
//     return new Error(event)
// })

// const template = document.getElementById("tabsTemplate");
const list = {};

// const tabs = await getAllFromStore();
chrome.runtime.sendMessage({ message: "getTabs" }, (tabs) => {
    // TODO: Check window ID to group tabs by window

    for (const tab of tabs) {
        let tabItem;
        try {
            tabItem = document.createElement("span");
            const url = new URL(tab.value.url);
            const tabHTML = `
                <li>
                    <h3>
                        <a href="${url}" target="_blank" class="title">${tab.value.title}</a>
                    </h3>
                </li>
            `;

            // <h3 class="title">${tab.value.title}</h3>
            // <a href="${url}" target="_blank" class="path">${url}</a>

            tabItem.innerHTML = tabHTML;
        } catch (err) {
            console.error(err, JSON.stringify(tab));
        }

        if (!list[tab.value.window]) {
            list[tab.value.window] = document.createElement("ul");
            list[tab.value.window].setAttribute("id", tab.value.window);
        }

        list[tab.value.window].append(tabItem);
    }
    Object.values(list).forEach((element) => {
        const length = element.getElementsByTagName("li").length;
        document.querySelector("ul").append(length, element);
    });
});

document.getElementById("openButton").addEventListener("click", openAll);
document.getElementById("deleteButton").addEventListener("click", deleteAll);

function openAll() {
    chrome.runtime.sendMessage({ message: "getTabs" }, (tabs) => {
        for (const tab of tabs) {
            chrome.tabs.create({
                active: false,
                url: tab.value.url,
                windowId: tab.value.window,
            });
        }
    });
}

function deleteAll() {
    chrome.runtime.sendMessage({ message: "deleteAll" }, () => {
        const list = document.querySelector("#tabList");
        while (list.firstChild) {
            list.removeChild(list.firstChild);
        }
    });
}
