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
    const pyLog = document.querySelector("#py-log");

    if (mainLog) buildTerminal(mainLog, "Main Log");
    if (xmlLog) buildTerminal(xmlLog, "XML Log");
    if (pyLog) buildTerminal(pyLog, "PY Log");
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

  function wrapLuaLogs() {
    const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");

    headings.forEach((heading) => {
      const text = normalizeText(heading.textContent);
      if (text !== "log lua" && text !== "lua log") return;

      const pre = findFollowingPre(heading);
      if (pre) buildTerminal(pre, "Lua Log");
    });
  }

  function scan() {
    wrapStaticLogs();
    wrapLuaLogs();
  }

  function start() {
    scan();

    let scanQueued = false;
    const observer = new MutationObserver((mutations) => {
      const hasNewElements = mutations.some((mutation) =>
        Array.from(mutation.addedNodes).some((node) => node instanceof HTMLElement)
      );

      if (!hasNewElements || scanQueued) return;

      scanQueued = true;
      requestAnimationFrame(() => {
        scanQueued = false;
        scan();
      });
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

// CAS Preview load order matters: install the hybrid lower-runtime wrapper first,
// then load the stable Giac bridge. Giac will call through the hybrid layer with
// its __tnsCasEval/__tnsCasEvalStr bindings, allowing Giac/SymPy/own fallbacks
// without changing the Lua stored in the TNS document.
(() => {
  function loadScript(src, datasetKey) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-${datasetKey}="true"]`);
      if (existing) {
        if (existing.dataset.loaded === "true") resolve();
        else existing.addEventListener("load", resolve, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.dataset[datasetKey.replace(/-([a-z])/g, (_m, c) => c.toUpperCase())] = "true";
      script.addEventListener("load", () => {
        script.dataset.loaded = "true";
        resolve();
      }, { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.appendChild(script);
    });
  }

  async function loadCasPreviewBridge() {
    if (window.__tnsCasPreviewBridgeInstalled) return;
    try {
      if (!window.__tnsCasHybridInstalled) {
        await loadScript("./ti-cas-hybrid-fallback-v2.js?v=20260903-ti-cas-hybrid-v2", "ti-cas-hybrid");
      }
      if (!window.__tnsCasPreviewBridgeInstalled) {
        await loadScript("./ti-cas-preview-bridge-v3.js?v=20260903-giac-preview-v3", "ti-cas-preview-bridge");
      }
    } catch (error) {
      console.warn("No se pudo cargar CAS Preview híbrido.", error);
    }
  }

  if (document.readyState === "complete") loadCasPreviewBridge();
  else window.addEventListener("load", loadCasPreviewBridge, { once: true });
})();
