(() => {
  "use strict";

  const OVERLAY_SELECTOR = "#tns-import-progress-overlay";
  const LANGS = ["es", "en", "fr"];

  const ROWS = [
    ["Procesando", "Processing", "Traitement"],
    ["Importando PDF", "Importing PDF", "Importation du PDF"],
    ["Añadiendo imagen", "Adding image", "Ajout d'une image"],
    ["Importando imágenes", "Importing images", "Importation des images"],
    ["Cada página se convierte en una imagen y se añade como una card del documento.", "Each page is converted into an image and added as a document card.", "Chaque page est convertie en image et ajoutée comme carte au document."],
    ["Las imágenes se preparan y se añaden al documento una por una.", "Images are prepared and added to the document one by one.", "Les images sont préparées et ajoutées au document une par une."],
    ["Preparar contenido", "Prepare content", "Préparer le contenu"],
    ["Pendiente", "Pending", "En attente"],
    ["Esperando los archivos seleccionados…", "Waiting for the selected files…", "En attente des fichiers sélectionnés…"],
    ["Crear cards", "Create cards", "Créer les cartes"],
    ["Todavía no se ha creado contenido.", "No content has been created yet.", "Aucun contenu n'a encore été créé."],
    ["Actualizar documento", "Update document", "Mettre à jour le document"],
    ["El inspector se actualizará al finalizar.", "The inspector will update when the process finishes.", "L'inspecteur sera mis à jour à la fin du processus."],
    ["Preparando la importación.", "Preparing import.", "Préparation de l'importation."],
    ["Puedes seguir trabajando cuando termine este proceso.", "You can continue working when this process is finished.", "Vous pourrez continuer à travailler lorsque ce processus sera terminé."],
    ["Cerrar", "Close", "Fermer"],
    ["Leyendo el archivo PDF…", "Reading the PDF file…", "Lecture du fichier PDF…"],
    ["Preparando archivos…", "Preparing files…", "Préparation des fichiers…"],
    ["Completado", "Completed", "Terminé"],
    ["En progreso", "In progress", "En cours"],
    ["En curso", "In progress", "En cours"],
    ["Con error", "Error", "Erreur"],
    ["Error", "Error", "Erreur"],
    ["Listo", "Ready", "Prêt"],
    ["Contenido preparado.", "Content prepared.", "Contenu préparé."],
    ["El documento se actualizará al terminar las cards.", "The document will update after the cards are created.", "Le document sera mis à jour une fois les cartes créées."],
    ["Creando contenido.", "Creating content.", "Création du contenu."],
    ["Procesando elementos…", "Processing items…", "Traitement des éléments…"],
    ["Importación en curso.", "Import in progress.", "Importation en cours."],
    ["Refrescando el documento y el inspector…", "Refreshing the document and inspector…", "Actualisation du document et de l'inspecteur…"],
    ["Cards listas.", "Cards ready.", "Cartes prêtes."],
    ["Actualizando la estructura final del documento…", "Updating the document's final structure…", "Mise à jour de la structure finale du document…"],
    ["Documento e inspector actualizados.", "Document and inspector updated.", "Document et inspecteur mis à jour."],
    ["Importación terminada con avisos.", "Import finished with warnings.", "Importation terminée avec des avertissements."],
    ["Importación completada.", "Import completed.", "Importation terminée."],
    ["Importación cancelada.", "Import cancelled.", "Importation annulée."],
    ["Archivo leído.", "File read.", "Fichier lu."],
    ["No se realizaron cambios finales.", "No final changes were made.", "Aucune modification finale n'a été effectuée."],
    ["No se pudo completar la importación.", "The import could not be completed.", "L'importation n'a pas pu être terminée."],
    ["La importación terminó con un error.", "The import ended with an error.", "L'importation s'est terminée avec une erreur."],
    ["Leyendo PDF…", "Reading PDF…", "Lecture du PDF…"],
    ["Leyendo PDF.", "Reading PDF.", "Lecture du PDF."],
    ["Preparando el documento para convertir sus páginas.", "Preparing the document to convert its pages.", "Préparation du document pour convertir ses pages."],
    ["Documento actualizado después de la carga múltiple.", "Document updated after the batch import.", "Document mis à jour après l'importation multiple."],
    ["PDF convertido y documento actualizado.", "PDF converted and document updated.", "PDF converti et document mis à jour."],
    ["Se canceló la importación de este PDF.", "This PDF import was cancelled.", "L'importation de ce PDF a été annulée."],
    ["Imagen", "Image", "Image"],
    ["Imagen preparada.", "Image prepared.", "Image préparée."],
    ["Actualizando el documento…", "Updating the document…", "Mise à jour du document…"],
    ["Imagen añadida al documento.", "Image added to the document.", "Image ajoutée au document."],

    // Lua drag/drop progress dialog.
    ["Importando Lua", "Importing Lua", "Importation Lua"],
    ["Se crea la misma Lua ScriptApp de +Page y el código de ejemplo se reemplaza por el archivo arrastrado.", "The same +Page Lua ScriptApp is created and the example code is replaced with the dropped file.", "La même Lua ScriptApp de +Page est créée et le code d'exemple est remplacé par le fichier déposé."],
    ["Leer archivo Lua", "Read Lua file", "Lire le fichier Lua"],
    ["Archivo Lua leído.", "Lua file read.", "Fichier Lua lu."],
    ["Crear Lua ScriptApp", "Create Lua ScriptApp", "Créer la Lua ScriptApp"],
    ["Creando la nueva card ScriptApp…", "Creating the new ScriptApp card…", "Création de la nouvelle carte ScriptApp…"],
    ["Aplicar contenido", "Apply content", "Appliquer le contenu"],
    ["Esperando para reemplazar el código de ejemplo.", "Waiting to replace the example code.", "En attente du remplacement du code d'exemple."],
    ["Lua ScriptApp creada.", "Lua ScriptApp created.", "Lua ScriptApp créée."],
    ["Código importado aplicado; el código de ejemplo fue reemplazado.", "Imported code applied; the example code was replaced.", "Code importé appliqué ; le code d'exemple a été remplacé."],
    ["No se pudo completar la creación o la escritura de la ScriptApp.", "The ScriptApp could not be created or written.", "La création ou l'écriture de la ScriptApp n'a pas pu être terminée."],
    ["La importación Lua falló.", "Lua import failed.", "L'importation Lua a échoué."],
    ["Error desconocido", "Unknown error", "Erreur inconnue"],
    ["Archivo Lua", "Lua file", "Fichier Lua"]
  ];

  const exactLookup = new Map();
  for (const row of ROWS) {
    for (let i = 0; i < LANGS.length; i += 1) {
      exactLookup.set(row[i], row);
    }
  }

  function language() {
    const active = document.querySelector("#language-buttons button.active[data-lang]")?.dataset.lang;
    if (LANGS.includes(active)) return active;
    const html = String(document.documentElement.lang || "").slice(0, 2).toLowerCase();
    if (LANGS.includes(html)) return html;
    const saved = String(localStorage.getItem("tns-tool-language") || "").toLowerCase();
    if (LANGS.includes(saved)) return saved;
    return "es";
  }

  function rowValue(row, target) {
    return row[LANGS.indexOf(target)] ?? row[0];
  }

  function translateDynamic(value, target) {
    let match;

    if ((match = value.match(/^(\d+) imagen(?:es)? seleccionada(?:s)?\.$/i))) {
      const count = Number(match[1]);
      if (target === "en") return `${count} image${count === 1 ? "" : "s"} selected.`;
      if (target === "fr") return `${count} image${count === 1 ? "" : "s"} sélectionnée${count === 1 ? "" : "s"}.`;
      return `${count} imagen${count === 1 ? "" : "es"} seleccionada${count === 1 ? "" : "s"}.`;
    }

    if ((match = value.match(/^(\d+) página(?:s)?\.$/i))) {
      const count = Number(match[1]);
      if (target === "fr") return `${count} page${count === 1 ? "" : "s"}.`;
      if (target === "en") return `${count} page${count === 1 ? "" : "s"}.`;
      return `${count} página${count === 1 ? "" : "s"}.`;
    }

    if ((match = value.match(/^Página (\d+) de (\d+)$/i))) {
      if (target === "en") return `Page ${match[1]} of ${match[2]}`;
      if (target === "fr") return `Page ${match[1]} sur ${match[2]}`;
      return value;
    }

    if ((match = value.match(/^Archivo preparado · (.+)$/i))) {
      if (target === "en") return `File prepared · ${match[1]}`;
      if (target === "fr") return `Fichier préparé · ${match[1]}`;
      return value;
    }

    if ((match = value.match(/^Leyendo (.+)…$/i))) {
      if (target === "en") return `Reading ${match[1]}…`;
      if (target === "fr") return `Lecture de ${match[1]}…`;
      return value;
    }

    if ((match = value.match(/^(.+?) · (\d+) página(?:s)?\.$/i))) {
      const count = Number(match[2]);
      if (target === "en" || target === "fr") return `${match[1]} · ${count} page${count === 1 ? "" : "s"}.`;
      return value;
    }

    if ((match = value.match(/^(\d+)(?: de (\d+))? card(?:s)? creada(?:s)?(?: · (.*?))?(?: · (\d+) con error)?\.$/i))) {
      const count = Number(match[1]);
      const total = match[2] ? Number(match[2]) : 0;
      const item = match[3] || "";
      const failed = match[4] ? Number(match[4]) : 0;
      if (target === "en") return `${count}${total ? ` of ${total}` : ""} card${count === 1 ? "" : "s"} created${item ? ` · ${item}` : ""}${failed ? ` · ${failed} with errors` : ""}.`;
      if (target === "fr") return `${count}${total ? ` sur ${total}` : ""} carte${count === 1 ? "" : "s"} créée${count === 1 ? "" : "s"}${item ? ` · ${item}` : ""}${failed ? ` · ${failed} avec erreur${failed === 1 ? "" : "s"}` : ""}.`;
      return value;
    }

    if ((match = value.match(/^(\d+) de (\d+) cards listas\.$/i))) {
      if (target === "en") return `${match[1]} of ${match[2]} cards ready.`;
      if (target === "fr") return `${match[1]} sur ${match[2]} cartes prêtes.`;
      return value;
    }

    if ((match = value.match(/^(\d+) cards? listas?\.$/i))) {
      const count = Number(match[1]);
      if (target === "en") return `${count} card${count === 1 ? "" : "s"} ready.`;
      if (target === "fr") return `${count} carte${count === 1 ? "" : "s"} prête${count === 1 ? "" : "s"}.`;
      return value;
    }

    if ((match = value.match(/^(\d+) de (\d+) completado\.$/i))) {
      if (target === "en") return `${match[1]} of ${match[2]} completed.`;
      if (target === "fr") return `${match[1]} sur ${match[2]} éléments terminés.`;
      return value;
    }

    if ((match = value.match(/^(\d+) elementos listos y (\d+) con error\.$/i))) {
      if (target === "en") return `${match[1]} items ready and ${match[2]} with errors.`;
      if (target === "fr") return `${match[1]} éléments prêts et ${match[2]} avec erreur${match[2] === "1" ? "" : "s"}.`;
      return value;
    }

    if ((match = value.match(/^(\d+) elemento(?:s)? listo(?:s)? para la vista calculadora\.$/i))) {
      const count = Number(match[1]);
      if (target === "en") return `${count} item${count === 1 ? "" : "s"} ready for calculator view.`;
      if (target === "fr") return `${count} élément${count === 1 ? "" : "s"} prêt${count === 1 ? "" : "s"} pour l'affichage calculatrice.`;
      return value;
    }

    return value;
  }

  function translate(value, target = language()) {
    const text = String(value ?? "");
    const row = exactLookup.get(text);
    if (row) return rowValue(row, target);
    return translateDynamic(text, target);
  }

  function translateTextNode(value, target) {
    const text = String(value ?? "");
    const leading = text.match(/^\s*/)?.[0] || "";
    const trailing = text.match(/\s*$/)?.[0] || "";
    const core = text.slice(leading.length, trailing.length ? text.length - trailing.length : undefined);
    if (!core) return text;
    const translated = translate(core, target);
    return translated === core ? text : `${leading}${translated}${trailing}`;
  }

  let scanning = false;
  let queued = false;

  function scan() {
    if (scanning) return;
    scanning = true;
    try {
      const overlay = document.querySelector(OVERLAY_SELECTOR);
      if (!overlay) return;
      const target = language();
      const walker = document.createTreeWalker(overlay, NodeFilter.SHOW_TEXT);
      const nodes = [];
      let node;
      while ((node = walker.nextNode())) nodes.push(node);
      for (const textNode of nodes) {
        const next = translateTextNode(textNode.nodeValue, target);
        if (next !== textNode.nodeValue) textNode.nodeValue = next;
      }
      const aria = overlay.getAttribute("aria-label");
      if (aria) {
        const next = translate(aria, target);
        if (next !== aria) overlay.setAttribute("aria-label", next);
      }
    } finally {
      scanning = false;
    }
  }

  function scheduleScan() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      scan();
    });
  }

  function install() {
    scan();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
        if (target?.closest?.(OVERLAY_SELECTOR)) {
          scheduleScan();
          return;
        }
        for (const added of mutation.addedNodes) {
          if (added instanceof Element && (added.matches?.(OVERLAY_SELECTOR) || added.querySelector?.(OVERLAY_SELECTOR))) {
            scheduleScan();
            return;
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    const languageButtons = document.querySelector("#language-buttons");
    languageButtons?.addEventListener("click", (event) => {
      if (!(event.target instanceof Element) || !event.target.closest("button[data-lang]")) return;
      window.setTimeout(scheduleScan, 0);
    });

    const langObserver = new MutationObserver(scheduleScan);
    langObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    if (languageButtons) {
      langObserver.observe(languageButtons, { attributes: true, subtree: true, attributeFilter: ["class"] });
    }
  }

  window.ImportProgressI18n = {
    t: translate,
    language,
    refresh: scheduleScan,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
