// "Add tabs or files": jump to an open tab, or open a local file.
(() => {
  const btn = document.querySelector(".composer .pill");
  if (!btn) return;
  const menu = document.createElement("div");
  Object.assign(menu.style, {
    position: "fixed", zIndex: 60, display: "none", padding: "6px", maxHeight: "50vh", overflowY: "auto",
    background: "rgba(20,20,24,.82)", backdropFilter: "blur(24px) saturate(1.4)",
    WebkitBackdropFilter: "blur(24px) saturate(1.4)", border: "1px solid rgba(255,255,255,.12)",
    borderRadius: "16px", font: "14px Geist, system-ui, sans-serif", color: "#eee",
    boxShadow: "0 12px 40px rgba(0,0,0,.45)", width: "340px",
  });
  document.body.append(menu);
  const picker = Object.assign(document.createElement("input"), { type: "file", hidden: true });
  document.body.append(picker);
  picker.addEventListener("change", () => {
    const f = picker.files[0];
    if (f) location.href = URL.createObjectURL(f);
  });

  function row(iconSrc, text, onClick) {
    const r = document.createElement("div");
    Object.assign(r.style, { display: "flex", gap: "10px", alignItems: "center", padding: "8px 10px",
      borderRadius: "10px", cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden" });
    r.onmouseenter = () => (r.style.background = "rgba(255,255,255,.12)");
    r.onmouseleave = () => (r.style.background = "transparent");
    const ic = iconSrc ? Object.assign(document.createElement("img"), { src: iconSrc, width: 16, height: 16 })
      : Object.assign(document.createElement("span"), { textContent: "📄" });
    ic.onerror = () => (ic.style.visibility = "hidden");
    const t = Object.assign(document.createElement("span"), { textContent: text });
    t.style.overflow = "hidden"; t.style.textOverflow = "ellipsis";
    r.append(ic, t);
    r.addEventListener("click", () => { hide(); onClick(); });
    return r;
  }
  function hide() { menu.style.display = "none"; }

  async function show() {
    const me = await chrome.tabs.getCurrent();
    const tabs = (await chrome.tabs.query({})).filter((t) => t.id !== me?.id && /^https?:/.test(t.url || ""));
    const header = Object.assign(document.createElement("div"), { textContent: "Open tabs" });
    Object.assign(header.style, { opacity: ".5", fontSize: "12px", padding: "6px 10px 4px" });
    menu.replaceChildren(
      row(null, "Open a file…", () => picker.click()),
      ...(tabs.length ? [header] : []),
      ...tabs.map((t) => row(t.favIconUrl, t.title || t.url, async () => {
        await chrome.tabs.update(t.id, { active: true });
        await chrome.windows.update(t.windowId, { focused: true });
      })),
    );
    const r = btn.getBoundingClientRect();
    Object.assign(menu.style, { left: r.left + "px", top: r.bottom + 8 + "px", display: "block" });
  }

  btn.addEventListener("click", (e) => { e.stopPropagation(); menu.style.display === "block" ? hide() : show(); });
  document.addEventListener("click", (e) => { if (!menu.contains(e.target)) hide(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") hide(); });
})();
