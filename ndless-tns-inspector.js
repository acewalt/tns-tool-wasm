(() => {
  "use strict";

  const ZEHN_SIGNATURE = 0x6e68655a;
  const ZEHN_VERSION = 1;
  const HEADER_SIZE = 32;
  const SEARCH_LIMIT = 20480;
  const ENTRY_SIZE = 4;

  const FLAG_NAMES = [
    "NDLESS_VERSION_MIN",
    "NDLESS_VERSION_MAX",
    "NDLESS_REVISION_MIN",
    "NDLESS_REVISION_MAX",
    "RUNS_ON_COLOR",
    "RUNS_ON_CLICKPAD",
    "RUNS_ON_TOUCHPAD",
    "RUNS_ON_32MB",
    "EXECUTABLE_NAME",
    "EXECUTABLE_AUTHOR",
    "EXECUTABLE_VERSION",
    "EXECUTABLE_NOTICE",
    "RUNS_ON_HWW",
    "USES_LCD_BLIT",
  ];

  const RELOC_NAMES = [
    "ADD_BASE",
    "ADD_BASE_GOT",
    "SET_ZERO",
    "FILE_COMPRESSED",
    "UNALIGNED_RELOC",
  ];

  const TEXT = {
    es: {
      title: "Inspector Ndless",
      detected: "Ejecutable Ndless detectado",
      intro: "Este .tns no es un documento XML de TI-Nspire. Contiene un ejecutable nativo Zehn y se inspecciona sin pasarlo por el decoder documental.",
      file: "Archivo",
      format: "Formato",
      container: "Contenedor",
      wrapped: "TNS con loader make-prg",
      raw: "Zehn directo",
      architecture: "Arquitectura",
      headerOffset: "Inicio de cabecera",
      fileSize: "Tamaño Zehn",
      physicalSize: "Tamaño del .tns",
      allocSize: "Memoria al cargar",
      entry: "Entry point",
      relocations: "Relocations",
      flags: "Flags",
      extra: "Datos extra",
      compression: "Compresión",
      compressed: "zlib (marcado por Zehn)",
      no: "No",
      app: "Aplicación",
      author: "Autor",
      version: "Versión",
      notice: "Notice",
      ndless: "Compatibilidad Ndless",
      hardware: "Compatibilidad de hardware",
      yes: "Sí",
      unknown: "No especificado",
      flagTable: "Flags Zehn",
      relocTable: "Relocations Zehn",
      type: "Tipo",
      value: "Valor",
      offset: "Offset",
      close: "Cerrar",
      hex: "Vista hexadecimal inicial",
      malformed: "Se encontró una firma Zehn, pero la estructura no es válida o está truncada.",
    },
    en: {
      title: "Ndless Inspector",
      detected: "Ndless executable detected",
      intro: "This .tns is not a TI-Nspire XML document. It contains a native Zehn executable and is inspected without sending it through the document decoder.",
      file: "File",
      format: "Format",
      container: "Container",
      wrapped: "TNS with make-prg loader",
      raw: "Raw Zehn",
      architecture: "Architecture",
      headerOffset: "Header start",
      fileSize: "Zehn size",
      physicalSize: ".tns size",
      allocSize: "Load allocation",
      entry: "Entry point",
      relocations: "Relocations",
      flags: "Flags",
      extra: "Extra data",
      compression: "Compression",
      compressed: "zlib (marked by Zehn)",
      no: "No",
      app: "Application",
      author: "Author",
      version: "Version",
      notice: "Notice",
      ndless: "Ndless compatibility",
      hardware: "Hardware compatibility",
      yes: "Yes",
      unknown: "Not specified",
      flagTable: "Zehn flags",
      relocTable: "Zehn relocations",
      type: "Type",
      value: "Value",
      offset: "Offset",
      close: "Close",
      hex: "Initial hex view",
      malformed: "A Zehn signature was found, but the structure is invalid or truncated.",
    },
    fr: {
      title: "Inspecteur Ndless",
      detected: "Exécutable Ndless détecté",
      intro: "Ce .tns n'est pas un document XML TI-Nspire. Il contient un exécutable natif Zehn et il est inspecté sans passer par le décodeur de documents.",
      file: "Fichier",
      format: "Format",
      container: "Conteneur",
      wrapped: "TNS avec loader make-prg",
      raw: "Zehn direct",
      architecture: "Architecture",
      headerOffset: "Début de l'en-tête",
      fileSize: "Taille Zehn",
      physicalSize: "Taille du .tns",
      allocSize: "Mémoire au chargement",
      entry: "Point d'entrée",
      relocations: "Relocations",
      flags: "Flags",
      extra: "Données supplémentaires",
      compression: "Compression",
      compressed: "zlib (indiqué par Zehn)",
      no: "Non",
      app: "Application",
      author: "Auteur",
      version: "Version",
      notice: "Notice",
      ndless: "Compatibilité Ndless",
      hardware: "Compatibilité matérielle",
      yes: "Oui",
      unknown: "Non spécifié",
      flagTable: "Flags Zehn",
      relocTable: "Relocations Zehn",
      type: "Type",
      value: "Valeur",
      offset: "Offset",
      close: "Fermer",
      hex: "Vue hexadécimale initiale",
      malformed: "Une signature Zehn a été trouvée, mais la structure est invalide ou tronquée.",
    },
  };

  function language() {
    const active = document.querySelector("#language-buttons button.active[data-lang]")?.dataset.lang;
    const html = String(document.documentElement.lang || "es").slice(0, 2).toLowerCase();
    return TEXT[active] ? active : (TEXT[html] ? html : "es");
  }

  function tr(key) {
    const lang = language();
    return TEXT[lang]?.[key] || TEXT.es[key] || key;
  }

  function u32(view, offset) {
    return view.getUint32(offset, true);
  }

  function packedEntry(view, offset) {
    const word = u32(view, offset);
    return { type: word & 0xff, data: word >>> 8, raw: word >>> 0 };
  }

  function readCString(bytes, start, maxEnd) {
    if (!Number.isInteger(start) || start < 0 || start >= maxEnd) return null;
    let end = start;
    while (end < maxEnd && bytes[end] !== 0) end += 1;
    try {
      return new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(start, end));
    } catch (_error) {
      return null;
    }
  }

  function formatBytes(value) {
    const n = Number(value) || 0;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  }

  function hex(value, width = 8) {
    return `0x${(Number(value) >>> 0).toString(16).toUpperCase().padStart(width, "0")}`;
  }

  function findZehn(bytes) {
    if (bytes.byteLength < HEADER_SIZE) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const limit = Math.min(bytes.byteLength - HEADER_SIZE, SEARCH_LIMIT);
    let sawSignature = false;

    for (let offset = 0; offset <= limit; offset += 4) {
      if (u32(view, offset) !== ZEHN_SIGNATURE) continue;
      sawSignature = true;
      if (u32(view, offset + 4) !== ZEHN_VERSION) continue;

      const header = {
        offset,
        signature: u32(view, offset),
        version: u32(view, offset + 4),
        fileSize: u32(view, offset + 8),
        relocCount: u32(view, offset + 12),
        flagCount: u32(view, offset + 16),
        extraSize: u32(view, offset + 20),
        allocSize: u32(view, offset + 24),
        entryOffset: u32(view, offset + 28),
      };

      const metaSize = HEADER_SIZE + (header.relocCount + header.flagCount) * ENTRY_SIZE + header.extraSize;
      const end = offset + header.fileSize;
      if (header.fileSize < metaSize || end > bytes.byteLength) continue;
      if (header.relocCount > 100000 || header.flagCount > 100000 || header.extraSize > header.fileSize) continue;

      const relocStart = offset + HEADER_SIZE;
      const flagStart = relocStart + header.relocCount * ENTRY_SIZE;
      const extraStart = flagStart + header.flagCount * ENTRY_SIZE;
      const extraEnd = extraStart + header.extraSize;
      if (extraEnd > end) continue;

      const relocs = [];
      for (let i = 0; i < header.relocCount; i += 1) {
        const item = packedEntry(view, relocStart + i * ENTRY_SIZE);
        relocs.push({ ...item, name: RELOC_NAMES[item.type] || `UNKNOWN_${item.type}` });
      }

      const flags = [];
      for (let i = 0; i < header.flagCount; i += 1) {
        const item = packedEntry(view, flagStart + i * ENTRY_SIZE);
        const name = FLAG_NAMES[item.type] || `UNKNOWN_${item.type}`;
        let value = item.data;
        if ([8, 9, 11].includes(item.type)) {
          value = readCString(bytes, extraStart + item.data, extraEnd) ?? "<invalid>";
        }
        flags.push({ ...item, name, value });
      }

      const byType = new Map(flags.map((flag) => [flag.type, flag]));
      const boolValue = (type) => byType.has(type) ? Boolean(byType.get(type).data) : null;
      const numberValue = (type) => byType.has(type) ? byType.get(type).data : null;
      const stringValue = (type) => byType.has(type) ? byType.get(type).value : null;
      const compressed = relocs.length > 0 && relocs[0].type === 3;

      return {
        valid: true,
        header,
        relocs,
        flags,
        compressed,
        compressionType: compressed ? relocs[0].data : null,
        metadata: {
          name: stringValue(8),
          author: stringValue(9),
          version: numberValue(10),
          notice: stringValue(11),
          ndlessMin: numberValue(0),
          ndlessMax: numberValue(1),
          ndlessRevisionMin: numberValue(2),
          ndlessRevisionMax: numberValue(3),
          runsOnColor: boolValue(4),
          runsOnClickpad: boolValue(5),
          runsOnTouchpad: boolValue(6),
          runsOn32MB: boolValue(7),
          runsOnHww: boolValue(12),
          usesLcdBlit: boolValue(13),
        },
      };
    }

    return sawSignature ? { valid: false, malformed: true } : null;
  }

  async function inspectFile(file) {
    if (!file || !/\.tns$/i.test(file.name || "")) return null;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const parsed = findZehn(bytes);
    if (!parsed) return null;
    return { ...parsed, file, bytes };
  }

  function yesNo(value) {
    if (value === null || value === undefined) return tr("unknown");
    return value ? tr("yes") : tr("no");
  }

  function ndlessVersion(value) {
    if (value === null || value === undefined) return tr("unknown");
    if (value < 10) return String(value);
    return `${Math.floor(value / 10)}.${value % 10}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function row(label, value) {
    return `<div class="ndless-field"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  }

  function hexPreview(bytes, limit = 256) {
    const lines = [];
    const end = Math.min(bytes.length, limit);
    for (let offset = 0; offset < end; offset += 16) {
      const chunk = bytes.subarray(offset, Math.min(offset + 16, end));
      const hexes = Array.from(chunk, (byte) => byte.toString(16).padStart(2, "0")).join(" ");
      const ascii = Array.from(chunk, (byte) => byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".").join("");
      lines.push(`${offset.toString(16).padStart(8, "0")}  ${hexes.padEnd(47, " ")}  ${ascii}`);
    }
    return lines.join("\n");
  }

  function table(title, rows, valueLabel) {
    if (!rows.length) return "";
    return `
      <section class="ndless-section">
        <h3>${escapeHtml(title)}</h3>
        <div class="ndless-table-wrap">
          <table class="ndless-table">
            <thead><tr><th>#</th><th>${escapeHtml(tr("type"))}</th><th>${escapeHtml(valueLabel)}</th></tr></thead>
            <tbody>${rows.map((item, index) => `<tr><td>${index}</td><td><code>${escapeHtml(item.name)}</code></td><td><code>${escapeHtml(item.value ?? item.data)}</code></td></tr>`).join("")}</tbody>
          </table>
        </div>
      </section>`;
  }

  function showInspector(result) {
    document.getElementById("ndless-inspector-overlay")?.remove();
    const overlay = document.createElement("div");
    overlay.id = "ndless-inspector-overlay";
    overlay.className = "ndless-overlay";

    if (!result.valid) {
      overlay.innerHTML = `<div class="ndless-modal"><div class="ndless-head"><div><span class="ndless-kicker">Ndless / Zehn</span><h2>${escapeHtml(tr("title"))}</h2></div><button class="ndless-close" type="button" aria-label="${escapeHtml(tr("close"))}">×</button></div><div class="ndless-body"><div class="ndless-warning">${escapeHtml(tr("malformed"))}</div></div></div>`;
    } else {
      const h = result.header;
      const m = result.metadata;
      const wrapped = h.offset > 0;
      const compat = [
        `${tr("ndless")}: ${m.ndlessMin != null ? `>= ${ndlessVersion(m.ndlessMin)}` : tr("unknown")}${m.ndlessMax != null ? ` · <= ${ndlessVersion(m.ndlessMax)}` : ""}`,
        `Revision: ${m.ndlessRevisionMin != null ? `>= ${m.ndlessRevisionMin}` : tr("unknown")}${m.ndlessRevisionMax != null ? ` · <= ${m.ndlessRevisionMax}` : ""}`,
      ].join("<br>");
      const hardware = [
        `CX / CM: ${yesNo(m.runsOnColor)}`,
        `Clickpad: ${yesNo(m.runsOnClickpad)}`,
        `Touchpad: ${yesNo(m.runsOnTouchpad)}`,
        `32 MB: ${yesNo(m.runsOn32MB)}`,
        `HW-W 240×320: ${yesNo(m.runsOnHww)}`,
        `lcd_blit: ${yesNo(m.usesLcdBlit)}`,
      ].join("<br>");

      overlay.innerHTML = `
        <div class="ndless-modal">
          <div class="ndless-head">
            <div><span class="ndless-kicker">Ndless / Zehn</span><h2>${escapeHtml(tr("detected"))}</h2></div>
            <button class="ndless-close" type="button" aria-label="${escapeHtml(tr("close"))}">×</button>
          </div>
          <div class="ndless-body">
            <p class="ndless-intro">${escapeHtml(tr("intro"))}</p>
            <div class="ndless-grid">
              ${row(tr("file"), result.file.name)}
              ${row(tr("format"), `Zehn v${h.version}`)}
              ${row(tr("container"), wrapped ? tr("wrapped") : tr("raw"))}
              ${row(tr("architecture"), "ARM (Ndless native)")}
              ${row(tr("headerOffset"), hex(h.offset))}
              ${row(tr("fileSize"), `${formatBytes(h.fileSize)} (${h.fileSize} B)`)}
              ${row(tr("physicalSize"), `${formatBytes(result.bytes.length)} (${result.bytes.length} B)`)}
              ${row(tr("allocSize"), `${formatBytes(h.allocSize)} (${h.allocSize} B)`)}
              ${row(tr("entry"), hex(h.entryOffset))}
              ${row(tr("relocations"), h.relocCount)}
              ${row(tr("flags"), h.flagCount)}
              ${row(tr("extra"), `${h.extraSize} B`)}
              ${row(tr("compression"), result.compressed ? tr("compressed") : tr("no"))}
            </div>

            <section class="ndless-section">
              <h3>${escapeHtml(tr("app"))}</h3>
              <div class="ndless-grid">
                ${row(tr("app"), m.name ?? tr("unknown"))}
                ${row(tr("author"), m.author ?? tr("unknown"))}
                ${row(tr("version"), m.version ?? tr("unknown"))}
                ${row(tr("notice"), m.notice ?? tr("unknown"))}
              </div>
            </section>

            <section class="ndless-section ndless-two-col">
              <div><h3>${escapeHtml(tr("ndless"))}</h3><div class="ndless-codebox">${compat}</div></div>
              <div><h3>${escapeHtml(tr("hardware"))}</h3><div class="ndless-codebox">${hardware}</div></div>
            </section>

            ${table(tr("flagTable"), result.flags, tr("value"))}
            ${table(tr("relocTable"), result.relocs.map((item) => ({ ...item, value: hex(item.data, 6) })), tr("offset"))}

            <section class="ndless-section">
              <h3>${escapeHtml(tr("hex"))}</h3>
              <pre class="ndless-hex">${escapeHtml(hexPreview(result.bytes))}</pre>
            </section>
          </div>
        </div>`;
    }

    const close = () => overlay.remove();
    overlay.querySelector(".ndless-close")?.addEventListener("click", close);
    overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });
    document.addEventListener("keydown", function onKey(event) {
      if (event.key !== "Escape" || !overlay.isConnected) return;
      document.removeEventListener("keydown", onKey);
      close();
    });
    document.body.appendChild(overlay);
  }

  async function routeTnsInput(input) {
    const file = input?.files?.[0];
    if (!file || !/\.tns$/i.test(file.name || "")) return false;
    const result = await inspectFile(file);
    if (!result) return false;
    showInspector(result);
    return true;
  }

  function redispatchChange(input) {
    input.dataset.ndlessInspectorBypass = "1";
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function installOpenTnsGuard() {
    window.addEventListener("change", (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.id !== "xml-tns-file") return;
      if (input.dataset.ndlessInspectorBypass === "1") {
        delete input.dataset.ndlessInspectorBypass;
        return;
      }
      const file = input.files?.[0];
      if (!file || !/\.tns$/i.test(file.name || "")) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      inspectFile(file).then((result) => {
        if (result) showInspector(result);
        else redispatchChange(input);
      }).catch((error) => {
        console.warn("Ndless detection failed; falling back to the normal TNS decoder.", error);
        redispatchChange(input);
      });
    }, true);
  }

  function installNormalDecoderGuard() {
    window.addEventListener("click", (event) => {
      const button = event.target instanceof Element ? event.target.closest("#decode-btn") : null;
      if (!button) return;
      if (button.dataset.ndlessInspectorBypass === "1") {
        delete button.dataset.ndlessInspectorBypass;
        return;
      }
      const input = document.querySelector("#decode-file");
      const file = input?.files?.[0];
      if (!file || !/\.tns$/i.test(file.name || "")) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      inspectFile(file).then((result) => {
        if (result) showInspector(result);
        else {
          button.dataset.ndlessInspectorBypass = "1";
          button.click();
        }
      }).catch((error) => {
        console.warn("Ndless detection failed; falling back to the normal TNS decoder.", error);
        button.dataset.ndlessInspectorBypass = "1";
        button.click();
      });
    }, true);
  }

  window.TnsNdlessInspector = Object.freeze({
    inspectFile,
    findZehn,
    showInspector,
    open: async (file) => {
      const result = await inspectFile(file);
      if (!result) return false;
      showInspector(result);
      return true;
    },
  });

  installOpenTnsGuard();
  installNormalDecoderGuard();
})();
