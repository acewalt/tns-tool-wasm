(() => {
  "use strict";

  const SYNTAX_IMAGE_ID = "file-page-add-image";
  const SYNTAX_PDF_ID = "file-page-add-pdf";
  const INSPECTOR_IMAGE_ID = "add-image-widget";
  const INSPECTOR_PDF_ID = "add-pdf-widget";
  const LEGACY_SYNTAX_PDF_ID = "file-page-add-pdf-syntax-v2";
  const IMAGE_ACCEPT = "image/bmp,image/png,image/jpeg,.bmp,.png,.jpg,.jpeg";
  const PDF_ACCEPT = "application/pdf,.pdf";
  const PDFJS_VERSION = "3.11.174";
  const PDFJS_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
  const PDFJS_WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;
  const PDF_PAGE_WARNING = 30;
  const PDF_TARGET_WIDTH = 720;
  const PDF_MAX_SCALE = 1.6;

  let imageBusy = false;
  let pdfBusy = false;
  let pdfJsPromise = null;
  let progressPromise = null;
  let galleryPromise = null;
  let pendingSingleGallery = 0;

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
      try { logger(message); return; } catch (_error) {}
    }
    console.info(message);
  }

  async function ensureProject() {
    const ensure = resolveFunction("ensureXmlProjectForPageCreation");
    if (ensure) await ensure();
  }

  async function refreshAfterImport() {
    const scan = resolveFunction("scanXmlPrograms");
    if (!scan) return;
    try { await scan(); }
    catch (error) { console.warn("No se pudo refrescar el documento después de la importación.", error); }
  }

  function loadScriptOnce(selector, src, datasetKey) {
    const existing = document.querySelector(selector);
    if (existing) return new Promise((resolve) => {
      if (existing.dataset.loaded === "1") return resolve();
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", resolve, { once: true });
      setTimeout(resolve, 1200);
    });
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = src;
      script.dataset[datasetKey] = "true";
      script.addEventListener("load", () => { script.dataset.loaded = "1"; resolve(); }, { once: true });
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
        for (let i = 0; i < 30 && !document.getElementById("tns-import-progress-style"); i += 1) {
          await new Promise((resolve) => setTimeout(resolve, 30));
        }
      });
    }
    await progressPromise;
  }

  async function ensureGallery() {
    if (window.TnsImageGallery?.openGallery) return window.TnsImageGallery;
    if (!galleryPromise) {
      galleryPromise = loadScriptOnce(
        'script[data-tns-image-gallery-continuous="1"]',
        "./image-gallery-continuous.js?v=20260827-gallery-one-v1",
        "tnsImageGalleryContinuous"
      ).then(async () => {
        for (let i = 0; i < 40 && !window.TnsImageGallery?.openGallery; i += 1) {
          await new Promise((resolve) => setTimeout(resolve, 30));
        }
        return window.TnsImageGallery || null;
      });
    }
    return galleryPromise;
  }

  function armSingleGallery(count) {
    pendingSingleGallery = Number(count) === 1 ? 1 : 0;
  }

  const overlayObserver = new MutationObserver((records) => {
    if (!pendingSingleGallery) return;
    for (const record of records) {
      for (const node of record.removedNodes) {
        if (!(node instanceof Element) || node.id !== "tns-import-progress-overlay") continue;
        const count = pendingSingleGallery;
        pendingSingleGallery = 0;
        setTimeout(async () => {
          const gallery = await ensureGallery();
          await gallery?.openGallery?.(count);
        }, 120);
        return;
      }
    }
  });

  function makePicker(accept, multiple = false) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = multiple;
    input.hidden = true;
    input.setAttribute("aria-hidden", "true");
    document.body.appendChild(input);
    return input;
  }

  function getAddImage() {
    const addImage = resolveFunction("addImageWidgetToStage");
    if (!addImage) throw new Error("La función addImageWidgetToStage no está disponible.");
    return addImage;
  }

  function reopenDocumentInspector(backdrop) {
    if (!backdrop?.isConnected) return;
    const reopen = () => {
      const openInspector = resolveFunction("openDocumentInspector");
      if (openInspector) Promise.resolve(openInspector()).catch((error) => log(`ERROR refrescando Document Inspector: ${error?.message || error}`));
    };
    const close = resolveFunction("closeModal");
    if (close) close(backdrop, reopen);
    else { backdrop.remove(); reopen(); }
  }

  async function importImages(files, button, inspectorBackdrop) {
    if (imageBusy || !files.length) return;
    imageBusy = true;
    const originalText = button.textContent;
    const originallyDisabled = button.disabled;
    button.disabled = true;
    let added = 0;
    const failed = [];

    try {
      await ensureProgressStepper();
      await ensureGallery();
      log(`Carga múltiple de imágenes: ${files.length} archivo(s).`);
      await ensureProject();
      const addImage = getAddImage();

      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        button.textContent = `Imagen ${i + 1}/${files.length}`;
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
      armSingleGallery(added);
      if (inspectorBackdrop) reopenDocumentInspector(inspectorBackdrop);
    } catch (error) {
      log(`ERROR carga múltiple de imágenes: ${error?.message || error}`);
    } finally {
      button.textContent = originalText;
      button.disabled = originallyDisabled;
      imageBusy = false;
    }
  }

  function openImagePicker(button) {
    const input = makePicker(IMAGE_ACCEPT, true);
    const inspectorBackdrop = button.id === INSPECTOR_IMAGE_ID ? button.closest(".modal-backdrop") : null;
    const cleanup = () => input.remove();
    input.addEventListener("change", async () => {
      const files = Array.from(input.files || []);
      try { if (files.length) await importImages(files, button, inspectorBackdrop); }
      finally { cleanup(); }
    }, { once: true });
    input.addEventListener("cancel", cleanup, { once: true });
    input.click();
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
        if (!window.pdfjsLib?.getDocument) return reject(new Error("PDF.js cargó, pero pdfjsLib no está disponible."));
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
    }).catch((error) => { pdfJsPromise = null; throw error; });
    return pdfJsPromise;
  }

  function safePdfBaseName(name) {
    return String(name || "documento").replace(/\.pdf$/i, "").replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "documento";
  }

  function canvasToPngBlob(canvas) {
    return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("No se pudo convertir la página PDF a PNG.")), "image/png"));
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
      return new File([blob], `${safePdfBaseName(pdfName)}_pagina_${String(pageNumber).padStart(digits, "0")}.png`, { type: "image/png" });
    } finally {
      page.cleanup?.();
      canvas.width = 1;
      canvas.height = 1;
    }
  }

  function resolvePdfPageCount(totalPages, fileName) {
    if (totalPages <= PDF_PAGE_WARNING) return totalPages;
    return window.confirm(`El PDF "${fileName}" tiene ${totalPages} páginas.\n\nImportar todas puede crear un TNS muy grande y consumir bastante memoria.\n\nAceptar: importar las ${totalPages} páginas.\nCancelar: no importar este PDF.`) ? totalPages : 0;
  }

  async function importPdf(file, button, inspectorBackdrop) {
    if (pdfBusy || !file) return;
    pdfBusy = true;
    const originalText = button.textContent;
    const originallyDisabled = button.disabled;
    button.disabled = true;
    button.textContent = "Abriendo PDF...";
    let pdf = null;
    let added = 0;
    const failed = [];

    try {
      await ensureProgressStepper();
      await ensureGallery();
      log(`PDF: abriendo ${file.name}...`);
      await ensureProject();
      const pdfjs = await loadPdfJs();
      pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      const pages = resolvePdfPageCount(pdf.numPages, file.name);
      if (!pages) { log(`PDF cancelado: ${file.name}.`); return; }
      log(`PDF ${file.name}: ${pdf.numPages} página(s); se importarán ${pages}. Cada página se convertirá usando el mismo pipeline de Add image.`);
      const addImage = getAddImage();

      for (let pageNumber = 1; pageNumber <= pages; pageNumber += 1) {
        button.textContent = `PDF ${pageNumber}/${pages}`;
        log(`PDF página ${pageNumber}/${pages}: renderizando...`);
        try {
          await addImage(await renderPdfPageAsFile(pdf, pageNumber, file.name));
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
      armSingleGallery(added);
      if (inspectorBackdrop) reopenDocumentInspector(inspectorBackdrop);
    } catch (error) {
      log(`ERROR importando PDF: ${error?.message || error}`);
    } finally {
      try { await pdf?.destroy?.(); } catch (_error) {}
      button.textContent = originalText;
      button.disabled = originallyDisabled;
      pdfBusy = false;
    }
  }

  function openPdfPicker(button) {
    const input = makePicker(PDF_ACCEPT, false);
    const inspectorBackdrop = button.id === INSPECTOR_PDF_ID ? button.closest(".modal-backdrop") : null;
    const cleanup = () => input.remove();
    input.addEventListener("change", async () => {
      const file = input.files?.[0] || null;
      try { if (file) await importPdf(file, button, inspectorBackdrop); }
      finally { cleanup(); }
    }, { once: true });
    input.addEventListener("cancel", cleanup, { once: true });
    input.click();
  }

  function ensurePdfButton(imageId, pdfId) {
    if (document.getElementById(pdfId)) return;
    const imageButton = document.getElementById(imageId);
    if (!imageButton?.parentElement) return;
    const button = document.createElement("button");
    button.type = "button";
    button.id = pdfId;
    button.className = imageButton.className || "menu-action";
    button.textContent = "Agregar PDF";
    button.title = "Convierte cada página del PDF a imagen y crea una card por página";
    imageButton.insertAdjacentElement("afterend", button);
  }

  function cleanAndEnsureButtons() {
    document.getElementById(LEGACY_SYNTAX_PDF_ID)?.remove();
    ensurePdfButton(SYNTAX_IMAGE_ID, SYNTAX_PDF_ID);
    ensurePdfButton(INSPECTOR_IMAGE_ID, INSPECTOR_PDF_ID);
  }

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("button") : null;
    if (!target || target.disabled) return;

    if (target.id === SYNTAX_IMAGE_ID || target.id === INSPECTOR_IMAGE_ID) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openImagePicker(target);
      return;
    }

    if (target.id === SYNTAX_PDF_ID || target.id === INSPECTOR_PDF_ID) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openPdfPicker(target);
    }
  }, true);

  const install = async () => {
    cleanAndEnsureButtons();
    await ensureGallery();
    if (document.body) {
      overlayObserver.observe(document.body, { childList: true, subtree: true });
      const buttonsObserver = new MutationObserver(cleanAndEnsureButtons);
      buttonsObserver.observe(document.body, { childList: true, subtree: true });
    }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
