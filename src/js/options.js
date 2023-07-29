document.getElementById("save").addEventListener("click", () => {
    const formData = new FormData(document.forms.settings);

    let theme = formData.get("theme");
    if (!theme) {
        theme = "orange";
    }

    const settings = {
        theme: theme,
        incognito: formData.get("incognito") === "yes" ? true : false,
    };
    chrome.runtime.sendMessage({ message: "save", settings });
    chrome.action.setIcon({ path: `images/favicon/${theme}.png` });
});

// TODO: Set to current settings on load