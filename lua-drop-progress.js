(() => {
  "use strict";

  const OVERLAY_ID = "tns-import-progress-overlay";
  const STYLE_ID = "tns-import-progress-style";
  const LOG_SELECTOR = "#xml-log";
  const STEPPER_SRC = "./import-progress-stepper.js?v=20260827-import-stepper-v7";

  let stepperPromise = null;
  let lastLogText = "";
  let current = null;

  function ensureStepper() {
    if (document.getElementById(STYLE_ID)) return Promise.resolve();
    if (stepperPromise) return stepperPromise;

    stepperPromise = new Promise((resolve) => {
      let script = document.querySelector('script[data-import-progress-stepper="true"]');
      const waitForStyle = async () => {
        for (let i = 0; i < 60 && !document.getElementById(STYLE_ID); i += 1) {
          await new Promise((done) => setTimeout(done, 30));
        }
        resolve();
      };

      if (script) {
        if (document.getElementById(STYLE_ID) || script.dataset.loaded === "1") {
          waitForStyle();
          return;
        }
        script.addEventListener("load", () => {
          script.dataset.loaded = "1";
          waitForStyle();
        }, { once: true });
        script.addEventListener("error", resolve, { once: true });
        setTimeout(waitForStyle, 1800);
        return;
      }

      script = document.createElement("script");
      script.src = STEPPER_SRC;
      script.dataset.importProgressStepper = "true";
      script.addEventListener("load", () => {
        script.dataset.loaded = "1";
        waitForStyle();
      }, { once: true });
      script.addEventListener("error", resolve, { once: true });
      document.head.appendChild(script);
    });

    return stepperPromise;
  }

  function stripTimestamp(line) {
    return String(line || "").replace(/^\s*\[[^\]]+\]\s*/, "").trim();
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char]));
  }

  function removeOldOverlay() {
    const old = document.getElementById(OVERLAY_ID);
    if (!old) return;
    old.remove();
    document.documentElement.classList.remove("tns-import-progress-lock");
  }

  function stepMarkup(number, title, status, detail, state, withMeter = false) {
    return `
      <div class="tns-import-step ${state}" data-step="${number}">
        <div class="tns-import-step-circle">${state === "completed" ? "✓" : number}</div>
        ${number < 3 ? '<div class="tns-import-step-line"></div>' : ""}
        <div class="tns-import-step-content">
          <div class="tns-import-step-topline">
            <div class="tns-import-step-title">${title}</div>
            <div class="tns-import-step-status">${status}</div>
          </div>
          <div class="tns-import-step-detail">${detail}</div>
          ${withMeter ? '<div class="tns-import-progress-meter"><span></span></div>' : ""}
        </div>
      </div>`;
  }

  function createOverlay(name) {
    removeOldOverlay();
    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.className = "tns-import-progress-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Importando Lua");
    overlay.dataset.luaDropProgress = "1";
    overlay.dataset.canClose = "0";
    overlay.innerHTML = `
      <section class="tns-import-progress-card">
        <div class="tns-import-progress-head">
          <div>
            <div class="tns-import-progress-kicker">Procesando</div>
            <h2>Importando Lua</h2>
            <p>Se crea la misma Lua ScriptApp de +Page y el código de ejemplo se reemplaza por el archivo arrastrado.</p>
          </div>
          <div class="tns-import-progress-icon" aria-hidden="true">{ }</div>
        </div>
        ${stepMarkup(1, "Leer archivo Lua", "Listo", escapeHtml(name || "Archivo Lua leído."), "completed")}
        ${stepMarkup(2, "Crear Lua ScriptApp", "En curso", "Creando la nueva card ScriptApp…", "active", true)}
        ${stepMarkup(3, "Aplicar contenido", "Pendiente", "Esperando para reemplazar el código de ejemplo.", "pending")}
        <div class="tns-import-progress-summary"><strong>Importación en curso.</strong><br>${escapeHtml(name || "Archivo Lua")}</div>
        <div class="tns-import-progress-actions"><button type="button" class="tns-import-progress-close">Cerrar</button></div>
      </section>`;

    const closeButton = overlay.querySelector(".tns-import-progress-close");
    const close = () => {
      if (overlay.dataset.canClose !== "1") return;
      overlay.classList.add("closing");
      document.documentElement.classList.remove("tns-import-progress-lock");
      setTimeout(() => overlay.remove(), 230);
    };
    closeButton?.addEventListener("click", close);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });

    document.body.appendChild(overlay);
    document.documentElement.classList.add("tns-import-progress-lock");
    requestAnimationFrame(() => overlay.classList.add("visible"));
    return overlay;
  }

  function setStep(overlay, number, state, status, detail) {
    const step = overlay?.querySelector(`.tns-import-step[data-step="${number}"]`);
    if (!step) return;
    step.classList.remove("pending", "active", "completed", "error");
    step.classList.add(state);
    const circle = step.querySelector(".tns-import-step-circle");
    const statusEl = step.querySelector(".tns-import-step-status");
    const detailEl = step.querySelector(".tns-import-step-detail");
    if (circle) circle.textContent = state === "completed" ? "✓" : state === "error" ? "!" : String(number);
    if (statusEl) statusEl.textContent = status;
    if (detailEl) detailEl.textContent = detail;
  }

  async function renderCurrent() {
    if (!current) return;
    await ensureStepper();
    if (!current) return;

    let overlay = document.querySelector(`#${OVERLAY_ID}[data-lua-drop-progress="1"]`);
    if (!overlay || overlay.dataset.luaName !== current.name) {
      overlay = createOverlay(current.name);
      overlay.dataset.luaName = current.name;
    }

    if (current.state === "running") return;

    if (current.state === "done") {
      setStep(overlay, 2, "completed", "Listo", "Lua ScriptApp creada.");
      setStep(overlay, 3, "completed", "Listo", "Código importado aplicado; el código de ejemplo fue reemplazado.");
      const meter = overlay.querySelector('.tns-import-step[data-step="2"] .tns-import-progress-meter > span');
      if (meter) meter.style.width = "100%";
      const summary = overlay.querySelector(".tns-import-progress-summary");
      if (summary) summary.innerHTML = `<strong>Importación completada.</strong><br>${escapeHtml(current.name)}`;
    } else {
      setStep(overlay, 2, "error", "Error", "No se pudo completar la creación o la escritura de la ScriptApp.");
      setStep(overlay, 3, "error", "Error", current.message || "La importación Lua falló.");
      const summary = overlay.querySelector(".tns-import-progress-summary");
      if (summary) summary.innerHTML = `<strong>La importación terminó con un error.</strong><br>${escapeHtml(current.message || "Error desconocido")}`;
    }

    overlay.dataset.canClose = "1";
    overlay.querySelector(".tns-import-progress-close")?.classList.add("visible");
  }

  function begin(name) {
    current = { name: name || "Archivo Lua", state: "running", message: "" };
    renderCurrent();
  }

  function complete(name) {
    if (!current || (name && current.name !== name)) current = { name: name || "Archivo Lua", state: "done", message: "" };
    else current.state = "done";
    renderCurrent();
  }

  function fail(message) {
    if (!current) return;
    current.state = "error";
    current.message = message || "La importación Lua falló.";
    renderCurrent();
  }

  function handleLine(rawLine) {
    const line = stripTimestamp(rawLine);
    if (!line) return;
    let match = line.match(/^Lua:\s*importando\s+(.+?)\s+como nueva card ScriptApp\.\.\.$/i);
    if (match) {
      begin(match[1]);
      return;
    }
    match = line.match(/^Lua importado:\s*(.+?)\s+reemplazó el código de ejemplo en la nueva card ScriptApp\.$/i);
    if (match) {
      complete(match[1]);
      return;
    }
    if (/^ERROR importando archivo arrastrado:/i.test(line)) {
      fail(line.replace(/^ERROR importando archivo arrastrado:\s*/i, ""));
    }
  }

  function consumeLogChanges(logEl) {
    const text = String(logEl.textContent || "");
    const delta = text.startsWith(lastLogText) ? text.slice(lastLogText.length) : text;
    lastLogText = text;
    delta.split(/\r?\n/).forEach(handleLine);
  }

  function observeLog() {
    const logEl = document.querySelector(LOG_SELECTOR);
    if (!logEl || logEl.dataset.luaDropProgressObserved === "1") return false;
    logEl.dataset.luaDropProgressObserved = "1";
    lastLogText = String(logEl.textContent || "");
    const observer = new MutationObserver(() => consumeLogChanges(logEl));
    observer.observe(logEl, { childList: true, subtree: true, characterData: true });
    return true;
  }

  function install() {
    ensureStepper();
    observeLog();
    const retry = setInterval(() => {
      if (observeLog()) clearInterval(retry);
    }, 120);
    setTimeout(() => clearInterval(retry), 20000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
