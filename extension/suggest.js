// Suggestions while typing (history + Google), and a working mic button.
(() => {
  const form = document.querySelector("form.composer");
  const box = form.querySelector("textarea");
  const go = (text) => form.dispatchEvent(new CustomEvent("chat:submit", { detail: { text } }));

  // ---- dropdown ----
  const list = document.createElement("div");
  list.id = "suggest";
  Object.assign(list.style, {
    position: "fixed", zIndex: 50, display: "none", padding: "6px",
    background: "rgba(20,20,24,.78)", backdropFilter: "blur(24px) saturate(1.4)",
    WebkitBackdropFilter: "blur(24px) saturate(1.4)", border: "1px solid rgba(255,255,255,.12)",
    borderRadius: "16px", font: "14px Geist, system-ui, sans-serif", color: "#eee",
    boxShadow: "0 12px 40px rgba(0,0,0,.45)",
  });
  document.body.append(list);

  let items = [], sel = -1, seq = 0, typed = "";

  function place() {
    const r = form.getBoundingClientRect();
    Object.assign(list.style, { left: r.left + "px", top: r.bottom + 8 + "px", width: r.width + "px" });
  }
  function hide() { list.style.display = "none"; items = []; sel = -1; }
  function render() {
    list.replaceChildren(...items.map((it, i) => {
      const row = document.createElement("div");
      Object.assign(row.style, {
        display: "flex", gap: "10px", alignItems: "center", padding: "8px 10px",
        borderRadius: "10px", cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden",
        background: i === sel ? "rgba(255,255,255,.12)" : "transparent",
      });
      const icon = document.createElement("span");
      icon.textContent = it.url ? "↗" : "⌕";
      icon.style.opacity = ".55";
      const label = document.createElement("span");
      label.textContent = it.title || it.text;
      label.style.overflow = "hidden"; label.style.textOverflow = "ellipsis";
      row.append(icon, label);
      if (it.url) {
        const u = document.createElement("span");
        u.textContent = new URL(it.url).hostname.replace(/^www\./, "");
        u.style.opacity = ".45"; u.style.marginLeft = "auto"; u.style.fontSize = "12px";
        row.append(u);
      }
      row.addEventListener("mousedown", (e) => { e.preventDefault(); pick(it); });
      row.addEventListener("mouseenter", () => { sel = i; render(); });
      return row;
    }));
    if (items.length) { place(); list.style.display = "block"; } else hide();
  }
  function pick(it) {
    hide();
    if (it.url) location.href = it.url; else go(it.text);
  }

  async function update() {
    const q = box.value.trim();
    typed = box.value;
    const my = ++seq;
    if (!q) return hide();
    const [hist, web] = await Promise.all([
      chrome.history.search({ text: q, maxResults: 20 }).catch(() => []),
      fetch("https://suggestqueries.google.com/complete/search?client=chrome&q=" + encodeURIComponent(q))
        .then((r) => r.json()).then((d) => d[1] || []).catch(() => []),
    ]);
    if (my !== seq) return; // a newer keystroke already started
    const h = hist.filter((x) => x.title).sort((a, b) => b.visitCount - a.visitCount).slice(0, 3)
      .map((x) => ({ url: x.url, title: x.title }));
    const w = web.filter((s) => s.toLowerCase() !== q.toLowerCase()).slice(0, 6 - h.length)
      .map((text) => ({ text }));
    items = [...h, ...w]; sel = -1; render();
  }

  box.addEventListener("input", update);
  box.addEventListener("blur", () => setTimeout(hide, 100));
  window.addEventListener("resize", () => list.style.display !== "none" && place());

  // Runs before the page's own keydown handler, so it can take over Enter.
  box.addEventListener("keydown", (e) => {
    if (!items.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = items.length;
      sel = e.key === "ArrowDown" ? (sel + 1 >= n ? -1 : sel + 1) : (sel - 1 < -1 ? n - 1 : sel - 1);
      box.value = sel >= 0 && !items[sel].url ? items[sel].text : typed;
      render();
    } else if (e.key === "Enter" && !e.shiftKey && sel >= 0) {
      e.preventDefault(); e.stopImmediatePropagation();
      pick(items[sel]);
    } else if (e.key === "Escape") {
      hide(); box.value = typed;
    }
  });

  // ---- mic: speech to text, then search ----
  const mic = form.querySelector(".icon-btn[aria-label='Voice input']");
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  // Chromium browsers other than Chrome (Dia, Arc, Brave...) can't reach Google's speech service
  // and fail with "network". Once that happens, hide the mic for good.
  const NO_VOICE = "ascii-animals:no-voice";
  if (mic && (!SR || localStorage.getItem(NO_VOICE))) mic.hidden = true;
  else if (mic && SR) {
    let rec = null;
    mic.addEventListener("click", () => {
      if (rec) return rec.stop();
      rec = new SR();
      rec.lang = navigator.language;
      rec.interimResults = true;
      mic.style.color = "#ff5f6d";
      rec.onresult = (e) => {
        const r = e.results[e.results.length - 1];
        box.value = Array.from(e.results).map((x) => x[0].transcript).join("");
        box.dispatchEvent(new Event("input"));
        if (r.isFinal) { rec.stop(); setTimeout(() => box.value.trim() && form.requestSubmit(), 300); }
      };
      rec.onerror = (e) => {
        console.warn("voice:", e.error);
        const why = {
          "not-allowed": "Microphone blocked: allow it from the icon left of the address bar",
          "service-not-allowed": "Microphone blocked: allow it from the icon left of the address bar",
          network: "Voice input isn't available in this browser",
          "no-speech": "Didn't hear anything, try again",
          "audio-capture": "No microphone found",
        }[e.error] || `Voice input failed (${e.error})`;
        const placeholder = box.placeholder;
        box.placeholder = why;
        if (e.error === "network") {
          localStorage.setItem(NO_VOICE, "1");
          mic.hidden = true;
        }
        setTimeout(() => (box.placeholder = placeholder), 4000);
      };
      rec.onend = () => { rec = null; mic.style.color = ""; };
      rec.start();
    });
  }
})();
