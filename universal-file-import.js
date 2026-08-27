(() => {
  "use strict";

  const IMAGE_EXTENSIONS = new Set([".bmp", ".png", ".jpg", ".jpeg"]);
  const CORE_EXTENSIONS = new Set([".tns", ".xml", ".py"]);
  const SUPPORTED_TEXT = {
    es: "Formatos soportados: .tns, .xml, .py, .lua, .pdf, .png, .jpg, .jpeg, .bmp",
    en: "Supported formats: .tns, .xml, .py, .lua, .pdf, .png, .jpg, .jpeg, .bmp",
    fr: "Formats pris en charge : .tns, .xml, .py, .lua, .pdf, .png, .jpg, .jpeg, .bmp",
  };
  const PDFJS_VERSION = "3.11.174";
  const PDFJS_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
  const PDFJS_WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;
  const PDF_PAGE_WARNING = 30;
  const PDF_TARGET_WIDTH = 720;
  const PDF_MAX_SCALE = 1.6;

  let pdfJsPromise = null;
  let progressPromise = null;
  let importBusy = false;

  function resolveFunction(name) {
    if (typeof window[name] === "function") return window[name];
    try {
      const value = (0, eval)(`typeof ${name} === "function" ? ${name} : null`);
      return typeof value === "function" ? value : null;
    } catch (_error) {
      return null;
    }
  }

  function log(message) {
    const logger = resolveFunction("xmlLog");
    if (logger) {
      try {
        logger(message);
        return;
      } catch (_error) {}
    }
    console.info(message);
  }

  function currentLanguage() {
    const active = document.querySelector("#language-buttons button.active[data-lang]")?.dataset.lang;
    const htmlLang = String(document.documentElement.lang || "").slice(0, 2).toLowerCase();
    return active || htmlLang || "es";
  }

  function patchSupportedFormats() {
    try {
      if (typeof I18N === "object" && I18N) {
        if (I18N.es) I18N.es.homeDropFormats = SUPPORTED_TEXT.es;
        if (I18N.en) I18N.en.homeDropFormats = SUPPORTED_TEXT.en;
        if (I18N.fr) I18N.fr.homeDropFormats = SUPPORTED_TEXT.fr;
      }
    } catch (_error) {}

    const target = document.querySelector('[data-i18n="homeDropFormats"]');
    if (target) target.textContent = SUPPORTED_TEXT[currentLanguage()] || SUPPORTED_TEXT.es;
  }

  function extensionOf(file) {
    const name = String(file?.name || "").trim().toLowerCase();
    const dot = name.lastIndexOf(".");
    return dot >= 0 ? name.slice(dot) : "";
  }

  function isImage(file) {
    const type = String(file?.type || "").toLowerCase();
    return IMAGE_EXTENSIONS.has(extensionOf(file))
      || type === "image/bmp"
      || type === "image/png"
      || type === "image/jpeg";
  }

  function isPdf(file) {
    return String(file?.type || "").toLowerCase() === "application/pdf" || extensionOf(file) === ".pdf";
  }

  function isLua(file) {
    return extensionOf(file) === ".lua";
  }

  function isCore(file) {
    return CORE_EXTENSIONS.has(extensionOf(file));
  }

  function isExtendedImport(file) {
    return isImage(file) || isPdf(file) || isLua(file);
  }

  function isFileDrag(event) {
    const types = event?.dataTransfer?.types;
    if (!types) return false;
    try {
      return Array.from(types).includes("Files");
    } catch (_error) {
      return false;
    }
  }

  function loadScriptOnce(selector, src, datasetKey) {
    const existing = document.querySelector(selector);
    if (existing) {
      return new Promise((resolve) => {
        if (existing.dataset.loaded === "1") return resolve();
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", resolve, { once: true });
        setTimeout(resolve, 1400);
      });
    }

    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = src;
      script.dataset[datasetKey] = "true";
      script.addEventListener("load", () => {
        script.dataset.loaded = "1";
        resolve();
      }, { once: true });
      script.addEventListener("error", resolve, { once: true });
      document.head.appendChild(script);
    });
  }

  async function ensureProgressStepper() {
    if (document.getElementById("tns-import-progress-style")) return;
    if (!progressPromise) {
      progressPromise = loadScriptOnce(
        'script[data-import-progress-stepper="true"]',
        "./import-progress-stepper.js?v=20260827-import-stepper-v4",
        "importProgressStepper"
      ).then(async () => {
        for (let i = 0; i < 40 && !document.getElementById("tns-import-progress-style"); i += 1) {
          await new Promise((resolve) => setTimeout(resolve, 30));
        }
      });
    }
    await progressPromise;
  }

  async function ensureProject() {
    const ensure = resolveFunction("ensureXmlProjectForPageCreation");
    if (!ensure) throw new Error("No está disponible la creación automática del documento XML.");
    await ensure();
  }

  async function refreshAfterImport() {
    const scan = resolveFunction("scanXmlPrograms");
    if (!scan) return;
    await scan();
  }

  function getAddImage() {
    const fn = resolveFunction("addImageWidgetToStage");
    if (!fn) throw new Error("La función Add image todavía no está disponible.");
    return fn;
  }

  async function importImages(files) {
    if (!files.length) return { added: 0, failed: 0 };
    await ensureProgressStepper();
    log(`Carga múltiple de imágenes: ${files.length} archivo(s).`);
    await ensureProject();
    const addImage = getAddImage();
    let added = 0;
    const failed = [];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      log(`Imagen ${i + 1}/${files.length}: ${file.name}`);
      try {
        await addImage(file);
        added += 1;
      } catch (error) {
        failed.push({ name: file.name, message: error?.message || String(error) });
        log(`ERROR imagen ${file.name}: ${error?.message || error}`);
      }
    }

    await refreshAfterImport();
    log(`Carga múltiple terminada: ${added}/${files.length} imágenes agregadas; ${failed.length} con error.`);
    return { added, failed: failed.length };
  }

  function loadPdfJs() {
    if (window.pdfjsLib?.getDocument) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      return Promise.resolve(window.pdfjsLib);
    }
    if (pdfJsPromise) return pdfJsPromise;

    pdfJsPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-tns-pdfjs="1"]');
      const finish = () => {
        if (!window.pdfjsLib?.getDocument) {
          reject(new Error("PDF.js cargó, pero pdfjsLib no está disponible."));
          return;
        }
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        resolve(window.pdfjsLib);
      };

      if (existing) {
        if (window.pdfjsLib?.getDocument) finish();
        else {
          existing.addEventListener("load", finish, { once: true });
          existing.addEventListener("error", () => reject(new Error("No se pudo cargar PDF.js.")), { once: true });
        }
        return;
      }

      const script = document.createElement("script");
      script.src = PDFJS_URL;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.dataset.tnsPdfjs = "1";
      script.addEventListener("load", finish, { once: true });
      script.addEventListener("error", () => reject(new Error("No se pudo cargar PDF.js desde el CDN.")), { once: true });
      document.head.appendChild(script);
    }).catch((error) => {
      pdfJsPromise = null;
      throw error;
    });

    return pdfJsPromise;
  }

  function safePdfBaseName(name) {
    return String(name || "documento")
      .replace(/\.pdf$/i, "")
      .replace(/[^A-Za-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48) || "documento";
  }

  function canvasToPngBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("No se pudo convertir la página PDF a PNG."));
      }, "image/png");
    });
  }

  async function renderPdfPageAsFile(pdf, pageNumber, pdfName) {
    const page = await pdf.getPage(pageNumber);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.max(0.65, Math.min(PDF_MAX_SCALE, PDF_TARGET_WIDTH / Math.max(1, base.width)));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(viewport.width));
    canvas.height = Math.max(1, Math.ceil(viewport.height));
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D no disponible para renderizar PDF.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    try {
      await page.render({ canvasContext: ctx, viewport, background: "rgb(255,255,255)" }).promise;
      const blob = await canvasToPngBlob(canvas);
      const digits = String(pdf.numPages).length;
      return new File(
        [blob],
        `${safePdfBaseName(pdfName)}_pagina_${String(pageNumber).padStart(digits, "0")}.png`,
        { type: "image/png" }
      );
    } finally {
      page.cleanup?.();
      canvas.width = 1;
      canvas.height = 1;
    }
  }

  function resolvePdfPageCount(totalPages, fileName) {
    if (totalPages <= PDF_PAGE_WARNING) return totalPages;
    const accepted = window.confirm(
      `El PDF "${fileName}" tiene ${totalPages} páginas.\n\n` +
      "Importar todas puede crear un TNS muy grande y consumir bastante memoria.\n\n" +
      `Aceptar: importar las ${totalPages} páginas.\nCancelar: no importar este PDF.`
    );
    return accepted ? totalPages : 0;
  }

  async function importPdf(file) {
    await ensureProgressStepper();
    log(`PDF: abriendo ${file.name}...`);
    await ensureProject();
    let pdf = null;
    let added = 0;
    const failed = [];

    try {
      const pdfjs = await loadPdfJs();
      pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      const pages = resolvePdfPageCount(pdf.numPages, file.name);
      if (!pages) {
        log(`PDF cancelado: ${file.name}.`);
        return { added: 0, failed: 0, cancelled: true };
      }

      log(`PDF ${file.name}: ${pdf.numPages} página(s); se importarán ${pages}. Cada página se convertirá usando el mismo pipeline de Add image.`);
      const addImage = getAddImage();

      for (let pageNumber = 1; pageNumber <= pages; pageNumber += 1) {
        log(`PDF página ${pageNumber}/${pages}: renderizando...`);
        try {
          const imageFile = await renderPdfPageAsFile(pdf, pageNumber, file.name);
          await addImage(imageFile);
          added += 1;
          log(`PDF página ${pageNumber}/${pages}: card creada.`);
        } catch (error) {
          failed.push({ page: pageNumber, message: error?.message || String(error) });
          log(`ERROR PDF página ${pageNumber}: ${error?.message || error}`);
        }
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }

      await refreshAfterImport();
      log(`PDF terminado: ${added}/${pages} páginas agregadas como cards; ${failed.length} con error.`);
      return { added, failed: failed.length, cancelled: false };
    } catch (error) {
      log(`ERROR importando PDF: ${error?.message || error}`);
      throw error;
    } finally {
      try {
        await pdf?.destroy?.();
      } catch (_error) {}
    }
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

  function createLuaProgress(total, fileNames) {
    const existing = document.getElementById("tns-import-progress-overlay");
    if (existing) throw new Error("Ya hay una importación en curso. Termínala antes de importar Lua.");

    const overlay = document.createElement("div");
    overlay.id = "tns-import-progress-overlay";
    overlay.className = "tns-import-progress-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Importando Lua");
    overlay.dataset.canClose = "0";
    const names = fileNames.length <= 2 ? fileNames.join(", ") : `${fileNames[0]} y ${fileNames.length - 1} archivo(s) más`;

    overlay.innerHTML = `
      <section class="tns-import-progress-card">
        <div class="tns-import-progress-head">
          <div>
            <div class="tns-import-progress-kicker">Procesando</div>
            <h2>Importando Lua</h2>
            <p>Se crea una card Lua ScriptApp por archivo y se reemplaza el código de prueba por el contenido importado.</p>
          </div>
          <div class="tns-import-progress-icon" aria-hidden="true">{ }</div>
        </div>
        <div class="tns-import-step active" data-step="1">
          <div class="tns-import-step-circle">1</div><div class="tns-import-step-line"></div>
          <div class="tns-import-step-content">
            <div class="tns-import-step-topline"><div class="tns-import-step-title">Leer archivo Lua</div><div class="tns-import-step-status">En curso</div></div>
            <div class="tns-import-step-detail">${escapeHtml(names || "Leyendo archivo…")}</div>
          </div>
        </div>
        <div class="tns-import-step pending" data-step="2">
          <div class="tns-import-step-circle">2</div><div class="tns-import-step-line"></div>
          <div class="tns-import-step-content">
            <div class="tns-import-step-topline"><div class="tns-import-step-title">Crear Lua ScriptApp</div><div class="tns-import-step-status">Pendiente</div></div>
            <div class="tns-import-step-detail">0 de ${total} cards creadas.</div>
            <div class="tns-import-progress-meter"><span></span></div>
          </div>
        </div>
        <div class="tns-import-step pending" data-step="3">
          <div class="tns-import-step-circle">3</div>
          <div class="tns-import-step-content">
            <div class="tns-import-step-topline"><div class="tns-import-step-title">Aplicar contenido</div><div class="tns-import-step-status">Pendiente</div></div>
            <div class="tns-import-step-detail">El código importado reemplazará el código de ejemplo y se refrescará el documento.</div>
          </div>
        </div>
        <div class="tns-import-progress-summary"><strong>Preparando importación.</strong><br>${total} archivo${total === 1 ? "" : "s"} Lua.</div>
        <div class="tns-import-progress-actions"><button type="button" class="tns-import-progress-close">Cerrar</button></div>
      </section>`;

    const closeButton = overlay.querySelector(".tns-import-progress-close");
    const close = () => {
      if (overlay.dataset.canClose !== "1") return;
      overlay.classList.add("closing");
      document.documentElement.classList.remove("tns-import-progress-lock");
      setTimeout(() => overlay.remove(), 230);
    };
    closeButton.addEventListener("click", close);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });

    document.body.appendChild(overlay);
    document.documentElement.classList.add("tns-import-progress-lock");
    requestAnimationFrame(() => overlay.classList.add("visible"));

    function setStep(number, state, detail) {
      const step = overlay.querySelector(`.tns-import-step[data-step="${number}"]`);
      if (!step) return;
      step.classList.remove("pending", "active", "completed", "error");
      step.classList.add(state);
      const status = step.querySelector(".tns-import-step-status");
      const circle = step.querySelector(".tns-import-step-circle");
      const detailEl = step.querySelector(".tns-import-step-detail");
      if (status) status.textContent = state === "completed" ? "Listo" : state === "active" ? "En curso" : state === "error" ? "Error" : "Pendiente";
      if (circle) circle.innerHTML = state === "completed" ? "✓" : state === "error" ? "!" : String(number);
      if (detailEl && detail) detailEl.textContent = detail;
    }

    function update(created, currentName) {
      setStep(1, "completed", `${total} archivo${total === 1 ? "" : "s"} Lua leído${total === 1 ? "" : "s"}.`);
      setStep(2, "active", `${created} de ${total} cards creadas${currentName ? ` · ${currentName}` : ""}.`);
      const meter = overlay.querySelector('.tns-import-step[data-step="2"] .tns-import-progress-meter > span');
      if (meter) meter.style.width = `${Math.max(0, Math.min(100, total ? (created / total) * 100 : 0))}%`;
      const summary = overlay.querySelector(".tns-import-progress-summary");
      if (summary) summary.innerHTML = `<strong>Importación en curso.</strong><br>${created} de ${total} Lua ScriptApp creadas.`;
    }

    function applying() {
      setStep(2, "completed", `${total} de ${total} cards creadas.`);
      setStep(3, "active", "Guardando el Lua importado y refrescando la estructura del documento…");
    }

    function complete(created, failed) {
      setStep(1, "completed", `${total} archivo${total === 1 ? "" : "s"} Lua leído${total === 1 ? "" : "s"}.`);
      setStep(2, failed ? "error" : "completed", `${created} de ${total} cards creadas${failed ? ` · ${failed} con error` : ""}.`);
      setStep(3, failed ? "error" : "completed", failed ? "Algunos archivos no pudieron aplicarse por completo." : "Código importado aplicado y documento actualizado.");
      const meter = overlay.querySelector('.tns-import-step[data-step="2"] .tns-import-progress-meter > span');
      if (meter) meter.style.width = "100%";
      const summary = overlay.querySelector(".tns-import-progress-summary");
      if (summary) summary.innerHTML = failed
        ? `<strong>Importación terminada con avisos.</strong><br>${created} Lua listos y ${failed} con error.`
        : `<strong>Importación completada.</strong><br>${created} Lua ScriptApp con el contenido importado.`;
      overlay.dataset.canClose = "1";
      closeButton.classList.add("visible");
    }

    function fail(message) {
      setStep(3, "error", message || "No se pudo completar la importación Lua.");
      const summary = overlay.querySelector(".tns-import-progress-summary");
      if (summary) summary.innerHTML = `<strong>La importación terminó con un error.</strong><br>${escapeHtml(message || "Error desconocido")}`;
      overlay.dataset.canClose = "1";
      closeButton.classList.add("visible");
    }

    return { update, applying, complete, fail };
  }

  async function importLuaFiles(files) {
    if (!files.length) return { added: 0, failed: 0 };
    await ensureProgressStepper();
    await ensureProject();

    const addLua = resolveFunction("addLuaScriptAppToStage");
    const saveLua = resolveFunction("saveLuaScriptToStage");
    if (!addLua || !saveLua) throw new Error("Las funciones de Lua ScriptApp todavía no están disponibles.");

    const contents = [];
    for (const file of files) {
      contents.push({ file, content: await file.text() });
    }

    const progress = createLuaProgress(files.length, files.map((file) => file.name));
    let added = 0;
    let failed = 0;

    try {
      log(`Importación Lua: ${files.length} archivo(s).`);
      for (let i = 0; i < contents.length; i += 1) {
        const { file, content } = contents[i];
        log(`Lua ${i + 1}/${files.length}: creando ScriptApp para ${file.name}.`);
        let item = null;
        try {
          item = await addLua();
          await saveLua(item, content);
          item.content = content;
          added += 1;
          progress.update(added, file.name);
          log(`Lua ${file.name}: card creada y código importado aplicado.`);
        } catch (error) {
          failed += 1;
          if (item) {
            try {
              await saveLua(item, "");
              item.content = "";
              log(`Lua ${file.name}: se limpió el código de ejemplo después del error.`);
            } catch (_cleanupError) {}
          }
          log(`ERROR Lua ${file.name}: ${error?.message || error}`);
        }
      }

      progress.applying();
      await refreshAfterImport();
      progress.complete(added, failed);
      log(`Importación Lua terminada: ${added}/${files.length} ScriptApp creadas; ${failed} con error.`);
      return { added, failed };
    } catch (error) {
      progress.fail(error?.message || String(error));
      log(`ERROR importando Lua: ${error?.message || error}`);
      throw error;
    }
  }

  async function waitForProgressOverlayToClose(timeoutMs = 180000) {
    const started = Date.now();
    while (document.getElementById("tns-import-progress-overlay")) {
      if (Date.now() - started > timeoutMs) throw new Error("La siguiente importación quedó esperando a que se cierre el progreso anterior.");
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }

  async function routeExtendedFiles(files) {
    const list = Array.from(files || []).filter(Boolean);
    if (!list.length) return false;

    const extended = list.filter(isExtendedImport);
    if (!extended.length) return false;

    const core = list.filter(isCore);
    if (core.length) {
      throw new Error("No mezcles .tns/.xml/.py con imágenes, PDF o Lua en la misma carga. Impórtalos por separado para evitar modificar el documento equivocado.");
    }

    const images = extended.filter(isImage);
    const pdfs = extended.filter(isPdf);
    const luas = extended.filter(isLua);
    const recognized = new Set([...images, ...pdfs, ...luas]);
    const unsupported = list.filter((file) => !recognized.has(file));
    if (unsupported.length) {
      log(`Archivos omitidos por formato no soportado: ${unsupported.map((file) => file.name).join(", ")}.`);
    }

    if (images.length) {
      await importImages(images);
      if (pdfs.length || luas.length) await waitForProgressOverlayToClose();
    }

    for (let i = 0; i < pdfs.length; i += 1) {
      await importPdf(pdfs[i]);
      if (i < pdfs.length - 1 || luas.length) await waitForProgressOverlayToClose();
    }

    if (luas.length) await importLuaFiles(luas);
    return true;
  }

  async function handleExtendedDrop(files) {
    if (importBusy) {
      log("Ya hay una importación en curso. Espera a que termine antes de soltar más archivos.");
      return;
    }
    importBusy = true;
    try {
      await routeExtendedFiles(files);
    } catch (error) {
      log(`ERROR importación por arrastre: ${error?.message || error}`);
      console.error(error);
    } finally {
      importBusy = false;
    }
  }

  function installDropHandling() {
    document.addEventListener("dragover", (event) => {
      if (isFileDrag(event)) event.preventDefault();
    }, true);

    document.addEventListener("drop", (event) => {
      const files = Array.from(event.dataTransfer?.files || []);
      if (!files.some(isExtendedImport)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      document.body?.classList.remove("drop-target-active");
      handleExtendedDrop(files);
    }, true);
  }

  function installLanguageSync() {
    patchSupportedFormats();
    const languageButtons = document.querySelector("#language-buttons");
    languageButtons?.addEventListener("click", (event) => {
      const button = event.target instanceof Element ? event.target.closest("button[data-lang]") : null;
      if (!button?.dataset.lang) return;
      setTimeout(patchSupportedFormats, 0);
    });
  }

  function install() {
    if (document.documentElement.dataset.tnsUniversalImport === "1") return;
    document.documentElement.dataset.tnsUniversalImport = "1";
    patchSupportedFormats();
    installLanguageSync();
    installDropHandling();
  }

  patchSupportedFormats();

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();

  window.TnsUniversalImport = {
    importImages,
    importPdf,
    importLuaFiles,
    routeFiles: routeExtendedFiles,
  };
})();