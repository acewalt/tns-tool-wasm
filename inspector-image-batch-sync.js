(() => {
  "use strict";

  const INSPECTOR_IMAGE_BUTTON_ID = "add-image-widget";
  const IMAGE_ACCEPT = "image/bmp,image/png,image/jpeg,.bmp,.png,.jpg,.jpeg";
  let busy = false;

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
    const xmlLogger = resolveFunction("xmlLog");
    if (xmlLogger) {
      try {
        xmlLogger(message);
        return;
      } catch (_error) {}
    }
    console.info(message);
  }

  async function ensureProject() {
    const ensure = resolveFunction("ensureXmlProjectForPageCreation");
    if (ensure) await ensure();
  }

  async function refreshInspectorData() {
    const scan = resolveFunction("scanXmlPrograms");
    if (!scan) return;
    try {
      await scan();
    } catch (error) {
      console.warn("No se pudo refrescar el inspector después de la carga múltiple.", error);
    }
  }

  function reopenDocumentInspector(backdrop) {
    if (!backdrop?.isConnected) return;

    const reopen = () => {
      const openInspector = resolveFunction("openDocumentInspector");
      if (!openInspector) return;
      Promise.resolve(openInspector()).catch((error) => {
        log(`ERROR refrescando Document Inspector: ${error?.message || error}`);
      });
    };

    const close = resolveFunction("closeModal");
    if (close) close(backdrop, reopen);
    else {
      backdrop.remove();
      reopen();
    }
  }

  function makePicker() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = IMAGE_ACCEPT;
    input.multiple = true;
    input.hidden = true;
    input.setAttribute("aria-hidden", "true");
    document.body.appendChild(input);
    return input;
  }

  async function importImages(files, button, inspectorBackdrop) {
    if (busy || !files.length) return false;

    const addImage = resolveFunction("addImageWidgetToStage");
    if (!addImage) throw new Error("La función addImageWidgetToStage no está disponible.");

    busy = true;
    const originalText = button.textContent;
    const originallyDisabled = button.disabled;
    button.disabled = true;

    let added = 0;
    const failed = [];

    try {
      // Use the same log protocol as Syntax Doctor +Page so the animated
      // progress stepper receives identical real progress events.
      log(`Carga múltiple de imágenes: ${files.length} archivo(s).`);
      await ensureProject();

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

      await refreshInspectorData();

      if (failed.length) {
        log(`Carga múltiple terminada: ${added}/${files.length} imágenes agregadas; ${failed.length} con error.`);
      } else {
        log(`Carga múltiple terminada: ${added}/${files.length} imágenes agregadas; 0 con error.`);
      }

      if (inspectorBackdrop) reopenDocumentInspector(inspectorBackdrop);
      return true;
    } finally {
      button.textContent = originalText;
      button.disabled = originallyDisabled;
      busy = false;
    }
  }

  function openPicker(button) {
    const input = makePicker();
    const inspectorBackdrop = button.closest(".modal-backdrop");
    const cleanup = () => input.remove();

    input.addEventListener("change", async () => {
      const files = Array.from(input.files || []);
      try {
        if (!files.length) return;
        await importImages(files, button, inspectorBackdrop);
      } catch (error) {
        log(`ERROR carga múltiple de imágenes: ${error?.message || error}`);
      } finally {
        cleanup();
      }
    }, { once: true });

    input.addEventListener("cancel", cleanup, { once: true });
    input.click();
  }

  // The existing Document Inspector Add image action is single-file. Capture
  // it before the original handler and replace only that interaction with the
  // same multi-file workflow already used by Syntax Doctor -> +Page.
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element
      ? event.target.closest(`#${INSPECTOR_IMAGE_BUTTON_ID}`)
      : null;

    if (!target || target.disabled || busy) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openPicker(target);
  }, true);
})();
