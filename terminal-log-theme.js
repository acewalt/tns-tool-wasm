(() => {
  const WRAPPED_ATTR = "data-terminal-log-wrapped";

  function normalizeText(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function buildTerminal(pre, label) {
    if (!(pre instanceof HTMLElement)) return;
    if (pre.getAttribute(WRAPPED_ATTR) === "true") return;

    pre.setAttribute(WRAPPED_ATTR, "true");
    pre.setAttribute("data-terminal-log", "true");

    const shell = document.createElement("div");
    shell.className = "terminal-log-window";
    shell.dataset.terminalFor = pre.id || label.toLowerCase();

    const toolbar = document.createElement("div");
    toolbar.className = "terminal-log-toolbar";
    toolbar.setAttribute("aria-hidden", "true");
    toolbar.innerHTML = `
      <div class="terminal-log-dots">
        <span class="terminal-log-dot red"></span>
        <span class="terminal-log-dot yellow"></span>
        <span class="terminal-log-dot green"></span>
      </div>
      <p class="terminal-log-user">tns@tool: ~ · ${label}</p>
      <span class="terminal-log-add-tab">+</span>
    `;

    const body = document.createElement("div");
    body.className = "terminal-log-body";

    const prompt = document.createElement("div");
    prompt.className = "terminal-log-prompt";
    prompt.setAttribute("aria-hidden", "true");
    prompt.innerHTML = `
      <span class="terminal-log-prompt-user">tns@tool:</span>
      <span class="terminal-log-prompt-location">~</span>
      <span class="terminal-log-prompt-symbol">$</span>
      <span class="terminal-log-cursor"></span>
    `;

    const parent = pre.parentNode;
    if (!parent) return;

    parent.insertBefore(shell, pre);
    shell.appendChild(toolbar);
    shell.appendChild(body);
    body.appendChild(prompt);
    body.appendChild(pre);
  }

  function wrapStaticLogs() {
    const mainLog = document.querySelector("#log");
    const xmlLog = document.querySelector("#xml-log");

    if (mainLog) buildTerminal(mainLog, "Main Log");
    if (xmlLog) buildTerminal(xmlLog, "XML Log");
  }

  function findFollowingPre(heading) {
    let node = heading.nextElementSibling;

    while (node) {
      if (node.matches?.("pre")) return node;
      if (node.querySelector) {
        const nestedPre = node.querySelector("pre");
        if (nestedPre) return nestedPre;
      }
      node = node.nextElementSibling;
    }

    return null;
  }

  function wrapLuaLogs(root = document) {
    const headings = root.querySelectorAll?.("h1, h2, h3, h4, h5, h6") || [];

    headings.forEach((heading) => {
      const text = normalizeText(heading.textContent);
      if (text !== "log lua" && text !== "lua log") return;

      const pre = findFollowingPre(heading);
      if (pre) buildTerminal(pre, "Lua Log");
    });
  }

  function scan(root = document) {
    wrapStaticLogs();
    wrapLuaLogs(root);
  }

  function start() {
    scan(document);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          scan(node);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
