(() => {
  "use strict";

  const BUTTON_ID = "file-page-add-image";
  const ACCEPT = "image/bmp,image/png,image/jpeg,.bmp,.png,.jpg,.jpeg";
  let busy = false;

  function log(message) {
    try {
      if (typeof xmlLog === "function") xmlLog(message);
      else console.info(message);
    } catch (_error) {
      console.info(message);
    }
  }

  function makePicker() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ACCEPT;
    input.multiple = true;
    input.hidden = true;
    input.setAttribute("aria-hidden", "true");
    document.body.append(input);
    return input;
  }

  async function refreshAfterBatch() {
    if (typeof scanXmlPrograms === "function") {
      try { await scanXmlPrograms(); }
      catch (error) { console.warn("No se pudo refrescar el inspector después del lote de imágenes.", error); }
    }
  }

  async function addImageBatch(files, button) {
    if (busy || !files.length) return;
    if (typeof addImageWidgetToStage !== "function") {
      throw new Error("La función addImageWidgetToStage no está disponible.");
    }

    busy = true;
    const originalText = button.textContent;
    const originallyDisabled = button.disabled;
    button.disabled = true;
    let added = 0;
    const failed = [];

    try {
      if (typeof ensureXmlProjectForPageCreation === "function") {
        await ensureXmlProjectForPageCreation();
      }

      log(`Carga múltiple de imágenes: ${files.length} archivo(s).`);

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        button.textContent = `Imagen ${index + 1}/${files.length}`;
        log(`Imagen ${index + 1}/${files.length}: ${file.name}`);
        try {
          await addImageWidgetToStage(file);
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
      busy = false;
    }
  }

  function openMultiImagePicker(button) {
    const input = makePicker();
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

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.(`#${BUTTON_ID}`);
    if (!button || button.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openMultiImagePicker(button);
  }, true);
})();
