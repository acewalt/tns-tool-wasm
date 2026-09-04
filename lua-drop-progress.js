(() => {
  "use strict";

  const OVERLAY_ID = "tns-import-progress-overlay";
  const STYLE_ID = "tns-import-progress-style";
  const LOG_SELECTOR = "#xml-log";
  const STEPPER_SRC = "./import-progress-stepper.js?v=20260827-import-stepper-v7";
  const COMPAT_JS = "./lua-compatibility-report.js?v=20260903-lua-compat-v1";
  const COMPAT_CSS = "./lua-compatibility-report.css?v=20260903-lua-compat-v1";

  let stepperPromise = null;
  let compatibilityPromise = null;
  let lastLogText = "";
  let current = null;
  const luaSources = new Map();

  const NEW_TEXT = {
    es: {
      analyze: "Analizar compatibilidad",
      analyzingStatus: "Analizando",
      analyzing: "Revisando APIs, llamadas CAS y eventos…",
      analyzedStatus: "Listo",
      analyzed: (a, c, w) => `${a} APIs · ${c} llamadas CAS · ${w} avisos`,
      unavailable: "No se pudo recuperar el código fuente para analizarlo.",
      summaryAnalyzing: "Importación completada. Analizando compatibilidad…",
      viewReport: "Ver informe",
      ti: "TI-Nspire",
      preview: "Preview",
      cas: "CAS",
      ready: "Listo",
      review: "Revisar",
      hybrid: "Híbrido",
      none: "Sin CAS",
      lines: "líneas",
      chars: "caracteres"
    },
    en: {
      analyze: "Analyze compatibility",
      analyzingStatus: "Checking",
      analyzing: "Scanning APIs, CAS calls, and events…",
      analyzedStatus: "Ready",
      analyzed: (a, c, w) => `${a} APIs · ${c} CAS calls · ${w} warnings`,
      unavailable: "The source code could not be recovered for analysis.",
      summaryAnalyzing: "Import completed. Analyzing compatibility…",
      viewReport: "View report",
      ti: "TI-Nspire",
      preview: "Preview",
      cas: "CAS",
      ready: "Ready",
      review: "Review",
      hybrid: "Hybrid",
      none: "No CAS",
      lines: "lines",
      chars: "characters"
    },
    fr: {
      analyze: "Analyser la compatibilité",
      analyzingStatus: "Analyse",
      analyzing: "Analyse des API, appels CAS et événements…",
      analyzedStatus: "Prêt",
      analyzed: (a, c, w) => `${a} API · ${c} appels CAS · ${w} avertissements`,
      unavailable: "Le code source n’a pas pu être récupéré pour l’analyse.",
      summaryAnalyzing: "Importation terminée. Analyse de compatibilité…",
      viewReport: "Voir le rapport",
      ti: "TI-Nspire",
      preview: "Preview",
      cas: "CAS",
      ready: "Prêt",
      review: "À vérifier",
      hybrid: "Hybride",
      none: "Sans CAS",
      lines: "lignes",
      chars: "caractères"
    }
  };

  function language() {
    const active = document.querySelector("#language-buttons button.active[data-lang]")?.dataset.lang;
    if (["es", "en", "fr"].includes(active)) return active;
    const html = String(document.documentElement.lang || "").slice(0, 2).toLowerCase();
    return ["es", "en", "fr"].includes(html) ? html : "es";
  }

  function tx() { return NEW_TEXT[language()] || NEW_TEXT.es; }

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
        script.addEventListener("load", () => { script.dataset.loaded = "1"; waitForStyle(); }, { once: true });
        script.addEventListener("error", resolve, { once: true });
        setTimeout(waitForStyle, 1800);
        return;
      }

      script = document.createElement("script");
      script.src = STEPPER_SRC;
      script.dataset.importProgressStepper = "true";
      script.addEventListener("load", () => { script.dataset.loaded = "1"; waitForStyle(); }, { once: true });
      script.addEventListener("error", resolve, { once: true });
      document.head.appendChild(script);
    });

    return stepperPromise;
  }

  function ensureCompatibility() {
    if (window.TnsLuaCompatibility?.analyze) return Promise.resolve(window.TnsLuaCompatibility);
    if (compatibilityPromise) return compatibilityPromise;

    if (!document.querySelector('link[data-lua-compatibility-report-style="true"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = COMPAT_CSS;
      link.dataset.luaCompatibilityReportStyle = "true";
      document.head.appendChild(link);
    }

    compatibilityPromise = new Promise((resolve) => {
      let script = document.querySelector('script[data-lua-compatibility-report="true"]');
      const finish = () => resolve(window.TnsLuaCompatibility || null);
      if (script) {
        if (window.TnsLuaCompatibility?.analyze || script.dataset.loaded === "1") { finish(); return; }
        script.addEventListener("load", () => { script.dataset.loaded = "1"; finish(); }, { once: true });
        script.addEventListener("error", finish, { once: true });
        setTimeout(finish, 1800);
        return;
      }
      script = document.createElement("script");
      script.src = COMPAT_JS;
      script.dataset.luaCompatibilityReport = "true";
      script.addEventListener("load", () => { script.dataset.loaded = "1"; finish(); }, { once: true });
      script.addEventListener("error", finish, { once: true });
      document.head.appendChild(script);
    });
    return compatibilityPromise;
  }

  function stripTimestamp(line) { return String(line || "").replace(/^\s*\[[^\]]+\]\s*/, "").trim(); }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
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
        ${number < 4 ? '<div class="tns-import-step-line"></div>' : ""}
        <div class="tns-import-step-content">
          <div class="tns-import-step-topline"><div class="tns-import-step-title">${title}</div><div class="tns-import-step-status">${status}</div></div>
          <div class="tns-import-step-detail">${detail}</div>
          ${withMeter ? '<div class="tns-import-progress-meter"><span></span></div>' : ""}
        </div>
      </div>`;
  }

  function createOverlay(name) {
    removeOldOverlay();
    const nt = tx();
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
          <div><div class="tns-import-progress-kicker">Procesando</div><h2>Importando Lua</h2><p>Se crea la misma Lua ScriptApp de +Page y el código de ejemplo se reemplaza por el archivo arrastrado.</p></div>
          <div class="tns-import-progress-icon" aria-hidden="true">{ }</div>
        </div>
        ${stepMarkup(1, "Leer archivo Lua", "Listo", escapeHtml(name || "Archivo Lua leído."), "completed")}
        ${stepMarkup(2, "Crear Lua ScriptApp", "En curso", "Creando la nueva card ScriptApp…", "active", true)}
        ${stepMarkup(3, "Aplicar contenido", "Pendiente", "Esperando para reemplazar el código de ejemplo.", "pending")}
        ${stepMarkup(4, escapeHtml(nt.analyze), "Pendiente", escapeHtml(nt.analyzing), "pending")}
        <div class="tns-import-progress-summary"><strong>Importación en curso.</strong><br>${escapeHtml(name || "Archivo Lua")}</div>
        <div class="tns-import-progress-actions"><button type="button" class="tns-import-progress-report">${escapeHtml(nt.viewReport)}</button><button type="button" class="tns-import-progress-close">Cerrar</button></div>
      </section>`;

    const closeButton = overlay.querySelector(".tns-import-progress-close");
    const close = () => {
      if (overlay.dataset.canClose !== "1") return;
      overlay.classList.add("closing");
      document.documentElement.classList.remove("tns-import-progress-lock");
      setTimeout(() => overlay.remove(), 230);
    };
    closeButton?.addEventListener("click", close);
    overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });
    overlay.querySelector(".tns-import-progress-report")?.addEventListener("click", () => {
      if (current?.analysis && window.TnsLuaCompatibility?.showReport) window.TnsLuaCompatibility.showReport(current.analysis);
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

  function statusChip(label, state, value) {
    return `<span class="tns-import-progress-chip ${escapeHtml(state)}"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></span>`;
  }

  function renderSummary(overlay, report) {
    const nt = tx();
    const summary = overlay.querySelector(".tns-import-progress-summary");
    if (!summary) return;
    const formatter = window.TnsLuaCompatibility?.formatBytes || ((n) => `${n} B`);
    summary.innerHTML = `
      <strong>Importación completada.</strong><br>${escapeHtml(current.name)}
      <div class="tns-import-progress-meta">${report.lines} ${escapeHtml(nt.lines)} · ${report.chars} ${escapeHtml(nt.chars)} · ${escapeHtml(formatter(report.bytes))}</div>
      <div class="tns-import-progress-compat">
        ${statusChip(nt.ti, report.status.ti, report.status.ti === "ready" ? nt.ready : nt.review)}
        ${statusChip(nt.preview, report.status.preview, report.status.preview === "ready" ? nt.ready : nt.review)}
        ${statusChip(nt.cas, report.status.cas, report.status.cas === "hybrid" ? nt.hybrid : nt.none)}
      </div>`;
  }

  function sourceFor(name) {
    if (luaSources.has(name)) return luaSources.get(name);
    const last = window.__tnsLastLuaImportSource;
    if (last?.name === name && typeof last.code === "string") return last;
    return null;
  }

  async function finalizeDone(overlay) {
    const nt = tx();
    setStep(overlay, 2, "completed", "Listo", "Lua ScriptApp creada.");
    setStep(overlay, 3, "completed", "Listo", "Código importado aplicado; el código de ejemplo fue reemplazado.");
    const meter = overlay.querySelector('.tns-import-step[data-step="2"] .tns-import-progress-meter');
    if (meter) meter.hidden = true;

    if (current.analysis) {
      setStep(overlay, 4, "completed", nt.analyzedStatus, nt.analyzed(current.analysis.apis.length, current.analysis.casCalls.length, current.analysis.warnings.length));
      renderSummary(overlay, current.analysis);
      overlay.dataset.canClose = "1";
      overlay.querySelector(".tns-import-progress-close")?.classList.add("visible");
      overlay.querySelector(".tns-import-progress-report")?.classList.add("visible");
      return;
    }

    if (current.analysisStarted) return;
    current.analysisStarted = true;
    setStep(overlay, 4, "active", nt.analyzingStatus, nt.analyzing);
    const summary = overlay.querySelector(".tns-import-progress-summary");
    if (summary) summary.innerHTML = `<strong>${escapeHtml(nt.summaryAnalyzing)}</strong><br>${escapeHtml(current.name)}`;

    await ensureCompatibility();
    const source = sourceFor(current.name);
    if (source?.code && window.TnsLuaCompatibility?.analyze) {
      current.analysis = window.TnsLuaCompatibility.analyze(source.code, current.name);
      setStep(overlay, 4, "completed", nt.analyzedStatus, nt.analyzed(current.analysis.apis.length, current.analysis.casCalls.length, current.analysis.warnings.length));
      renderSummary(overlay, current.analysis);
      overlay.querySelector(".tns-import-progress-report")?.classList.add("visible");
    } else {
      setStep(overlay, 4, "completed", nt.analyzedStatus, nt.unavailable);
      if (summary) summary.innerHTML = `<strong>Importación completada.</strong><br>${escapeHtml(current.name)}`;
    }

    overlay.dataset.canClose = "1";
    overlay.querySelector(".tns-import-progress-close")?.classList.add("visible");
  }

  async function renderCurrent() {
    if (!current) return;
    await Promise.all([ensureStepper(), ensureCompatibility()]);
    if (!current) return;

    let overlay = document.querySelector(`#${OVERLAY_ID}[data-lua-drop-progress="1"]`);
    if (!overlay || overlay.dataset.luaName !== current.name) {
      overlay = createOverlay(current.name);
      overlay.dataset.luaName = current.name;
    }

    if (current.state === "running") return;
    if (current.state === "done") {
      await finalizeDone(overlay);
    } else {
      setStep(overlay, 2, "error", "Error", "No se pudo completar la creación o la escritura de la ScriptApp.");
      setStep(overlay, 3, "error", "Error", current.message || "La importación Lua falló.");
      setStep(overlay, 4, "pending", "Pendiente", tx().analyzing);
      const summary = overlay.querySelector(".tns-import-progress-summary");
      if (summary) summary.innerHTML = `<strong>La importación terminó con un error.</strong><br>${escapeHtml(current.message || "Error desconocido")}`;
      overlay.dataset.canClose = "1";
      overlay.querySelector(".tns-import-progress-close")?.classList.add("visible");
    }
  }

  function begin(name) {
    current = { name: name || "Archivo Lua", state: "running", message: "", analysis: null, analysisStarted: false };
    renderCurrent();
  }

  function complete(name) {
    if (!current || (name && current.name !== name)) current = { name: name || "Archivo Lua", state: "done", message: "", analysis: null, analysisStarted: false };
    else current.state = "done";
    renderCurrent();
  }

  function fail(message) {
    if (!current) return;
    current.state = "error";
    current.message = message || "La importación Lua falló.";
    renderCurrent();
  }

  function rememberSource(name, code, bytes = 0) {
    if (!name || typeof code !== "string") return;
    const record = { name, code, bytes: Number(bytes) || code.length, capturedAt: Date.now() };
    luaSources.set(name, record);
    window.__tnsLastLuaImportSource = record;
  }

  function captureDroppedLua(event) {
    const files = Array.from(event.dataTransfer?.files || []);
    for (const file of files) {
      if (!/\.lua$/i.test(file.name || "")) continue;
      file.text().then((code) => rememberSource(file.name, code, file.size)).catch(() => {});
    }
  }

  function handleLine(rawLine) {
    const line = stripTimestamp(rawLine);
    if (!line) return;
    let match = line.match(/^Lua:\s*importando\s+(.+?)\s+como nueva card ScriptApp\.\.\.$/i);
    if (match) { begin(match[1]); return; }
    match = line.match(/^Lua importado:\s*(.+?)\s+reemplazó el código de ejemplo en la nueva card ScriptApp\.$/i);
    if (match) { complete(match[1]); return; }
    if (/^ERROR importando archivo arrastrado:/i.test(line)) fail(line.replace(/^ERROR importando archivo arrastrado:\s*/i, ""));
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
    ensureCompatibility();
    document.addEventListener("drop", captureDroppedLua, true);
    observeLog();
    const retry = setInterval(() => { if (observeLog()) clearInterval(retry); }, 120);
    setTimeout(() => clearInterval(retry), 20000);
    window.TnsLuaDropProgress = {
      version: "20260903-lua-drop-compat-v1",
      rememberSource,
      getCurrent: () => current,
      showReport: () => current?.analysis && window.TnsLuaCompatibility?.showReport?.(current.analysis)
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
