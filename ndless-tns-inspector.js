(() => {
  "use strict";

  const TEXT = {
    es: {
      title: "Inspector Ndless", detected: "TNS Ndless detectado", intro: "El archivo contiene un ejecutable nativo Ndless y se inspecciona sin enviarlo al decoder documental.",
      file: "Archivo", type: "Tipo", format: "Formato", architecture: "Arquitectura", physicalSize: "Tamaño físico", entry: "Entry point", compression: "Compresión",
      headerOffset: "Inicio de cabecera", fileSize: "Tamaño Zehn", allocSize: "Memoria al cargar", relocations: "Relocations", flags: "Flags", extra: "Datos extra",
      app: "Aplicación", author: "Autor", version: "Versión", notice: "Notice", ndless: "Compatibilidad Ndless", hardware: "Compatibilidad de hardware",
      flagTable: "Flags Zehn", relocTable: "Relocations", value: "Valor", offset: "Offset", close: "Cerrar", hex: "Vista hexadecimal inicial",
      headerSize: "Header size", textRange: ".text", dataStart: "Data start", dataEnd: "Data end", bssEnd: "BSS end", stack: "Stack size", relocStart: "Relocation start", buildDate: "Build date",
      memoryMap: "Memory Map", stored: "Stored file", runtime: "Runtime memory", signature: "Signature", startup: "Startup", codeStart: "Probable ARM code start",
      malformed: "Se detectó un contenedor Ndless, pero su estructura no supera la validación.", legacyNote: "PRG legacy no expone una tabla de secciones/relocations comparable a Zehn o bFLT; solo se muestran campos que pueden derivarse de forma segura.",
      unknown: "No especificado", yes: "Sí", no: "No",
    },
    en: {
      title: "Ndless Inspector", detected: "Ndless TNS detected", intro: "This file contains a native Ndless executable and is inspected without sending it to the document decoder.",
      file: "File", type: "Type", format: "Format", architecture: "Architecture", physicalSize: "Physical size", entry: "Entry point", compression: "Compression",
      headerOffset: "Header start", fileSize: "Zehn size", allocSize: "Load allocation", relocations: "Relocations", flags: "Flags", extra: "Extra data",
      app: "Application", author: "Author", version: "Version", notice: "Notice", ndless: "Ndless compatibility", hardware: "Hardware compatibility",
      flagTable: "Zehn flags", relocTable: "Relocations", value: "Value", offset: "Offset", close: "Close", hex: "Initial hex view",
      headerSize: "Header size", textRange: ".text", dataStart: "Data start", dataEnd: "Data end", bssEnd: "BSS end", stack: "Stack size", relocStart: "Relocation start", buildDate: "Build date",
      memoryMap: "Memory Map", stored: "Stored file", runtime: "Runtime memory", signature: "Signature", startup: "Startup", codeStart: "Probable ARM code start",
      malformed: "An Ndless container was detected, but its structure did not pass validation.", legacyNote: "Legacy PRG does not expose a section/relocation table comparable to Zehn or bFLT; only safely derivable fields are shown.",
      unknown: "Not specified", yes: "Yes", no: "No",
    },
    fr: {
      title: "Inspecteur Ndless", detected: "TNS Ndless détecté", intro: "Ce fichier contient un exécutable Ndless natif et est inspecté sans passer par le décodeur de documents.",
      file: "Fichier", type: "Type", format: "Format", architecture: "Architecture", physicalSize: "Taille physique", entry: "Point d'entrée", compression: "Compression",
      headerOffset: "Début de l'en-tête", fileSize: "Taille Zehn", allocSize: "Mémoire au chargement", relocations: "Relocations", flags: "Flags", extra: "Données supplémentaires",
      app: "Application", author: "Auteur", version: "Version", notice: "Notice", ndless: "Compatibilité Ndless", hardware: "Compatibilité matérielle",
      flagTable: "Flags Zehn", relocTable: "Relocations", value: "Valeur", offset: "Offset", close: "Fermer", hex: "Vue hexadécimale initiale",
      headerSize: "Taille en-tête", textRange: ".text", dataStart: "Début data", dataEnd: "Fin data", bssEnd: "Fin BSS", stack: "Taille pile", relocStart: "Début relocations", buildDate: "Date de build",
      memoryMap: "Memory Map", stored: "Fichier stocké", runtime: "Mémoire runtime", signature: "Signature", startup: "Startup", codeStart: "Début ARM probable",
      malformed: "Un conteneur Ndless a été détecté, mais sa structure n'a pas passé la validation.", legacyNote: "PRG legacy n'expose pas une table de sections/relocations comparable à Zehn ou bFLT ; seuls les champs dérivables de manière sûre sont affichés.",
      unknown: "Non spécifié", yes: "Oui", no: "Non",
    },
  };

  function language() {
    const active = document.querySelector("#language-buttons button.active[data-lang]")?.dataset.lang;
    const html = String(document.documentElement.lang || "es").slice(0, 2).toLowerCase();
    return TEXT[active] ? active : (TEXT[html] ? html : "es");
  }
  const tr = (key) => TEXT[language()]?.[key] || TEXT.es[key] || key;
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const hex = (n, w = 8) => `0x${(Number(n) >>> 0).toString(16).toUpperCase().padStart(w, "0")}`;
  function formatBytes(value) { const n = Number(value) || 0; if (n < 1024) return `${n} B`; if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`; return `${(n / 1048576).toFixed(2)} MB`; }
  function row(label, value) { return `<div class="ndless-field"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`; }
  function yesNo(v) { return v == null ? tr("unknown") : v ? tr("yes") : tr("no"); }
  function ndlessVersion(v) { return v == null ? tr("unknown") : v < 10 ? String(v) : `${Math.floor(v / 10)}.${v % 10}`; }

  function hexPreview(bytes, limit = 256) {
    const lines = [];
    for (let off = 0; off < Math.min(bytes.length, limit); off += 16) {
      const chunk = bytes.subarray(off, Math.min(off + 16, bytes.length));
      const hs = Array.from(chunk, b => b.toString(16).padStart(2, "0")).join(" ");
      const ascii = Array.from(chunk, b => b >= 32 && b <= 126 ? String.fromCharCode(b) : ".").join("");
      lines.push(`${off.toString(16).padStart(8, "0")}  ${hs.padEnd(47, " ")}  ${ascii}`);
    }
    return lines.join("\n");
  }

  function mapValue(item) {
    if (item.domain === "stored") {
      if (item.fileStart == null) return "—";
      return `${hex(item.fileStart)}${item.fileEnd == null ? " → EOF" : ` – ${hex(item.fileEnd)} (${Math.max(0, item.fileEnd - item.fileStart)} B)`}`;
    }
    if (item.size != null) return `${formatBytes(item.size)} (${item.size} B)`;
    return `${hex(item.runtimeStart)} – ${hex(item.runtimeEnd)} (${Math.max(0, item.runtimeEnd - item.runtimeStart)} B)`;
  }

  function memoryMapSection(items) {
    if (!items?.length) return "";
    const stored = items.filter(x => x.domain === "stored");
    const runtime = items.filter(x => x.domain === "runtime");
    const render = (title, rows) => rows.length ? `<div><h4>${esc(title)}</h4><div class="ndless-table-wrap"><table class="ndless-table"><tbody>${rows.map(x => `<tr><td><code>${esc(x.name)}</code></td><td><code>${esc(mapValue(x))}</code></td></tr>`).join("")}</tbody></table></div></div>` : "";
    return `<section class="ndless-section"><h3>${esc(tr("memoryMap"))}</h3><div class="ndless-two-col">${render(tr("stored"), stored)}${render(tr("runtime"), runtime)}</div></section>`;
  }

  function table(title, rows, columns) {
    if (!rows?.length) return "";
    return `<section class="ndless-section"><h3>${esc(title)}</h3><div class="ndless-table-wrap"><table class="ndless-table"><thead><tr>${columns.map(c => `<th>${esc(c.label)}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${columns.map(c => `<td><code>${esc(c.value(r))}</code></td>`).join("")}</tr>`).join("")}</tbody></table></div></section>`;
  }

  function commonGrid(result, entryValue) {
    return `<div class="ndless-grid">
      ${row(tr("file"), result.file?.name || "program.tns")}
      ${row(tr("type"), result.typeLabel || "Ndless")}
      ${row(tr("format"), result.formatLabel || result.format)}
      ${row(tr("architecture"), result.architecture || "ARM")}
      ${row(tr("physicalSize"), `${formatBytes(result.bytes?.length || 0)} (${result.bytes?.length || 0} B)`)}
      ${row(tr("entry"), entryValue ?? tr("unknown"))}
      ${row(tr("compression"), result.compression || "none")}
      ${row(tr("relocations"), result.relocs?.length ?? result.header?.relocCount ?? tr("unknown"))}
    </div>`;
  }

  function zehnBody(result) {
    const h = result.header, m = result.metadata;
    const compat = `${tr("ndless")}: ${m.ndlessMin != null ? `>= ${ndlessVersion(m.ndlessMin)}` : tr("unknown")}${m.ndlessMax != null ? ` · <= ${ndlessVersion(m.ndlessMax)}` : ""}<br>Revision: ${m.ndlessRevisionMin != null ? `>= ${m.ndlessRevisionMin}` : tr("unknown")}${m.ndlessRevisionMax != null ? ` · <= ${m.ndlessRevisionMax}` : ""}`;
    const hardware = `CX / CM: ${yesNo(m.runsOnColor)}<br>Clickpad: ${yesNo(m.runsOnClickpad)}<br>Touchpad: ${yesNo(m.runsOnTouchpad)}<br>32 MB: ${yesNo(m.runsOn32MB)}<br>HW-W 240×320: ${yesNo(m.runsOnHww)}<br>lcd_blit: ${yesNo(m.usesLcdBlit)}`;
    return `${commonGrid(result, hex(h.entryOffset))}
      <section class="ndless-section"><h3>Zehn</h3><div class="ndless-grid">
        ${row(tr("headerOffset"), hex(h.offset))}${row(tr("fileSize"), `${formatBytes(h.fileSize)} (${h.fileSize} B)`)}${row(tr("allocSize"), `${formatBytes(h.allocSize)} (${h.allocSize} B)`)}
        ${row(tr("relocations"), h.relocCount)}${row(tr("flags"), h.flagCount)}${row(tr("extra"), `${h.extraSize} B`)}
      </div></section>
      <section class="ndless-section"><h3>${esc(tr("app"))}</h3><div class="ndless-grid">${row(tr("app"), m.name ?? tr("unknown"))}${row(tr("author"), m.author ?? tr("unknown"))}${row(tr("version"), m.version ?? tr("unknown"))}${row(tr("notice"), m.notice ?? tr("unknown"))}</div></section>
      <section class="ndless-section ndless-two-col"><div><h3>${esc(tr("ndless"))}</h3><div class="ndless-codebox">${compat}</div></div><div><h3>${esc(tr("hardware"))}</h3><div class="ndless-codebox">${hardware}</div></div></section>
      ${memoryMapSection(window.NdlessZehn?.memoryMap?.(result))}
      ${table(tr("flagTable"), result.flags, [{label:"#",value:r=>r.index},{label:tr("type"),value:r=>r.name},{label:tr("value"),value:r=>r.value ?? r.data}])}
      ${table(tr("relocTable"), result.relocs, [{label:"#",value:r=>r.index},{label:tr("type"),value:r=>r.name},{label:tr("offset"),value:r=>hex(r.data,6)}])}`;
  }

  function bfltBody(result) {
    const h = result.header;
    const flags = window.NdlessBflt?.flagNames?.(h.flags) || [];
    const build = h.buildDate ? `${new Date(h.buildDate * 1000).toISOString()} (${h.buildDate})` : "0";
    return `${commonGrid(result, hex(h.entry))}
      <section class="ndless-section"><h3>bFLT</h3><div class="ndless-grid">
        ${row(tr("headerSize"), "64 B")}${row(tr("textRange"), `${hex(64)} – ${hex(h.dataStart)}`)}${row(tr("dataStart"), hex(h.dataStart))}${row(tr("dataEnd"), hex(h.dataEnd))}
        ${row(tr("bssEnd"), hex(h.bssEnd))}${row(tr("stack"), `${h.stackSize} B`)}${row(tr("relocStart"), hex(h.relocStart))}${row(tr("relocations"), h.relocCount)}
        ${row(tr("flags"), `${hex(h.flags)}${flags.length ? ` · ${flags.join(", ")}` : ""}`)}${row(tr("buildDate"), build)}
      </div></section>
      ${memoryMapSection(window.NdlessBflt?.memoryMap?.(result))}
      ${table(tr("relocTable"), result.relocs, [{label:"#",value:r=>r.index},{label:tr("offset"),value:r=>hex(r.address)},{label:"Region",value:r=>r.region}])}`;
  }

  function prgBody(result) {
    return `${commonGrid(result, tr("unknown"))}<div class="ndless-warning" style="margin-top:14px">${esc(tr("legacyNote"))}</div>
      <section class="ndless-section"><h3>PRG legacy</h3><div class="ndless-grid">${row(tr("signature"), "PRG\\0")}${row(tr("startup"), "legacy crt0")}${row(tr("codeStart"), hex(result.startupOffset))}${row(tr("physicalSize"), `${result.bytes.length} B`)}</div></section>
      ${memoryMapSection(window.NdlessPrg?.memoryMap?.(result, result.bytes.length))}`;
  }

  function showInspector(result) {
    document.getElementById("ndless-inspector-overlay")?.remove();
    const overlay = document.createElement("div"); overlay.id = "ndless-inspector-overlay"; overlay.className = "ndless-overlay";
    if (!result?.valid || result.family !== "ndless") {
      overlay.innerHTML = `<div class="ndless-modal"><div class="ndless-head"><div><span class="ndless-kicker">Ndless</span><h2>${esc(tr("title"))}</h2></div><button class="ndless-close" type="button">×</button></div><div class="ndless-body"><div class="ndless-warning">${esc(tr("malformed"))}${result?.reason ? ` · ${esc(result.reason)}` : ""}</div></div></div>`;
    } else {
      const body = result.format === "zehn" ? zehnBody(result) : result.format === "bflt" ? bfltBody(result) : prgBody(result);
      overlay.innerHTML = `<div class="ndless-modal"><div class="ndless-head"><div><span class="ndless-kicker">Ndless · ${esc(result.formatLabel)}</span><h2>${esc(tr("detected"))}</h2></div><button class="ndless-close" type="button">×</button></div><div class="ndless-body"><p class="ndless-intro">${esc(tr("intro"))}</p>${body}<section class="ndless-section"><h3>${esc(tr("hex"))}</h3><pre class="ndless-hex">${esc(hexPreview(result.bytes))}</pre></section></div></div>`;
    }
    const close = () => overlay.remove(); overlay.querySelector(".ndless-close")?.addEventListener("click", close); overlay.addEventListener("click", e => { if (e.target === overlay) close(); }); document.body.appendChild(overlay);
  }

  async function inspectFile(file) {
    const result = await window.NdlessFormatDetector?.inspectFile?.(file);
    if (!result || result.family === "document" || result.family === "unknown") return null;
    return result;
  }

  function redispatchChange(input) { input.dataset.ndlessInspectorBypass = "1"; input.dispatchEvent(new Event("change", { bubbles: true })); }
  function installOpenTnsGuard() {
    window.addEventListener("change", (event) => {
      const input = event.target; if (!(input instanceof HTMLInputElement) || input.id !== "xml-tns-file") return;
      if (input.dataset.ndlessInspectorBypass === "1") { delete input.dataset.ndlessInspectorBypass; return; }
      const file = input.files?.[0]; if (!file || !/\.tns$/i.test(file.name || "")) return;
      event.preventDefault(); event.stopImmediatePropagation();
      inspectFile(file).then(result => result ? showInspector(result) : redispatchChange(input)).catch(error => { console.warn("Ndless detection failed; falling back to normal TNS decoder.", error); redispatchChange(input); });
    }, true);
  }
  function installNormalDecoderGuard() {
    window.addEventListener("click", (event) => {
      const button = event.target instanceof Element ? event.target.closest("#decode-btn") : null; if (!button) return;
      if (button.dataset.ndlessInspectorBypass === "1") { delete button.dataset.ndlessInspectorBypass; return; }
      const file = document.querySelector("#decode-file")?.files?.[0]; if (!file || !/\.tns$/i.test(file.name || "")) return;
      event.preventDefault(); event.stopImmediatePropagation();
      inspectFile(file).then(result => { if (result) showInspector(result); else { button.dataset.ndlessInspectorBypass = "1"; button.click(); } }).catch(error => { console.warn("Ndless detection failed; using normal TNS decoder.", error); button.dataset.ndlessInspectorBypass = "1"; button.click(); });
    }, true);
  }

  window.TnsNdlessInspector = Object.freeze({
    inspectFile,
    findZehn: (bytes) => window.NdlessZehn?.findZehn?.(bytes) || null,
    detect: (bytes) => window.NdlessFormatDetector?.detect?.(bytes) || null,
    showInspector,
    open: async (file) => { const result = await inspectFile(file); if (!result) return false; showInspector(result); return true; },
  });
  installOpenTnsGuard(); installNormalDecoderGuard();
})();
