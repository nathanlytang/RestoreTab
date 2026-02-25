const syncStorage = chrome.storage.sync;
let optSettings = null;

(async () => {
    optSettings = (await syncStorage.get("settings")).settings;
    if (!optSettings) return;
    const settingsElement = document.getElementById("settings");

    settingsElement.theme_setting.value = optSettings.theme;
    settingsElement.incognito_setting.value = optSettings.incognito ? "yes" : "no";
    settingsElement.incognito_only_setting.value = optSettings.incognitoOnly ? "yes" : "no";
    settingsElement.discard_all_setting.value = optSettings.discardAll ? "yes" : "no";
})();

document.getElementById("save").addEventListener("click", () => {
    const formData = new FormData(document.forms.settings);

    let theme = formData.get("theme");
    if (!theme) {
        theme = "orange";
    }

    const settings = {
        theme: theme,
        incognito: formData.get("incognito") === "yes" ? true : false,
        incognitoOnly: formData.get("incognito_only") === "yes" ? true : false,
        discardAll: formData.get("discard_all") === "yes" ? true : false,
    };

    chrome.runtime.sendMessage({ message: "save", settings });
    chrome.action.setIcon({ path: `images/favicon/${theme}.png` });
});
