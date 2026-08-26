(() => {
  "use strict";

  const STYLE_ID = "tns-image-gallery-style";
  const CHIP_CLASS = "tns-image-gallery-chip";
  const GALLERY_BACKDROP_CLASS = "tns-image-gallery-backdrop";
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  let opening = false;

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .${CHIP_CLASS} {
        cursor: pointer !important;
        color: #17320a !important;
        background: linear-gradient(135deg, #b8ff47 0%, #91ee20 100%) !important;
        border-color: rgba(181, 255, 74, .9) !important;
        box-shadow: 0 0 0 1px rgba(179, 255, 69, .18), 0 0 18px rgba(139, 238, 32, .22) !important;
        transition: transform 120ms ease, box-shadow 160ms ease, filter 160ms ease !important;
        user-select: none;
        -webkit-user-select: none;
      }
      .${CHIP_CLASS}:hover,
      .${CHIP_CLASS}:focus-visible {
        filter: brightness(1.06);
        box-shadow: 0 0 0 2px rgba(190, 255, 90, .34), 0 0 24px rgba(139, 238, 32, .32) !important;
        outline: none;
      }
      .${CHIP_CLASS}:active { transform: translateY(1px) scale(.985); }

      .tns-image-gallery-modal {
        width: min(980px, calc(100vw - 34px)) !important;
        max-width: 980px !important;
        height: min(880px, calc(100vh - 34px));
        max-height: calc(100vh - 34px) !important;
        padding: 0 !important;
        overflow: hidden !important;
        display: flex;
        flex-direction: column;
      }
      .tns-image-gallery-header {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        padding: 20px 22px 16px;
        border-bottom: 1px solid rgba(111, 139, 176, .28);
        background: rgba(14, 25, 43, .98);
      }
      .tns-image-gallery-heading { min-width: 0; }
      .tns-image-gallery-heading h2 { margin: 0 0 4px; }
      .tns-image-gallery-heading p {
        margin: 0;
        color: #91a5bf;
        font-size: 13px;
      }
      .tns-image-gallery-close { flex: 0 0 auto; }
      .tns-image-gallery-scroll {
        flex: 1 1 auto;
        min-height: 0;
        overflow: auto;
        overscroll-behavior: contain;
        padding: 20px 22px 30px;
        scroll-behavior: smooth;
      }
      .tns-image-gallery-list {
        width: min(760px, 100%);
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 22px;
      }
      .tns-image-gallery-item {
        border: 1px solid rgba(72, 96, 130, .62);
        border-radius: 13px;
        background: rgba(10, 20, 36, .82);
        overflow: hidden;
        box-shadow: 0 9px 28px rgba(0, 0, 0, .2);
      }
      .tns-image-gallery-item-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 10px 13px;
        border-bottom: 1px solid rgba(72, 96, 130, .42);
      }
      .tns-image-gallery-item-name {
        min-width: 0;
        display: flex;
        align-items: baseline;
        gap: 9px;
      }
      .tns-image-gallery-index {
        flex: 0 0 auto;
        color: #9fed38;
        font-weight: 800;
        font-size: 12px;
      }
      .tns-image-gallery-filename {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #e3edf9;
        font-weight: 700;
      }
      .tns-image-gallery-open-one {
        flex: 0 0 auto;
        min-height: 30px !important;
        padding: 5px 10px !important;
        font-size: 12px !important;
      }
      .tns-image-gallery-stage {
        min-height: 264px;
        display: grid;
        place-items: center;
        padding: 12px;
        background:
          radial-gradient(circle at 50% 50%, rgba(42, 67, 99, .22), transparent 70%),
          rgba(5, 13, 25, .66);
      }
      .tns-image-gallery-stage canvas {
        display: block;
        max-width: 100% !important;
        height: auto !important;
        border-radius: 2px;
        box-shadow: 0 8px 22px rgba(0, 0, 0, .34);
      }
      .tns-image-gallery-loading,
      .tns-image-gallery-error,
      .tns-image-gallery-empty {
        padding: 28px 18px;
        text-align: center;
        color: #8fa5c0;
      }
      .tns-image-gallery-error { color: #ff9f9f; }
      .tns-image-gallery-empty { font-size: 14px; }

      @media (max-width: 640px) {
        .tns-image-gallery-modal {
          width: calc(100vw - 16px) !important;
          height: calc(100vh - 16px);
          max-height: calc(100vh - 16px) !important;
        }
        .tns-image-gallery-header { padding: 14px 14px 12px; }
        .tns-image-gallery-scroll { padding: 13px 10px 22px; }
        .tns-image-gallery-list { gap: 14px; }
        .tns-image-gallery-item-head { align-items: flex-start; }
        .tns-image-gallery-item-name { flex-direction: column; gap: 2px; }
        .tns-image-gallery-stage { min-height: 0; padding: 8px; }
      }
    `;
    document.head.append(style);
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

  function globalValue(name) {
    if (Object.prototype.hasOwnProperty.call(window, name) && window[name] != null) return window[name];
    try { return (0, eval)(name); }
    catch (_error) { return null; }
  }

  function closeGallery(backdrop) {
    if (!backdrop?.isConnected) return;
    const closeModalFn = globalValue("closeModal");
    if (typeof closeModalFn === "function") closeModalFn(backdrop);
    else backdrop.remove();
  }

  function imageItemsFromReport(report) {
    return (Array.isArray(report?.items) ? report.items : [])
      .filter((item) => item?.type === "Resource" && item?.detail?.image_file)
      .sort((a, b) => collator.compare(String(a.name || ""), String(b.name || "")));
  }

  async function readImageCanvas(item) {
    const runtime = globalValue("pyodide");
    const renderer = globalValue("renderImageBytesToCanvas");
    if (!runtime?.FS?.readFile) throw new Error("Pyodide FS no está disponible.");
    if (typeof renderer !== "function") throw new Error("El renderer de imágenes no está disponible.");
    const path = item?.detail?.image_file || item?.file || "";
    if (!path) throw new Error("La imagen no tiene una ruta de recurso.");
    const bytes = runtime.FS.readFile(path);
    return renderer(bytes, item?.name || path);
  }

  function drawGalleryFrame(target, source, item) {
    const drawFrame = globalValue("drawImageCalculatorFrame");
    if (typeof drawFrame === "function") {
      drawFrame(target, source, { x: 0, y: 0 }, item?.name || "image");
      return;
    }
    target.width = source.width;
    target.height = source.height;
    target.getContext("2d").drawImage(source, 0, 0);
  }

  function openIndividual(item) {
    const showImage = globalValue("showImageModal");
    if (typeof showImage === "function") showImage(item);
  }

  async function renderGalleryItems(list, images) {
    for (let index = 0; index < images.length; index += 1) {
      const item = images[index];
      const article = document.createElement("article");
      article.className = "tns-image-gallery-item";
      article.innerHTML = `
        <div class="tns-image-gallery-item-head">
          <div class="tns-image-gallery-item-name">
            <span class="tns-image-gallery-index">${index + 1} / ${images.length}</span>
            <span class="tns-image-gallery-filename" title="${escapeHtml(item?.name || "")}">${escapeHtml(item?.name || `Imagen ${index + 1}`)}</span>
          </div>
          <button type="button" class="tns-image-gallery-open-one green-tool-button">Ver individual</button>
        </div>
        <div class="tns-image-gallery-stage"><div class="tns-image-gallery-loading">Cargando imagen…</div></div>`;
      list.append(article);
      article.querySelector(".tns-image-gallery-open-one")?.addEventListener("click", () => openIndividual(item));

      const stage = article.querySelector(".tns-image-gallery-stage");
      try {
        const source = await readImageCanvas(item);
        const frame = document.createElement("canvas");
        frame.className = "tns-image-gallery-calculator";
        frame.setAttribute("aria-label", `Vista calculadora: ${item?.name || `imagen ${index + 1}`}`);
        drawGalleryFrame(frame, source, item);
        stage.replaceChildren(frame);
        // The framed 320x240 canvas is now self-contained; release the larger source canvas.
        source.width = 1;
        source.height = 1;
      } catch (error) {
        stage.innerHTML = `<div class="tns-image-gallery-error">ERROR: ${escapeHtml(error?.message || String(error))}</div>`;
      }

      // Keep large PDF/image batches responsive while the gallery is being built.
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  }

  async function openGallery(expectedCount = 0) {
    if (opening) return;
    opening = true;
    try {
      document.querySelector(`.${GALLERY_BACKDROP_CLASS}`)?.remove();
      const inspect = globalValue("inspectXmlDocument");
      if (typeof inspect !== "function") throw new Error("El inspector de documento no está disponible.");

      const report = await inspect();
      const images = imageItemsFromReport(report);
      if (images.length <= 1) return;

      const backdrop = document.createElement("div");
      backdrop.className = `modal-backdrop ${GALLERY_BACKDROP_CLASS}`;
      backdrop.innerHTML = `
        <div class="modal tns-image-gallery-modal" role="dialog" aria-modal="true" aria-label="Vista de imágenes">
          <div class="tns-image-gallery-header">
            <div class="tns-image-gallery-heading">
              <h2>Images: ${images.length}</h2>
              <p>${images.length} imágenes · vista calculadora continua</p>
            </div>
            <button type="button" class="tns-image-gallery-close">Cerrar</button>
          </div>
          <div class="tns-image-gallery-scroll">
            <div class="tns-image-gallery-list"></div>
          </div>
        </div>`;
      document.body.append(backdrop);

      const closeButton = backdrop.querySelector(".tns-image-gallery-close");
      closeButton?.addEventListener("click", () => closeGallery(backdrop));
      backdrop.addEventListener("click", (event) => {
        if (event.target === backdrop) closeGallery(backdrop);
      });
      const escapeHandler = (event) => {
        if (!backdrop.isConnected) {
          document.removeEventListener("keydown", escapeHandler);
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          closeGallery(backdrop);
          document.removeEventListener("keydown", escapeHandler);
        }
      };
      document.addEventListener("keydown", escapeHandler);

      const list = backdrop.querySelector(".tns-image-gallery-list");
      if (!list) return;
      if (expectedCount && expectedCount !== images.length) {
        const heading = backdrop.querySelector(".tns-image-gallery-heading p");
        if (heading) heading.textContent = `${images.length} imágenes actuales · vista calculadora continua`;
      }
      await renderGalleryItems(list, images);
    } catch (error) {
      console.error("Image gallery:", error);
      const showText = globalValue("showTextModal");
      if (typeof showText === "function") showText("Images", `ERROR: ${error?.message || error}`);
    } finally {
      opening = false;
    }
  }

  function parseImageCount(text) {
    const match = /^\s*Images\s*:\s*(\d+)\s*$/i.exec(String(text || ""));
    return match ? Number(match[1]) : null;
  }

  function bindImageChip(element, count) {
    if (!element || count <= 1 || element.dataset.tnsImageGalleryBound === "1") return;
    element.dataset.tnsImageGalleryBound = "1";
    element.classList.add(CHIP_CLASS);
    element.setAttribute("role", "button");
    element.setAttribute("tabindex", "0");
    element.setAttribute("aria-label", `Ver las ${count} imágenes del documento`);
    element.setAttribute("title", `Ver las ${count} imágenes de corrido`);
    element.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openGallery(count);
    });
    element.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      openGallery(count);
    });
  }

  function decorateInspectorImageChip(root = document) {
    const inspectorModals = root === document
      ? Array.from(document.querySelectorAll(".modal-backdrop .inspector-modal"))
      : [root.closest?.(".inspector-modal"), ...Array.from(root.querySelectorAll?.(".inspector-modal") || [])].filter(Boolean);

    for (const modal of new Set(inspectorModals)) {
      // Single-image viewer is also an inspector-modal; it simply has no Images:N chip.
      for (const element of modal.querySelectorAll("span, div, button, strong")) {
        if (element.children.length) continue;
        const count = parseImageCount(element.textContent);
        if (count == null) continue;
        if (count > 1) bindImageChip(element, count);
        break;
      }
    }
  }

  installStyles();
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        decorateInspectorImageChip(node);
      }
    }
  });

  const start = () => {
    decorateInspectorImageChip(document);
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
