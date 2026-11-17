// Dia ignores chrome_url_overrides, so redirect its new-tab page ourselves.
const PAGE = chrome.runtime.getURL("index.html");
const isNewTab = (url) =>
  !!url && /^(chrome|dia|edge|about|chrome-search):\/*(newtab|new-tab|local-ntp|start-page)/i.test(url);

function check(tabId, url) {
  console.log("tab", tabId, url); // open the service worker console to see Dia's real new-tab URL
  if (isNewTab(url)) chrome.tabs.update(tabId, { url: PAGE });
}

chrome.tabs.onCreated.addListener((tab) => check(tab.id, tab.pendingUrl || tab.url));
chrome.tabs.onUpdated.addListener((tabId, info) => { if (info.url) check(tabId, info.url); });
