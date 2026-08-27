(() => {
  "use strict";

  const IMAGE_BUTTON_ID = "file-page-add-image";
  const PDF_BUTTON_ID = "file-page-add-pdf";
  const INSPECTOR_IMAGE_BUTTON_ID = "add-image-widget";
  const INSPECTOR_PDF_BUTTON_ID = "add-pdf-widget";
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

  function log(message) {
    try {
      if (typeof xmlLog === "function") xmlLog(message);
      else console.info(message);
    } catch (_error) {
      console.info(message);
    }
  }

  function ensureImageGalleryModule() {
    if (document.querySelector('script[data-tns-image-gallery="1"]')) return;
    const script = document.createElement("script");
    script.src = "./image-gallery.js?v=20260826-image-gallery-v1";
    script.async = true;
    script.dataset.tnsImageGallery = "1";
    script.addEventListener("error", () => console.warn("No se pudo cargar image-gallery.js."), { once: true });
    document.head.append(script);
  }

  function getAddImageFn() {
    if (typeof addImageWidgetToStage === "function") return addImageWidgetToStage;
    if (typeof window.addImageWidgetToStage === "function") return window.addImageWidgetToStage;
    throw new Error("La función addImageWidgetToStage no está disponible.");
  }

  async function ensureProject() {
    if (typeof ensureXmlProjectForPageCreation === "function") {
      await ensureXmlProjectForPageCreation();
    }
  }

  async function refreshAfterBatch() {
    if (typeof scanXmlPrograms === "function") {
      try {
        await scanXmlPrograms();
      } catch (error) {
        console.warn("No se pudo refrescar el inspector después de la importación.", error);
      }
    }
  }

  function makePicker(accept, multiple = false) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = multiple;
    input.hidden = true;
    input.setAttribute("aria-hidden", "true");
    document.body.append(input);
    return input;
  }

  async function addImageBatch(files, button) {
    if (imageBusy || !files.length) return;
    const addImage = getAddImageFn();

    imageBusy = true;
    const originalText = button.textContent;
    const originallyDisabled = button.disabled;
    button.disabled = true;
    let added = 0;
    const failed = [];

    try {
      await ensureProject();
      log(`Carga múltiple de imágenes: ${files.length} archivo(s).`);

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        button.textContent = `Imagen ${index + 1}/${files.length}`;
        log(`Imagen ${index + 1}/${files.length}: ${file.name}`);
        try {
          await addImage(file);
          added += 1;
        } catch (error) {
          failed.push({ name: file.name, message: error?.message || String(error) });
          log(`ERROR imagen ${file.name}: ${error?.message || error}`);
        }
      }

      await refreshAfterBatch();
      if (failed.length) {
        log(`Carga múltiple terminada: ${added}/${files.length} imágenes agregadas; ${failed.length} con error.`);
      } else {
        log(`Carga múltiple terminada: ${added} imágenes agregadas, una card por imagen.`);
      }
    } finally {
      button.textContent = originalText;
      button.disabled = originallyDisabled;
      imageBusy = false;
    }
  }

  function openMultiImagePicker(button) {
    const input = makePicker(IMAGE_ACCEPT, true);
    const cleanup = () => input.remove();

    input.addEventListener("change", async () => {
      const files = Array.from(input.files || []);
      try {
        await addImageBatch(files, button);
      } catch (error) {
        log(`ERROR carga múltiple de imágenes: ${error?.message || error}`);
      } finally {
        cleanup();
      }
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
      document.head.append(script);
    }).catch((error) => {
      pdfJsPromise = null;
      throw error;
    });

    return pdfJsPromise;
  }

  function safePdfBaseName(name) {
    const base = String(name || "documento")
      .replace(/\.pdf$/i, "")
      .replace(/[^A-Za-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48);
    return base || "documento";
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
    const baseViewport = page.getViewport({ scale: 1 });
    const widthScale = PDF_TARGET_WIDTH / Math.max(1, baseViewport.width);
    const scale = Math.max(0.65, Math.min(PDF_MAX_SCALE, widthScale));
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(viewport.width));
    canvas.height = Math.max(1, Math.ceil(viewport.height));
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D no disponible para renderizar PDF.");

    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    try {
      await page.render({
        canvasContext: ctx,
        viewport,
        background: "rgb(255,255,255)",
      }).promise;

      const blob = await canvasToPngBlob(canvas);
      const baseName = safePdfBaseName(pdfName);
      const digits = String(pdf.numPages).length;
      const pageLabel = String(pageNumber).padStart(digits, "0");
      return new File([blob], `${baseName}_pagina_${pageLabel}.png`, { type: "image/png" });
    } finally {
      page.cleanup?.();
      canvas.width = 1;
      canvas.height = 1;
    }
  }

  function resolvePdfPageCount(totalPages, fileName) {
    if (totalPages <= PDF_PAGE_WARNING) return totalPages;
    const message = `El PDF "${fileName}" tiene ${totalPages} páginas.\n\nImportar todas puede crear un TNS muy grande y consumir bastante memoria.\n\nAceptar: importar las ${totalPages} páginas.\nCancelar: no importar este PDF.`;
    return window.confirm(message) ? totalPages : 0;
  }

  async function importPdf(file, button) {
    if (pdfBusy || !file) return;
    const addImage = getAddImageFn();
    const pdfjs = await loadPdfJs();

    pdfBusy = true;
    const originalText = button.textContent;
    const originallyDisabled = button.disabled;
    button.disabled = true;
    let pdf = null;
    let added = 0;
    const failed = [];

    try {
      await ensureProject();
      button.textContent = "Abriendo PDF...";
      log(`PDF: abriendo ${file.name}...`);

      const data = new Uint8Array(await file.arrayBuffer());
      const task = pdfjs.getDocument({ data });
      pdf = await task.promise;

      const pagesToImport = resolvePdfPageCount(pdf.numPages, file.name);
      if (!pagesToImport) {
        log(`PDF cancelado: ${file.name}.`);
        return;
      }

      log(`PDF ${file.name}: ${pdf.numPages} página(s); se importarán ${pagesToImport}. Cada página se convertirá usando el mismo pipeline de Add image.`);

      for (let pageNumber = 1; pageNumber <= pagesToImport; pageNumber += 1) {
        button.textContent = `PDF ${pageNumber}/${pagesToImport}`;
        log(`PDF página ${pageNumber}/${pagesToImport}: renderizando...`);
        try {
          const imageFile = await renderPdfPageAsFile(pdf, pageNumber, file.name);
          await addImage(imageFile);
          added += 1;
          log(`PDF página ${pageNumber}/${pagesToImport}: card creada.`);
        } catch (error) {
          failed.push({ page: pageNumber, message: error?.message || String(error) });
          log(`ERROR PDF página ${pageNumber}: ${error?.message || error}`);
        }

        await new Promise((resolve) => requestAnimationFrame(() => resolve()));
      }

      await refreshAfterBatch();
      if (failed.length) {
        log(`PDF terminado: ${added}/${pagesToImport} páginas agregadas como cards; ${failed.length} con error.`);
      } else {
        log(`PDF terminado: ${added} páginas agregadas, una card por página.`);
      }
    } finally {
      try { await pdf?.destroy?.(); } catch (_error) {}
      button.textContent = originalText;
      button.disabled = originallyDisabled;
      pdfBusy = false;
    }
  }

  function reopenDocumentInspector(backdrop) {
    if (!backdrop?.isConnected) return;
    const reopen = () => {
      if (typeof openDocumentInspector === "function") {
        Promise.resolve(openDocumentInspector()).catch((error) => {
          log(`ERROR refrescando Document Inspector: ${error?.message || error}`);
        });
      }
    };
    if (typeof closeModal === "function") closeModal(backdrop, reopen);
    else {
      backdrop.remove();
      reopen();
    }
  }

  function openPdfPicker(button) {
    const input = makePicker(PDF_ACCEPT, false);
    const cleanup = () => input.remove();
    const inspectorBackdrop = button.id === INSPECTOR_PDF_BUTTON_ID
      ? button.closest(".modal-backdrop")
      : null;

    input.addEventListener("change", async () => {
      const file = input.files?.[0] || null;
      let finished = false;
      try {
        if (!file) return;
        await importPdf(file, button);
        finished = true;
      } catch (error) {
        log(`ERROR importando PDF: ${error?.message || error}`);
      } finally {
        cleanup();
        if (finished && inspectorBackdrop) reopenDocumentInspector(inspectorBackdrop);
      }
    }, { once: true });

    input.addEventListener("cancel", cleanup, { once: true });
    input.click();
  }

  function ensurePdfButtonAfter(imageButtonId, pdfButtonId) {
    if (document.getElementById(pdfButtonId)) return true;
    const imageButton = document.getElementById(imageButtonId);
    if (!imageButton?.parentElement) return false;

    const button = document.createElement("button");
    button.type = "button";
    button.id = pdfButtonId;
    button.className = imageButton.className || "menu-action";
    button.textContent = "Agregar PDF";
    button.title = "Convierte cada página del PDF a imagen y crea una card por página";
    imageButton.insertAdjacentElement("afterend", button);
    return true;
  }

  function ensurePdfButtons() {
    ensurePdfButtonAfter(IMAGE_BUTTON_ID, PDF_BUTTON_ID);
    ensurePdfButtonAfter(INSPECTOR_IMAGE_BUTTON_ID, INSPECTOR_PDF_BUTTON_ID);
  }

  document.addEventListener("click", (event) => {
    const imageButton = event.target.closest?.(`#${IMAGE_BUTTON_ID}`);
    if (imageButton && !imageButton.disabled) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openMultiImagePicker(imageButton);
      return;
    }

    const pdfButton = event.target.closest?.(`#${PDF_BUTTON_ID}, #${INSPECTOR_PDF_BUTTON_ID}`);
    if (pdfButton && !pdfButton.disabled) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openPdfPicker(pdfButton);
    }
  }, true);

  const install = () => {
    ensureImageGalleryModule();
    ensurePdfButtons();
    const observer = new MutationObserver(() => ensurePdfButtons());
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();