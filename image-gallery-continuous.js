(() => {
  "use strict";

  const STYLE_ID = "tns-image-gallery-continuous-style";
  const CHIP_CLASS = "tns-image-gallery-chip";
  const BACKDROP_CLASS = "tns-image-gallery-backdrop";
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  let opening = false;

  function globalValue(name) {
    if (Object.prototype.hasOwnProperty.call(window, name) && window[name] != null) return window[name];
    try { return (0, eval)(name); } catch (_error) { return null; }
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[char]));
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .${CHIP_CLASS} {
        cursor: pointer !important;
        color: #17320a !important;
        background: linear-gradient(135deg,#b8ff47 0%,#91ee20 100%) !important;
        border-color: rgba(181,255,74,.9) !important;
        box-shadow: 0 0 0 1px rgba(179,255,69,.18),0 0 18px rgba(139,238,32,.22) !important;
      }
      .${CHIP_CLASS}:hover,.${CHIP_CLASS}:focus-visible {
        filter: brightness(1.06);
        box-shadow: 0 0 0 2px rgba(190,255,90,.34),0 0 24px rgba(139,238,32,.32) !important;
        outline: none;
      }
      .tns-image-gallery-modal {
        width: min(980px,calc(100vw - 34px)) !important;
        max-width: 980px !important;
        height: min(880px,calc(100vh - 34px));
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
        border-bottom: 1px solid rgba(111,139,176,.28);
        background: rgba(14,25,43,.98);
      }
      .tns-image-gallery-heading h2 { margin: 0 0 4px; }
      .tns-image-gallery-heading p { margin: 0; color:#91a5bf; font-size:13px; }
      .tns-image-gallery-scroll { flex:1 1 auto; min-height:0; overflow:auto; padding:20px 22px 30px; }
      .tns-image-gallery-list { width:min(760px,100%); margin:0 auto; display:flex; flex-direction:column; gap:22px; }
      .tns-image-gallery-item { border:1px solid rgba(72,96,130,.62); border-radius:13px; background:rgba(10,20,36,.82); overflow:hidden; }
      .tns-image-gallery-item-head { display:flex; align-items:center; justify-content:space-between; gap:14px; padding:10px 13px; border-bottom:1px solid rgba(72,96,130,.42); }
      .tns-image-gallery-item-name { min-width:0; display:flex; align-items:baseline; gap:9px; }
      .tns-image-gallery-index { color:#9fed38; font-weight:800; font-size:12px; }
      .tns-image-gallery-filename { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#e3edf9; font-weight:700; }
      .tns-image-gallery-stage { min-height:264px; display:grid; place-items:center; padding:12px; background:rgba(5,13,25,.66); }
      .tns-image-gallery-stage canvas { display:block; max-width:100%!important; height:auto!important; }
      .tns-image-gallery-loading,.tns-image-gallery-error,.tns-image-gallery-empty { padding:28px 18px; text-align:center; color:#8fa5c0; }
      .tns-image-gallery-error { color:#ff9f9f; }
      @media (max-width:640px) {
        .tns-image-gallery-modal { width:calc(100vw - 16px)!important; height:calc(100vh - 16px); max-height:calc(100vh - 16px)!important; }
        .tns-image-gallery-header { padding:14px; }
        .tns-image-gallery-scroll { padding:13px 10px 22px; }
        .tns-image-gallery-stage { min-height:0; padding:8px; }
      }
    `;
    document.head.appendChild(style);
  }

  function closeGallery(backdrop) {
    const closeModal = globalValue("closeModal");
    if (typeof closeModal === "function") closeModal(backdrop);
    else backdrop?.remove();
  }

  function imageItems(report) {
    return (Array.isArray(report?.items) ? report.items : [])
      .filter((item) => item?.type === "Resource" && item?.detail?.image_file)
      .sort((a,b) => collator.compare(String(a.name || ""), String(b.name || "")));
  }

  async function readImageCanvas(item) {
    const pyodide = globalValue("pyodide");
    const renderer = globalValue("renderImageBytesToCanvas");
    if (!pyodide?.FS?.readFile) throw new Error("Pyodide FS no está disponible.");
    if (typeof renderer !== "function") throw new Error("El renderer de imágenes no está disponible.");
    const path = item?.detail?.image_file || item?.file || "";
    if (!path) throw new Error("La imagen no tiene una ruta de recurso.");
    return renderer(pyodide.FS.readFile(path), item?.name || path);
  }

  function drawFrame(target, source, item) {
    const draw = globalValue("drawImageCalculatorFrame");
    if (typeof draw === "function") draw(target, source, { x:0, y:0 }, item?.name || "image");
    else {
      target.width = source.width;
      target.height = source.height;
      target.getContext("2d").drawImage(source,0,0);
    }
  }

  async function renderItems(list, images) {
    for (let i = 0; i < images.length; i += 1) {
      const item = images[i];
      const article = document.createElement("article");
      article.className = "tns-image-gallery-item";
      article.innerHTML = `
        <div class="tns-image-gallery-item-head">
          <div class="tns-image-gallery-item-name">
            <span class="tns-image-gallery-index">${i + 1} / ${images.length}</span>
            <span class="tns-image-gallery-filename">${escapeHtml(item?.name || `Imagen ${i + 1}`)}</span>
          </div>
          <button type="button" class="tns-image-gallery-open-one green-tool-button">Ver individual</button>
        </div>
        <div class="tns-image-gallery-stage"><div class="tns-image-gallery-loading">Cargando imagen…</div></div>`;
      list.append(article);
      article.querySelector(".tns-image-gallery-open-one")?.addEventListener("click", () => {
        const showImage = globalValue("showImageModal");
        if (typeof showImage === "function") showImage(item);
      });
      const stage = article.querySelector(".tns-image-gallery-stage");
      try {
        const source = await readImageCanvas(item);
        const frame = document.createElement("canvas");
        frame.className = "tns-image-gallery-calculator";
        drawFrame(frame, source, item);
        stage.replaceChildren(frame);
        source.width = 1;
        source.height = 1;
      } catch (error) {
        stage.innerHTML = `<div class="tns-image-gallery-error">ERROR: ${escapeHtml(error?.message || String(error))}</div>`;
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  }

  async function openGallery(expectedCount = 0) {
    if (opening) return;
    opening = true;
    try {
      document.querySelector(`.${BACKDROP_CLASS}`)?.remove();
      const inspect = globalValue("inspectXmlDocument");
      if (typeof inspect !== "function") throw new Error("El inspector de documento no está disponible.");
      const images = imageItems(await inspect());
      if (!images.length) return;

      const backdrop = document.createElement("div");
      backdrop.className = `modal-backdrop ${BACKDROP_CLASS}`;
      backdrop.innerHTML = `
        <div class="modal tns-image-gallery-modal" role="dialog" aria-modal="true" aria-label="Vista calculadora continua">
          <div class="tns-image-gallery-header">
            <div class="tns-image-gallery-heading">
              <h2>Images: ${images.length}</h2>
              <p>${images.length} ${images.length === 1 ? "imagen" : "imágenes"} · vista calculadora continua</p>
            </div>
            <button type="button" class="tns-image-gallery-close">Cerrar</button>
          </div>
          <div class="tns-image-gallery-scroll"><div class="tns-image-gallery-list"></div></div>
        </div>`;
      document.body.append(backdrop);
      backdrop.querySelector(".tns-image-gallery-close")?.addEventListener("click", () => closeGallery(backdrop));
      backdrop.addEventListener("click", (event) => { if (event.target === backdrop) closeGallery(backdrop); });
      const list = backdrop.querySelector(".tns-image-gallery-list");
      if (expectedCount && expectedCount !== images.length) {
        const p = backdrop.querySelector(".tns-image-gallery-heading p");
        if (p) p.textContent = `${images.length} ${images.length === 1 ? "imagen actual" : "imágenes actuales"} · vista calculadora continua`;
      }
      await renderItems(list, images);
    } catch (error) {
      console.error("Image gallery:", error);
    } finally {
      opening = false;
    }
  }

  function parseImageCount(text) {
    const match = /^\s*Images\s*:\s*(\d+)\s*$/i.exec(String(text || ""));
    return match ? Number(match[1]) : null;
  }

  function bindChip(element, count) {
    if (!element || count < 1 || element.dataset.tnsImageGalleryBound === "1") return;
    element.dataset.tnsImageGalleryBound = "1";
    element.classList.add(CHIP_CLASS);
    element.setAttribute("role", "button");
    element.setAttribute("tabindex", "0");
    const noun = count === 1 ? "imagen" : "imágenes";
    element.setAttribute("aria-label", `Ver ${count} ${noun} en vista calculadora continua`);
    element.setAttribute("title", `Ver ${count} ${noun} de corrido`);
    const activate = (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      openGallery(count);
    };
    element.addEventListener("click", activate);
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") activate(event);
    });
  }

  function decorate(root = document) {
    const modals = root === document
      ? Array.from(document.querySelectorAll(".modal-backdrop .inspector-modal"))
      : [root.closest?.(".inspector-modal"), ...Array.from(root.querySelectorAll?.(".inspector-modal") || [])].filter(Boolean);
    for (const modal of new Set(modals)) {
      for (const element of modal.querySelectorAll("span,div,button,strong")) {
        if (element.children.length) continue;
        const count = parseImageCount(element.textContent);
        if (count == null) continue;
        bindChip(element, count);
        break;
      }
    }
  }

  installStyles();
  const observer = new MutationObserver((records) => {
    for (const record of records) for (const node of record.addedNodes) if (node instanceof Element) decorate(node);
  });
  const start = () => {
    decorate(document);
    if (document.body) observer.observe(document.body,{ childList:true, subtree:true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once:true });
  else start();

  window.TnsImageGallery = Object.freeze({ openGallery, decorate });
})();
