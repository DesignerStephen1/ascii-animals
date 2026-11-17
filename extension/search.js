// Turn the chat box into a real search bar.
// URLs open directly; anything else goes to the browser's default search engine.
document.querySelector("form.composer").addEventListener("chat:submit", (e) => {
  const text = e.detail.text.trim();
  if (!text) return;
  const looksLikeUrl = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/i.test(text) && !/\s/.test(text);
  if (looksLikeUrl) {
    location.href = /^https?:\/\//i.test(text) ? text : "https://" + text;
  } else {
    chrome.search.query({ text, disposition: "CURRENT_TAB" });
  }
});

// Focus the box on load so you can type right away.
const box = document.querySelector("form.composer textarea");
box.autofocus = true;
box.focus();
window.addEventListener("load", () => box.focus());

// Look like a normal new tab in the tab strip.
document.title = "New Tab";
