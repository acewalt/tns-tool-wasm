(() => {
  "use strict";

  const OVERLAY_ID = "tns-type-detection-progress-overlay";
  const XML_INPUT_ID = "xml-tns-file";
  const DECODE_INPUT_ID = "decode-file";
  const DECODE_BUTTON_ID = "decode-btn";

  const TEXT = {
    es: {
      kicker: "Analizando archivo",
      title: "Detectando tipo de TNS",
      subtitle: "La herramienta revisa primero el archivo para elegir el flujo correcto sin intentar decodificarlo con el formato equivocado.",
      step1: "Leer archivo",
      step2: "Detectar tipo de TNS",
      step3: "Abrir herramienta correcta",
      pending: "Pendiente",
      processing: "Procesando",
      ready: "Listo",
      fileReady: "Archivo cargado en memoria.",
      scanning: "Buscando estructura documental o cabecera Zehn…",
      detected: "TNS detectado",
      ndless: "Ndless / Zehn",
      document: "Documento TI-Nspire",
      malformed: "Ndless / Zehn · cabecera inválida",
      ndlessDetail: "Ejecutable nativo ARM detectado. Se abrirá el Inspector Ndless.",
      documentDetail: "No se detectó Zehn. Se continuará con el decoder documental normal.",
      malformedDetail: "Se encontró una firma Zehn, pero el archivo parece incompleto o dañado.",
      openingNdless: "Abriendo Inspector Ndless…",
      openingDocument: "Enviando al flujo documental…",
      failed: "No se pudo completar la detección.",
    },
    en: {
      kicker: "Analyzing file",
      title: "Detecting TNS type",
      subtitle: "The tool checks the file first so it can select the correct flow without decoding it as the wrong format.",
      step1: "Read file",
      step2: "Detect TNS type",
      step3: "Open the correct tool",
      pending: "Pending",
      processing: "Processing",
      ready: "Ready",
      fileReady: "File loaded into memory.",
      scanning: "Looking for a document structure or Zehn header…",
      detected: "TNS detected",
      ndless: "Ndless / Zehn",
      document: "TI-Nspire document",
      malformed: "Ndless / Zehn · invalid header",
      ndlessDetail: "Native ARM executable detected. Ndless Inspector will open.",
      documentDetail: "No Zehn structure was detected. The normal document decoder will continue.",
      malformedDetail: "A Zehn signature was found, but the file appears incomplete or damaged.",
      openingNdless: "Opening Ndless Inspector…",
      openingDocument: "Sending to document flow…",
      failed: "TNS detection could not be completed.",
    },
    fr: {
      kicker: "Analyse du fichier",
      title: "Détection du type de TNS",
      subtitle: "L’outil vérifie d’abord le fichier afin de sélectionner le bon flux sans utiliser le mauvais décodeur.",
      step1: "Lire le fichier",
      step2: "Détecter le type de TNS",
      step3: "Ouvrir le bon outil",
      pending: "En attente",
      processing: "Analyse",
      ready: "Prêt",
      fileReady: "Fichier chargé en mémoire.",
      scanning: "Recherche d’une structure de document ou d’un en-tête Zehn…",
      detected: "TNS détecté",
      ndless: "Ndless / Zehn",
      document: "Document TI-Nspire",
      malformed: "Ndless / Zehn · en-tête invalide",
      ndlessDetail: "Exécutable ARM natif détecté. L’Inspecteur Ndless va s’ouvrir.",
      documentDetail: "Aucune structure Zehn détectée. Le décodeur de document normal va continuer.",
      malformedDetail: "Une signature Zehn a été trouvée, mais le fichier semble incomplet ou endommagé.",
      openingNdless: "Ouverture de l’Inspecteur Ndless…",
      openingDocument: "Envoi vers le flux de document…",
      failed: "La détection TNS n’a pas pu être terminée.",
    },
  };

  let busy = false;

  function language() {
    const active = document.querySelector("#language-buttons button.active[data-lang]")?.dataset.lang;
    const html = String(document.documentElement.lang || "es").slice(0, 2).toLowerCase();
    return TEXT[active] ? active : (TEXT[html] ? html : "es");
  }

  function tr(key) {
    const lang = language();
    return TEXT[lang]?.[key] || TEXT.es[key] || key;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]);
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function nextPaint() {
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  function createOverlay(fileName) {
    document.getElementById(OVERLAY_ID)?.remove();
    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.className = "tns-type-progress-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", tr("title"));
    overlay.innerHTML = `
      <section class="tns-type-progress-card">
        <div class="tns-type-progress-head">
          <div>
            <div class="tns-type-progress-kicker">${escapeHtml(tr("kicker"))}</div>
            <h2>${escapeHtml(tr("title"))}</h2>
            <p>${escapeHtml(tr("subtitle"))}</p>
          </div>
          <div class="tns-type-progress-icon" aria-hidden="true">TNS</div>
        </div>

        ${stepMarkup(1, tr("step1"), fileName || ".tns")}
        ${stepMarkup(2, tr("step2"), tr("scanning"))}
        ${stepMarkup(3, tr("step3"), tr("pending"))}

        <div class="tns-type-progress-result" hidden>
          <span>${escapeHtml(tr("detected"))}</span>
          <strong class="tns-type-progress-badge">—</strong>
        </div>
      </section>`;
    document.body.appendChild(overlay);
    document.documentElement.classList.add("tns-import-progress-lock");
    requestAnimationFrame(() => overlay.classList.add("visible"));
    return overlay;
  }

  function stepMarkup(number, title, detail) {
    return `
      <div class="tns-type-progress-step pending" data-step="${number}">
        <div class="tns-type-progress-circle">${number}</div>
        <div class="tns-type-progress-line"></div>
        <div class="tns-type-progress-content">
          <div class="tns-type-progress-topline">
            <div class="tns-type-progress-title">${escapeHtml(title)}</div>
            <div class="tns-type-progress-status">${escapeHtml(tr("pending"))}</div>
          </div>
          <div class="tns-type-progress-detail">${escapeHtml(detail)}</div>
        </div>
      </div>`;
  }

  function setStep(overlay, number, status, detail) {
    const step = overlay?.querySelector(`.tns-type-progress-step[data-step="${number}"]`);
    if (!step) return;
    step.classList.remove("pending", "active", "completed", "error");
    step.classList.add(status);
    const circle = step.querySelector(".tns-type-progress-circle");
    const statusEl = step.querySelector(".tns-type-progress-status");
    const detailEl = step.querySelector(".tns-type-progress-detail");
    if (circle && status === "completed") circle.textContent = "✓";
    if (circle && status === "error") circle.textContent = "!";
    if (statusEl) statusEl.textContent = status === "active" ? tr("processing") : status === "completed" ? tr("ready") : status === "error" ? "Error" : tr("pending");
    if (detailEl && detail) detailEl.textContent = detail;
  }

  function showType(overlay, kind) {
    const result = overlay?.querySelector(".tns-type-progress-result");
    const badge = overlay?.querySelector(".tns-type-progress-badge");
    if (!result || !badge) return;
    result.hidden = false;
    badge.classList.remove("document", "warning");
    if (kind === "ndless") badge.textContent = tr("ndless");
    else if (kind === "malformed") {
      badge.textContent = tr("malformed");
      badge.classList.add("warning");
    } else {
      badge.textContent = tr("document");
      badge.classList.add("document");
    }
  }

  async function closeOverlay(overlay) {
    if (!overlay?.isConnected) return;
    overlay.classList.add("closing");
    document.documentElement.classList.remove("tns-import-progress-lock");
    await sleep(210);
    overlay.remove();
  }

  async function waitForInspector(timeout = 5000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      if (window.TnsNdlessInspector?.inspectFile && window.TnsNdlessInspector?.showInspector) return window.TnsNdlessInspector;
      await sleep(35);
    }
    throw new Error("Ndless inspector is not available.");
  }

  function bypassXmlInput(input) {
    input.dataset.tnsTypeProgressBypass = "1";
    input.dataset.ndlessInspectorBypass = "1";
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function bypassDecodeButton(button) {
    button.dataset.tnsTypeProgressBypass = "1";
    button.dataset.ndlessInspectorBypass = "1";
    button.click();
  }

  async function analyzeAndRoute(file, normalRoute) {
    if (busy || !file) return;
    busy = true;
    const overlay = createOverlay(file.name || "documento.tns");
    const started = performance.now();
    try {
      await nextPaint();
      setStep(overlay, 1, "active", file.name || "documento.tns");
      await sleep(90);
      setStep(overlay, 1, "completed", `${tr("fileReady")} ${formatBytes(file.size)}`);
      setStep(overlay, 2, "active", tr("scanning"));

      const inspector = await waitForInspector();
      const parsed = await inspector.inspectFile(file);
      const kind = parsed ? (parsed.valid ? "ndless" : "malformed") : "document";

      showType(overlay, kind);
      if (kind === "ndless") {
        const details = [`Zehn v${parsed.header.version}`, "ARM"];
        if (parsed.metadata?.name) details.unshift(parsed.metadata.name);
        setStep(overlay, 2, "completed", `${tr("ndlessDetail")} ${details.join(" · ")}`);
        setStep(overlay, 3, "active", tr("openingNdless"));
      } else if (kind === "malformed") {
        setStep(overlay, 2, "completed", tr("malformedDetail"));
        setStep(overlay, 3, "active", tr("openingNdless"));
      } else {
        setStep(overlay, 2, "completed", tr("documentDetail"));
        setStep(overlay, 3, "active", tr("openingDocument"));
      }

      const elapsed = performance.now() - started;
      if (elapsed < 720) await sleep(720 - elapsed);
      setStep(overlay, 3, "completed", kind === "document" ? tr("openingDocument") : tr("openingNdless"));
      await sleep(260);
      await closeOverlay(overlay);

      if (kind === "document") normalRoute();
      else inspector.showInspector(parsed);
    } catch (error) {
      console.warn("TNS type detection progress failed; using the normal TNS flow.", error);
      setStep(overlay, 2, "error", error?.message || tr("failed"));
      showType(overlay, "document");
      setStep(overlay, 3, "active", tr("openingDocument"));
      await sleep(650);
      await closeOverlay(overlay);
      normalRoute();
    } finally {
      busy = false;
    }
  }

  function formatBytes(value) {
    const n = Number(value) || 0;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  }

  window.addEventListener("change", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.id !== XML_INPUT_ID) return;
    if (input.dataset.tnsTypeProgressBypass === "1") {
      delete input.dataset.tnsTypeProgressBypass;
      return;
    }
    const file = input.files?.[0];
    if (!file || !/\.tns$/i.test(file.name || "")) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    analyzeAndRoute(file, () => bypassXmlInput(input));
  }, true);

  window.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest(`#${DECODE_BUTTON_ID}`) : null;
    if (!button) return;
    if (button.dataset.tnsTypeProgressBypass === "1") {
      delete button.dataset.tnsTypeProgressBypass;
      return;
    }
    const input = document.getElementById(DECODE_INPUT_ID);
    const file = input?.files?.[0];
    if (!file || !/\.tns$/i.test(file.name || "")) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    analyzeAndRoute(file, () => bypassDecodeButton(button));
  }, true);
})();