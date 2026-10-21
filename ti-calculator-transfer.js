(() => {
  "use strict";

  // WebTILP runs the real TI calculator protocols inside its own WebAssembly
  // application. Never represent a USB enumeration as an established session.
  // Cross-origin embedding may be restricted by the upstream site's headers.
  const WEBTILP_URL = "https://tiplanet.org/scripts/webtilibs/webtilp.html";
  const state = { overlay: null, frame: null, activated: false, busy: false };

  const STRINGS = {
    es: {
      title: "Transferir a calculadora",
      subtitle: "Administrador USB real con WebTILP",
      openTab: "Abrir WebTILP en otra pestaña",
      embedded: "Cargar administrador integrado",
      reload: "Recargar conexión",
      prepare: "Preparar TNS actual",
      close: "Cerrar",
      description: "WebTILP se encarga de la conexión USB, los archivos, las carpetas, las transferencias y la captura de pantalla. No necesitas instalar el puente Python.",
      noBrowser: "Para comunicarte con la calculadora utiliza Chrome, Edge o Brave con WebUSB y conecta un cable USB de datos.",
      embeddedNotice: "La conexión USB dentro del panel puede estar restringida por el navegador o por WebTILP. Si no aparece o no conecta, usa «Abrir WebTILP en otra pestaña»; esa opción funciona independientemente del panel.",
      prepared: "Documento TNS descargado. En WebTILP, usa «Send Selected Files» para seleccionar y enviarlo a la calculadora.",
      nothing: "Crea o importa primero un documento TNS.",
      failed: "No fue posible generar el documento:",
      loading: "Cargando WebTILP…",
      credit: "WebTILP es software libre externo; la comunicación USB y el explorador pertenecen a su proyecto.",
      howto: "1. Abre WebTILP y pulsa «Connect Calculator». 2. Selecciona la TI-Nspire y autoriza el acceso. 3. Usa «Refresh List» para ver carpetas y documentos. 4. Puedes enviar y recibir archivos, crear carpetas y tomar capturas con las funciones de WebTILP.",
      sendTip: "Si quieres enviar el TNS que estás editando, pulsa «Preparar TNS actual» y luego selecciónalo desde WebTILP.",
      thirdParty: "La conexión ocurre en WebTILP, no en los servidores de TNS Tool WASM.",
      waiting: "Listo para conectar mediante WebTILP",
      newTabBlocked: "Tu navegador bloqueó la nueva pestaña. Permite ventanas emergentes o utiliza el enlace de WebTILP.",
      createError: "No hay ningún documento abierto o el creador de TNS todavía no está listo."
    },
    en: {
      title: "Transfer to calculator",
      subtitle: "Real USB manager powered by WebTILP",
      openTab: "Open WebTILP in a new tab",
      embedded: "Load embedded manager",
      reload: "Reload connection",
      prepare: "Prepare current TNS",
      close: "Close",
      description: "WebTILP handles real USB connections, files, folders, transfers and screenshots. No Python bridge is required.",
      noBrowser: "Use Chrome, Edge or Brave with WebUSB and a USB data cable to connect your calculator.",
      embeddedNotice: "Embedded USB access may be restricted by your browser or the WebTILP website. If loading or connecting fails, use «Open WebTILP in a new tab» instead.",
      prepared: "TNS downloaded. In WebTILP, select «Send Selected Files» and choose the file you just saved.",
      nothing: "Create or import a TNS document first.",
      failed: "Could not build the document:",
      loading: "Loading WebTILP…",
      credit: "WebTILP is an independent open-source application. USB communication and the file manager are provided by its project.",
      howto: "1. Open WebTILP and click «Connect Calculator». 2. Select your TI-Nspire and authorize access. 3. Use «Refresh List» to browse documents. 4. Transfer files, create folders and capture screenshots within WebTILP.",
      sendTip: "To send the document you are editing, click «Prepare current TNS», then select the downloaded file in WebTILP.",
      thirdParty: "The connection runs within WebTILP, not on the TNS Tool WASM server.",
      waiting: "Ready to connect using WebTILP",
      newTabBlocked: "The browser blocked the new tab. Allow pop-ups or follow the WebTILP link.",
      createError: "No document is open or the TNS builder is not ready."
    },
    fr: {
      title: "Transférer vers la calculatrice",
      subtitle: "Gestionnaire USB réel avec WebTILP",
      openTab: "Ouvrir WebTILP dans un onglet",
      embedded: "Charger le gestionnaire intégré",
      reload: "Recharger la connexion",
      prepare: "Préparer le TNS actuel",
      close: "Fermer",
      description: "WebTILP gère USB, les fichiers, les dossiers, les transferts et les captures d'écran. Aucun pont Python n'est nécessaire.",
      noBrowser: "Utilisez Chrome, Edge ou Brave compatible WebUSB et un câble USB de données.",
      embeddedNotice: "L'accès USB intégré peut être bloqué par le navigateur ou le site distant. Dans ce cas, ouvrez WebTILP dans un onglet séparé.",
      prepared: "TNS téléchargé. Dans WebTILP, sélectionnez «Send Selected Files» et choisissez votre fichier.",
      nothing: "Créez ou importez d'abord un document TNS.",
      failed: "Impossible de générer le document :",
      loading: "Chargement de WebTILP…",
      credit: "WebTILP est un logiciel libre indépendant. Son projet fournit les fonctions USB et de gestion des fichiers.",
      howto: "1. Ouvrez WebTILP puis «Connect Calculator». 2. Sélectionnez la TI-Nspire. 3. Utilisez «Refresh List». 4. Transférez les fichiers ou capturez l'écran.",
      sendTip: "Pour envoyer le TNS actif, utilisez «Préparer le TNS actuel», puis sélectionnez-le dans WebTILP.",
      thirdParty: "La connexion se fait dans WebTILP, pas sur les serveurs de TNS Tool WASM.",
      waiting: "Prêt à connecter via WebTILP",
      newTabBlocked: "Le navigateur a bloqué le nouvel onglet. Autorisez les fenêtres contextuelles.",
      createError: "Aucun document ouvert ou créateur TNS indisponible."
    }
  };

  const qs = (selector, root = document) => root.querySelector(selector);
  function strings() {
    const lang = String(document.documentElement.lang || "es").slice(0, 2);
    return STRINGS[lang] || STRINGS.es;
  }
  function updateStatus(message, error = false) {
    const status = qs("[data-webtilp-status]", state.overlay || document);
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("error", error);
  }
  function startEmbedded() {
    const root = state.overlay;
    if (!root) return;
    const holder = qs("[data-webtilp-holder]", root);
    if (!holder) return;
    if (state.frame) state.frame.remove();
    holder.replaceChildren();
    const frame = document.createElement("iframe");
    frame.className = "ti-transfer-webtilp-frame";
    frame.title = "WebTILP — calculator USB manager";
    frame.src = WEBTILP_URL;
    frame.allow = "usb *; hid *; serial *; fullscreen *; clipboard-write *";
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    // Do not sandbox: WebTILP itself needs native USB, WASM, downloads and
    // file picker APIs. Its permissions remain subject to the browser prompt.
    holder.append(frame);
    state.frame = frame;
    state.activated = true;
    qs("[data-webtilp-placeholder]", root).hidden = true;
    qs("[data-webtilp-embedded]", root).hidden = true;
    qs("[data-webtilp-reload]", root).hidden = false;
    updateStatus(strings().loading);
    frame.addEventListener("load", () => {
      // Cross-origin load does not prove that WebTILP is usable or connected.
      if (state.frame === frame) updateStatus(strings().embeddedNotice);
    }, { once: true });
    frame.addEventListener("error", () => {
      if (state.frame === frame) updateStatus(strings().embeddedNotice, true);
    }, { once: true });
  }

  function openExternal() {
    // Direct action from a user click, so the popup is not deferred.
    const tab = window.open(WEBTILP_URL, "_blank", "noopener,noreferrer");
    if (!tab) {
      // In browsers using 'noopener', window.open may return null even when
      // the tab was created. Keep the always-visible regular anchor fallback.
      updateStatus(strings().embeddedNotice);
    }
  }
  function downloadBlob(filename, bytes) {
    const blob = new Blob([bytes], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = String(filename || "documento.tns").replace(/[\\/:*?"<>|]/g, "_");
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  async function prepareCurrent() {
    const button = qs("[data-webtilp-prepare]", state.overlay || document);
    if (state.busy || !button) return;
    state.busy = true;
    button.disabled = true;
    const copy = strings();
    try {
      // This object is loaded lazily by container-editor-bindings.js.
      // It packages the current, unsaved edits into a valid TI document.
      const createButton = document.querySelector("#xml-create-tns-btn");
      if (!createButton || createButton.disabled) throw new Error(copy.nothing);
      const artifactBuilder = window.TnsFileSaveExperimental?.buildXmlDoctorArtifact;
      if (typeof artifactBuilder === "function") {
        const artifact = await artifactBuilder();
        if (!artifact?.ok || !artifact.bytes?.byteLength) throw new Error(copy.createError);
        downloadBlob(artifact.filename, artifact.bytes);
      } else {
        // The standard function returns a Promise after packaging and download.
        // Do not claim the TNS was prepared before generation completes.
        const createButton = document.querySelector("#xml-create-tns-btn");
        const createFunction = window.createTnsFromXmlDoctor;
        if (!createButton || createButton.disabled || typeof createFunction !== "function") {
          throw new Error(copy.createError);
        }
        await createFunction();
      }
      updateStatus(copy.prepared);
    } catch (error) {
      updateStatus(copy.failed + " " + (error?.message || String(error)), true);
    } finally {
      state.busy = false;
      if (state.overlay === button.closest(".ti-transfer-overlay")) button.disabled = false;
    }
  }
  function close() {
    state.frame = null;
    state.overlay?.remove();
    state.overlay = null;
    state.activated = false;
  }
  function open() {
    if (state.overlay) return;
    const overlay = document.createElement("div");
    overlay.className = "ti-transfer-overlay";
    const copy = strings();
    overlay.innerHTML = [
      '<section class="ti-transfer-modal" role="dialog" aria-modal="true" aria-labelledby="ti-transfer-title">',
      ' <header class="ti-transfer-topbar"><div class="ti-transfer-title"><h2 id="ti-transfer-title"></h2><p data-webtilp-subtitle></p></div>',
      '   <button type="button" data-webtilp-close class="ti-transfer-close" aria-label="Close">×</button></header>',
      ' <div class="ti-transfer-toolbar">',
      '   <a data-webtilp-external target="_blank" rel="noopener noreferrer" class="ti-transfer-primary"></a>',
      '   <button type="button" data-webtilp-embedded></button>',
      '   <button type="button" data-webtilp-reload hidden></button>',
      '   <button type="button" data-webtilp-prepare></button>',
      ' </div>',
      ' <p class="ti-transfer-status" data-webtilp-status></p>',
      ' <p class="ti-transfer-description" data-webtilp-description></p>',
      ' <div class="ti-transfer-viewport" data-webtilp-holder>',
      '   <div class="ti-transfer-placeholder" data-webtilp-placeholder>',
      '     <div class="ti-transfer-placeholder-icon" aria-hidden="true">USB</div>',
      '     <h3>WebTILP</h3><p data-webtilp-instructions></p>',
      '   </div>',
      ' </div>',
      ' <footer class="ti-transfer-footer"><p data-webtilp-notice></p><p data-webtilp-tip></p>',
      '   <small data-webtilp-credit></small></footer>',
      '</section>'
    ].join("");
    document.body.append(overlay);
    state.overlay = overlay;
    qs("#ti-transfer-title", overlay).textContent = copy.title;
    qs("[data-webtilp-subtitle]", overlay).textContent = copy.subtitle;
    qs("[data-webtilp-external]", overlay).textContent = copy.openTab;
    qs("[data-webtilp-external]", overlay).href = WEBTILP_URL;
    qs("[data-webtilp-embedded]", overlay).textContent = copy.embedded;
    qs("[data-webtilp-reload]", overlay).textContent = copy.reload;
    qs("[data-webtilp-prepare]", overlay).textContent = copy.prepare;
    qs("[data-webtilp-description]", overlay).textContent = copy.description;
    qs("[data-webtilp-instructions]", overlay).textContent = copy.howto;
    qs("[data-webtilp-notice]", overlay).textContent = copy.embeddedNotice;
    qs("[data-webtilp-tip]", overlay).textContent = copy.sendTip;
    qs("[data-webtilp-credit]", overlay).textContent = copy.credit;
    qs("[data-webtilp-close]", overlay).setAttribute("aria-label", copy.close);
    qs("[data-webtilp-close]", overlay).addEventListener("click", close);
    qs("[data-webtilp-embedded]", overlay).addEventListener("click", startEmbedded);
    qs("[data-webtilp-reload]", overlay).addEventListener("click", startEmbedded);
    qs("[data-webtilp-prepare]", overlay).addEventListener("click", prepareCurrent);
    overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
    updateStatus(copy.waiting);
    // Load in-panel by default, but always offer the direct top-level link:
    // WebUSB permissions or frame policies can block embedded access.
    startEmbedded();
  }

  document.addEventListener("click", event => {
    if (event.target.closest?.("#xml-transfer-calculator-btn")) {
      event.preventDefault();
      open();
    }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && state.overlay) close();
  });
  window.TnsCalculatorTransfer = Object.freeze({ open, close, openExternal, prepareCurrent });
})();