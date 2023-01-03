// window.addEventListener("error", (event) => {
//     return new Error(event)
// })

// const template = document.getElementById("tabsTemplate");

// const tabs = await getAllFromStore();
(async () => {
    const list = {};
    const tabs = await chrome.runtime.sendMessage({ message: "getTabs" });
    // TODO: Check window ID to group tabs by window

    console.log(tabs);

    // if (!Array.isArray(tabs)) {
    //     tabs = [tabs];
    // }

    for (const [_, tab] of Object.entries(tabs)) {
        let tabItem;
        try {
            tabItem = document.createElement("span");
            const url = new URL(tab.url);
            const tabHTML = `
                    <li>
                        <h3>
                            <a href="${url}" target="_blank" class="title">${tab.title}</a>
                        </h3>
                    </li>
                `;

            // <h3 class="title">${tab.title}</h3>
            // <a href="${url}" target="_blank" class="path">${url}</a>

            tabItem.innerHTML = tabHTML;
        } catch (err) {
            console.error(err, JSON.stringify(tab));
        }

        if (!list[tab.window]) {
            list[tab.window] = document.createElement("ul");
            list[tab.window].setAttribute("id", tab.window);
        }

        list[tab.window].append(tabItem);
    }
    Object.values(list).forEach((element) => {
        const length = element.getElementsByTagName("li").length;
        document.querySelector("ul").append(length, element);
    });
})();

document.getElementById("openButton").addEventListener("click", openAll);
document.getElementById("deleteButton").addEventListener("click", deleteAll);

async function openAll() {
    const tabs = await chrome.runtime.sendMessage({ message: "getTabs" });

    for (const [_, tab] of Object.entries(tabs)) {
        chrome.tabs.create({
            active: false,
            url: tab.url,
            windowId: tab.window,
        });
    }
}

function deleteAll() {
    chrome.runtime.sendMessage({ message: "deleteAll" }, () => {
        const list = document.querySelector("#tabList");
        while (list.firstChild) {
            list.removeChild(list.firstChild);
        }
    });
}
