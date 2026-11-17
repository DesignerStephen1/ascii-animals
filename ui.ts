/**
 * Page chrome shared by every scene: glass segmented choices and the chat composer.
 */
/** A greeting by the local time: "Good morning, Stephen" … "Still up, Stephen?" after 10pm. */
export function greetingFor(name: string, date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 12) return `Good morning, ${name}`;
  if (h >= 12 && h < 17) return `Good afternoon, ${name}`;
  if (h >= 17 && h < 22) return `Good evening, ${name}`;
  return `Still up, ${name}?`;
}

/**
 * Greet by the time of day, and keep it current if the page stays open.
 * Double-click the greeting to type your own name (Enter saves, Esc cancels);
 * `onRename` gets the new name so the caller can save it.
 */
export function mountGreeting(name: string, onRename?: (name: string) => void) {
  const el = document.querySelector<HTMLElement>(".greeting");
  if (!el) return;
  let editing = false;
  const update = () => {
    if (!editing) el.textContent = greetingFor(name);
  };
  update();
  setInterval(update, 60_000);
  if (!onRename) return;

  // The masthead lets clicks through to the animals; take them back on the greeting itself.
  el.style.pointerEvents = "auto";
  el.title = "Double-click to change the name";
  el.addEventListener("dblclick", () => {
    editing = true;
    el.textContent = name;
    el.contentEditable = "plaintext-only";
    el.focus();
    getSelection()?.selectAllChildren(el);
  });
  const finish = (save: boolean) => {
    if (!editing) return;
    editing = false;
    el.contentEditable = "false";
    const next = el.textContent?.trim() ?? "";
    if (save && next && next !== name) {
      name = next;
      onRename(name);
    }
    update();
  };
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter") (e.preventDefault(), finish(true));
    else if (e.key === "Escape") finish(false);
  });
  el.addEventListener("blur", () => finish(true));
}

/** UI only: a submit fires a `chat:submit` event on the form for whatever backend gets wired up. */
export function mountComposer() {
  const form = document.querySelector<HTMLFormElement>(".composer")!;
  const prompt = form.querySelector("textarea")!;
  const send = form.querySelector<HTMLButtonElement>(".send")!;

  function fit() {
    prompt.style.height = "auto";
    prompt.style.height = `${prompt.scrollHeight}px`;
    // Scroll only once it hits its max height; below that it just grows.
    prompt.style.overflowY = prompt.scrollHeight > prompt.clientHeight + 1 ? "auto" : "hidden";
    send.disabled = prompt.value.trim() === "";
  }

  prompt.addEventListener("input", fit);
  // Ready to type on load where there's a mouse; on a phone that would throw the keyboard up.
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) prompt.focus({ preventScroll: true });
  prompt.addEventListener("keydown", (e) => {
    // Enter sends, Shift+Enter is a newline; leave Enter alone mid-IME composition.
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = prompt.value.trim();
    if (!text) return;
    form.dispatchEvent(new CustomEvent("chat:submit", { detail: { text } }));
    prompt.value = "";
    fit();
  });
}

export interface Choice {
  value: string;
  label: string;
  /** CSS colour for a dot before the label; none if left out. */
  swatch?: string;
}

/**
 * A glass segmented control in `host` (a radiogroup): every choice in a row, with a thumb that slides
 * under the current one. Arrow keys move between them; the row scrolls sideways if it doesn't fit.
 */
export function mountChoices(host: HTMLElement, choices: Choice[], current: string, onPick: (value: string) => void) {
  const thumb = document.createElement("span");
  thumb.className = "thumb";
  thumb.setAttribute("aria-hidden", "true");
  host.append(thumb);

  const buttons = choices.map((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "radio");
    b.dataset.value = c.value;
    const dot = c.swatch ? `<span class="dot" style="--swatch: ${c.swatch}" aria-hidden="true"></span>` : "";
    b.innerHTML = `${dot}<span>${c.label}</span>`;
    b.addEventListener("click", () => select(c.value, true));
    host.append(b);
    return b;
  });

  function place() {
    const b = buttons.find((x) => x.getAttribute("aria-checked") === "true");
    if (!b) return;
    thumb.style.translate = `${b.offsetLeft}px 0`;
    thumb.style.width = `${b.offsetWidth}px`;
  }

  function select(value: string, pick: boolean) {
    for (const b of buttons) {
      const on = b.dataset.value === value;
      b.setAttribute("aria-checked", String(on));
      b.tabIndex = on ? 0 : -1;
      if (on) b.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
    place();
    if (pick) onPick(value);
  }

  host.addEventListener("keydown", (e) => {
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0 || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
    e.preventDefault();
    const next = buttons[(at + (e.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length];
    next.focus();
    select(next.dataset.value!, true);
  });

  select(current, false);
  // Labels change width once the webfont arrives, and when the window resizes.
  document.fonts?.ready.then(place);
  window.addEventListener("resize", place);
}
