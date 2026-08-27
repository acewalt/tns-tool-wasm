(() => {
  "use strict";

  const ORIGINAL_BUTTON_ID = "file-page-add-pdf";
  const BUTTON_ID = "file-page-add-pdf-syntax-v2";
  const PDF_ACCEPT = "application/pdf,.pdf";
  const PDFJS_VERSION = "3.11.174";
  const PDFJS_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
  const PDFJS_WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;
  const PDF_PAGE_WARNING = 30;
  const PDF_TARGET_WIDTH = 720;
  const PDF_MAX_SCALE = 1.6;

  let busy = false;
  let pdfJsPromise = null;

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

  async function ensureProject() {
    const ensure = resolveFunction("ensureXmlProjectForPageCreation");
    if (ensure) await ensure();
  }

  async function refreshAfterImport() {
    const scan = resolveFunction("scanXmlPrograms");
    if (!scan) return;
    try {
      await scan();
    } catch (error) {
      console.warn("No se pudo refrescar el inspector después del PDF.", error);
    }
  }

  function getAddImage() {
    const addImage = resolveFunction("addImageWidgetToStage");
    if (!addImage) throw new Error("La función addImageWidgetToStage no está disponible.");
    return addImage;
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

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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
    if (busy || !file) return;
    busy = true;

    const originalText = button.textContent;
    const originallyDisabled = button.disabled;
    button.disabled = true;
    button.textContent = "Abriendo PDF...";

    let pdf = null;
    let added = 0;
    const failed = [];

    try {
      // These messages intentionally use the same protocol consumed by
      // import-progress-stepper.js so this route gets the exact same overlay.
      log(`PDF: abriendo ${file.name}...`);
      await ensureProject();

      const pdfjs = await loadPdfJs();
      const data = new Uint8Array(await file.arrayBuffer());
      pdf = await pdfjs.getDocument({ data }).promise;

      const pagesToImport = resolvePdfPageCount(pdf.numPages, file.name);
      if (!pagesToImport) {
        log(`PDF cancelado: ${file.name}.`);
        return;
      }

      log(`PDF ${file.name}: ${pdf.numPages} página(s); se importarán ${pagesToImport}. Cada página se convertirá usando el mismo pipeline de Add image.`);

      const addImage = getAddImage();
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

        await new Promise((resolve) => requestAnimationFrame(resolve));
      }

      await refreshAfterImport();
      log(`PDF terminado: ${added}/${pagesToImport} páginas agregadas como cards; ${failed.length} con error.`);
    } catch (error) {
      log(`ERROR importando PDF: ${error?.message || error}`);
      throw error;
    } finally {
      try { await pdf?.destroy?.(); } catch (_error) {}
      button.textContent = originalText;
      button.disabled = originallyDisabled;
      busy = false;
    }
  }

  function makePicker() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = PDF_ACCEPT;
    input.hidden = true;
    input.setAttribute("aria-hidden", "true");
    document.body.appendChild(input);
    return input;
  }

  function openPicker(button) {
    const input = makePicker();
    const cleanup = () => input.remove();

    input.addEventListener("change", async () => {
      const file = input.files?.[0] || null;
      try {
        if (file) await importPdf(file, button);
      } catch (error) {
        console.error(error);
      } finally {
        cleanup();
      }
    }, { once: true });

    input.addEventListener("cancel", cleanup, { once: true });
    input.click();
  }

  function install() {
    if (document.documentElement.dataset.syntaxPdfImportV2 === "1") return;

    const button = document.getElementById(ORIGINAL_BUTTON_ID) || document.getElementById(BUTTON_ID);
    if (!button) return;

    // multi-image-upload.js has already installed by window.load. Renaming the
    // static Syntax Doctor button now prevents its old delegated PDF handler
    // from competing with this dedicated flow. Document Inspector keeps using
    // the original shared handler unchanged.
    button.id = BUTTON_ID;
    document.documentElement.dataset.syntaxPdfImportV2 = "1";

    button.addEventListener("click", (event) => {
      if (button.disabled || busy) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openPicker(button);
    }, true);
  }

  if (document.readyState === "complete") install();
  else window.addEventListener("load", install, { once: true });
})();
