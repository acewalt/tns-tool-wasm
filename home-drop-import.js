(() => {
  "use strict";

  const IMAGE_EXTENSIONS = new Set([".bmp", ".png", ".jpg", ".jpeg"]);
  const DOCUMENT_EXTENSIONS = new Set([".tns", ".xml", ".py"]);
  const SUPPORTED_EXTENSIONS = new Set([
    ...IMAGE_EXTENSIONS,
    ".pdf",
    ".lua",
    ...DOCUMENT_EXTENSIONS,
  ]);

  const FORMAT_LABELS = {
    es: "Formatos soportados: .tns, .xml, .py, .lua, .pdf, .bmp, .png, .jpg, .jpeg",
    en: "Supported formats: .tns, .xml, .py, .lua, .pdf, .bmp, .png, .jpg, .jpeg",
    fr: "Formats pris en charge : .tns, .xml, .py, .lua, .pdf, .bmp, .png, .jpg, .jpeg",
  };

  const PDFJS_VERSION = "3.11.174";
  const PDFJS_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
  const PDFJS_WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;
  const PDF_PAGE_WARNING = 30;
  const PDF_TARGET_WIDTH = 720;
  const PDF_MAX_SCALE = 1.6;

  let busy = false;
  let pdfJsPromise = null;
  let progressPromise = null;

  function extensionOf(name = "") {
    const clean = String(name || "").toLowerCase();
    const dot = clean.lastIndexOf(".");
    return dot >= 0 ? clean.slice(dot) : "";
  }

  function resolveFunction(name) {
    if (typeof window[name] === "function") return window[name];
    try {
      const value = (0, eval)(`typeof ${name} === "function" ? ${name} : null`);
      return typeof value === "function" ? value : null;
    } catch (_error) {
      return null;
    }
  }

  async function waitForFunction(name, timeout = 12000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      const fn = resolveFunction(name);
      if (fn) return fn;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`La función ${name} todavía no está disponible.`);
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

  function updateSupportedFormats(language = currentLanguage()) {
    const label = document.querySelector('[data-i18n="homeDropFormats"]');
    if (!label) return;
    label.textContent = FORMAT_LABELS[language] || FORMAT_LABELS.es;
  }

  function installFormatTranslation() {
    updateSupportedFormats();
    document.querySelector("#language-buttons")?.addEventListener("click", (event) => {
      const button = event.target instanceof Element ? event.target.closest("button[data-lang]") : null;
      if (!button?.dataset.lang) return;
      setTimeout(() => updateSupportedFormats(button.dataset.lang), 0);
    });

    const observer = new MutationObserver(() => updateSupportedFormats());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"],
    });
    const languageButtons = document.querySelector("#language-buttons");
    if (languageButtons) {
      observer.observe(languageButtons, {
        attributes: true,
        subtree: true,
        attributeFilter: ["class"],
      });
    }
  }

  function loadScriptOnce(selector, src, datasetKey) {
    const existing = document.querySelector(selector);
    if (existing) {
      return new Promise((resolve) => {
        if (existing.dataset.loaded === "1" || document.getElementById("tns-import-progress-style")) {
          resolve();
          return;
        }
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", resolve, { once: true });
        setTimeout(resolve, 1800);
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
        "./import-progress-stepper.js?v=20260827-import-stepper-v7",
        "importProgressStepper"
      );
    }
    await progressPromise;
    for (let attempt = 0; attempt < 50 && !document.getElementById("tns-import-progress-style"); attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  }

  function nextPaint() {
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  async function waitForProgressClose(timeout = 15 * 60 * 1000) {
    const started = Date.now();
    let appeared = false;
    while (Date.now() - started < timeout) {
      const overlay = document.getElementById("tns-import-progress-overlay");
      if (overlay) appeared = true;
      if (appeared && !overlay) return;
      if (!appeared && Date.now() - started > 1500) return;
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }

  async function ensureProject() {
    ensureXmlWorkspaceVisible();
    const ensure = await waitForFunction("ensureXmlProjectForPageCreation");
    await ensure();
  }

  async function refreshDocument() {
    const scan = await waitForFunction("scanXmlPrograms");
    await scan();
  }

  function ensureXmlWorkspaceVisible() {
    const panel = document.querySelector("#xml-doctor-panel");
    if (!panel?.classList.contains("collapsed")) return;
    document.querySelector("#home-open-xml")?.click();
  }

  async function importImages(files) {
    if (!files.length) return 0;
    await ensureProgressStepper();
    ensureXmlWorkspaceVisible();

    // The progress stepper listens to these exact XML-log messages. Yield one
    // paint after the first line so its observer is active before card creation.
    log(`Carga múltiple de imágenes: ${files.length} archivo(s).`);
    await nextPaint();
    await ensureProject();

    const addImage = await waitForFunction("addImageWidgetToStage");
    let added = 0;
    const failed = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      log(`Imagen ${index + 1}/${files.length}: ${file.name}`);
      try {
        await addImage(file);
        added += 1;
      } catch (error) {
        failed.push({ name: file.name, message: error?.message || String(error) });
        log(`ERROR imagen ${file.name}: ${error?.message || error}`);
      }
    }

    await refreshDocument();
    log(`Carga múltiple terminada: ${added}/${files.length} imágenes agregadas; ${failed.length} con error.`);
    return added;
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
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas 2D no disponible para renderizar PDF.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    try {
      await page.render({ canvasContext: context, viewport, background: "rgb(255,255,255)" }).promise;
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

  function pdfPageCount(totalPages, fileName) {
    if (totalPages <= PDF_PAGE_WARNING) return totalPages;
    const lang = currentLanguage();
    const messages = {
      es: `El PDF "${fileName}" tiene ${totalPages} páginas.\n\nImportar todas puede crear un TNS muy grande y consumir bastante memoria.\n\nAceptar: importar todas.\nCancelar: no importar este PDF.`,
      en: `The PDF "${fileName}" has ${totalPages} pages.\n\nImporting all of them can create a very large TNS and use considerable memory.\n\nOK: import all pages.\nCancel: do not import this PDF.`,
      fr: `Le PDF « ${fileName} » contient ${totalPages} pages.\n\nTout importer peut créer un TNS très volumineux et consommer beaucoup de mémoire.\n\nOK : importer toutes les pages.\nAnnuler : ne pas importer ce PDF.`,
    };
    return window.confirm(messages[lang] || messages.es) ? totalPages : 0;
  }

  async function importPdf(file) {
    await ensureProgressStepper();
    ensureXmlWorkspaceVisible();
    log(`PDF: abriendo ${file.name}...`);
    await nextPaint();
    await ensureProject();

    let pdf = null;
    let added = 0;
    const failed = [];
    try {
      const pdfjs = await loadPdfJs();
      pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      const pages = pdfPageCount(pdf.numPages, file.name);
      if (!pages) {
        log(`PDF cancelado: ${file.name}.`);
        return 0;
      }

      log(`PDF ${file.name}: ${pdf.numPages} página(s); se importarán ${pages}. Cada página se convertirá usando el mismo pipeline de Add image.`);
      const addImage = await waitForFunction("addImageWidgetToStage");

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

      await refreshDocument();
      log(`PDF terminado: ${added}/${pages} páginas agregadas como cards; ${failed.length} con error.`);
      return added;
    } catch (error) {
      log(`ERROR importando PDF: ${error?.message || error}`);
      return 0;
    } finally {
      try {
        await pdf?.destroy?.();
      } catch (_error) {}
    }
  }

  async function importLua(file) {
    ensureXmlWorkspaceVisible();
    await ensureProject();
    const code = await file.text();
    const addLua = await waitForFunction("addLuaScriptAppToStage");
    const saveLua = await waitForFunction("saveLuaScriptToStage");

    log(`Lua: importando ${file.name} como nueva card ScriptApp...`);
    const item = await addLua();

    // addLuaScriptAppToStage deliberately creates the normal +Page template.
    // Immediately replace that sample source with the dropped .lua contents.
    await saveLua(item, code);
    item.content = code;
    item.detail = { ...(item.detail || {}), length: code.length, importedFile: file.name };
    await refreshDocument();
    log(`Lua importado: ${file.name} reemplazó el código de ejemplo en la nueva card ScriptApp.`);

    const openInspector = resolveFunction("openDocumentInspector");
    if (openInspector) {
      try {
        await openInspector();
      } catch (error) {
        console.warn("No se pudo abrir el Document Inspector después de importar Lua.", error);
      }
    }
  }

  function assignFileAndDispatch(input, file) {
    if (!input || !file) return false;
    try {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    } catch (error) {
      console.warn("No se pudo transferir el archivo al selector existente.", error);
      return false;
    }
  }

  function routeExistingDocument(file) {
    const ext = extensionOf(file.name);
    if (ext === ".tns") {
      ensureXmlWorkspaceVisible();
      return assignFileAndDispatch(document.querySelector("#xml-tns-file"), file);
    }
    if (ext === ".xml") {
      ensureXmlWorkspaceVisible();
      return assignFileAndDispatch(document.querySelector("#xml-file"), file);
    }
    if (ext === ".py") {
      document.querySelector("#home-open-python")?.click();
      return assignFileAndDispatch(document.querySelector("#py-file"), file);
    }
    return false;
  }

  async function processDroppedFiles(files) {
    if (busy || !files.length) return;
    busy = true;
    try {
      const recognized = files.filter((file) => SUPPORTED_EXTENSIONS.has(extensionOf(file.name)));
      const unsupported = files.filter((file) => !SUPPORTED_EXTENSIONS.has(extensionOf(file.name)));
      if (unsupported.length) {
        console.warn("Archivos no soportados ignorados:", unsupported.map((file) => file.name));
      }
      if (!recognized.length) return;

      const images = recognized.filter((file) => IMAGE_EXTENSIONS.has(extensionOf(file.name)));
      const pdfs = recognized.filter((file) => extensionOf(file.name) === ".pdf");
      const luaFiles = recognized.filter((file) => extensionOf(file.name) === ".lua");
      const documents = recognized.filter((file) => DOCUMENT_EXTENSIONS.has(extensionOf(file.name)));

      // A dropped image selection behaves exactly like +Page -> Add image:
      // all selected images are one batch and therefore one progress dialog.
      if (images.length) {
        await importImages(images);
        await waitForProgressClose();
      }

      // PDFs retain the +Page behavior: each PDF gets its own page-to-card
      // progress sequence and its own calculator gallery after Close.
      for (const pdf of pdfs) {
        await importPdf(pdf);
        await waitForProgressClose();
      }

      // Every Lua file creates one normal ScriptApp card and then replaces the
      // template source with the exact text from the dropped file.
      for (const luaFile of luaFiles) {
        await importLua(luaFile);
      }

      // Preserve the three pre-existing document formats. If several base
      // documents are dropped together, route only the first one; merging
      // unrelated .tns/.xml/.py documents would be ambiguous.
      if (documents.length) routeExistingDocument(documents[0]);
    } finally {
      busy = false;
    }
  }

  function isFileDrag(event) {
    try {
      return Array.from(event?.dataTransfer?.types || []).includes("Files");
    } catch (_error) {
      return false;
    }
  }

  function installDropHandling() {
    // Prevent the browser from navigating to the dragged file. The separate
    // drag-drop-ui.js remains responsible only for the full-page blur/label.
    window.addEventListener("dragover", (event) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    }, true);

    window.addEventListener("drop", (event) => {
      if (!isFileDrag(event)) return;
      const files = Array.from(event.dataTransfer?.files || []);
      if (!files.length) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      document.body?.classList.remove("drop-target-active");
      processDroppedFiles(files).catch((error) => {
        console.error("Drag/drop import failed:", error);
        log(`ERROR importando archivo arrastrado: ${error?.message || error}`);
      });
    }, true);
  }

  function install() {
    if (document.documentElement.dataset.tnsHomeDropImport === "1") return;
    document.documentElement.dataset.tnsHomeDropImport = "1";
    installFormatTranslation();
    installDropHandling();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
