(() => {
  "use strict";

  let lastTnsFile = null;
  let current = null;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const hex = (n, w = 8) => `0x${(Number(n) >>> 0).toString(16).toUpperCase().padStart(w, "0")}`;
  const clamp24 = (n) => Math.max(0, Math.min(0xFFFFFF, Number(n) || 0));

  function rememberFile(file) {
    if (file && /\.tns$/i.test(file.name || "")) lastTnsFile = file;
  }

  window.addEventListener("change", (event) => {
    const input = event.target;
    if (input instanceof HTMLInputElement) rememberFile(input.files?.[0]);
  }, true);

  window.addEventListener("drop", (event) => {
    const files = Array.from(event.dataTransfer?.files || []);
    rememberFile(files.find(file => /\.tns$/i.test(file.name || "")));
  }, true);

  function candidateFile() {
    return lastTnsFile || $("#xml-tns-file")?.files?.[0] || $("#decode-file")?.files?.[0] || null;
  }

  function computeLayout(result) {
    const h = result.header;
    const relocStart = h.offset + 32;
    const flagStart = relocStart + h.relocCount * 4;
    const extraStart = flagStart + h.flagCount * 4;
    const execStart = extraStart + h.extraSize;
    return { relocStart, flagStart, extraStart, execStart, zehnEnd: h.offset + h.fileSize };
  }

  function writePackedData(bytes, offset, type, data) {
    const d = clamp24(data);
    bytes[offset] = type & 0xFF;
    bytes[offset + 1] = d & 0xFF;
    bytes[offset + 2] = (d >>> 8) & 0xFF;
    bytes[offset + 3] = (d >>> 16) & 0xFF;
  }

  function utf8Bytes(text) {
    return new TextEncoder().encode(String(text ?? ""));
  }

  function cStringCapacity(bytes, start, end) {
    let i = start;
    while (i < end && bytes[i] !== 0) i += 1;
    return Math.max(0, i - start);
  }

  function patchCString(bytes, start, end, value) {
    const encoded = utf8Bytes(value);
    const capacity = cStringCapacity(bytes, start, end);
    if (encoded.length > capacity) throw new Error(`El texto ocupa ${encoded.length} bytes y el espacio disponible es ${capacity}. En esta versión segura no se cambia el tamaño del bloque.`);
    bytes.fill(0, start, Math.min(end, start + capacity + 1));
    bytes.set(encoded, start);
  }

  function findFlag(result, type) {
    const index = result.flags.findIndex(flag => flag.type === type);
    return index < 0 ? null : { flag: result.flags[index], index };
  }

  function patchFlagValue(type, value) {
    const entry = findFlag(current.result, type);
    if (!entry) throw new Error(`El flag ${type} no existe en este Zehn; esta primera versión modifica flags existentes sin reestructurar la tabla.`);
    writePackedData(current.bytes, current.layout.flagStart + entry.index * 4, type, value);
  }

  function patchFlagString(type, value) {
    const entry = findFlag(current.result, type);
    if (!entry) throw new Error(`El campo no existe en este Zehn; no se puede añadir todavía sin reconstruir extra_data.`);
    const start = current.layout.extraStart + entry.flag.data;
    patchCString(current.bytes, start, current.layout.extraStart + current.result.header.extraSize, value);
  }

  function scanStrings(bytes, start, end, minLen = 4) {
    const rows = [];
    let i = start;
    while (i < end) {
      const s = i;
      while (i < end && bytes[i] >= 32 && bytes[i] <= 126) i += 1;
      const len = i - s;
      if (len >= minLen) {
        const value = String.fromCharCode(...bytes.subarray(s, i));
        rows.push({ offset: s, length: len, value });
      }
      i = Math.max(i + 1, s + 1);
      if (rows.length >= 1200) break;
    }
    return rows;
  }

  function bytesPreview(bytes, center = 0, radius = 128) {
    const start = Math.max(0, center - radius);
    const end = Math.min(bytes.length, center + radius);
    const lines = [];
    for (let off = start - (start % 16); off < end; off += 16) {
      const chunk = bytes.subarray(off, Math.min(off + 16, bytes.length));
      const hs = Array.from(chunk, b => b.toString(16).padStart(2, "0")).join(" ");
      const ascii = Array.from(chunk, b => b >= 32 && b <= 126 ? String.fromCharCode(b) : ".").join("");
      lines.push(`${off.toString(16).padStart(8,"0")}  ${hs.padEnd(47," ")}  ${ascii}`);
    }
    return lines.join("\n");
  }

  function overviewPanel() {
    const { result, layout, bytes } = current;
    const h = result.header;
    return `<div class="ndless-editor-grid">
      ${card("Archivo", result.file.name)}${card("Formato", `Zehn v${h.version}`)}
      ${card("Arquitectura", "ARM / Ndless native")}${card("Entry point", hex(h.entryOffset))}
      ${card("Zehn offset", hex(h.offset))}${card("Executable data", hex(layout.execStart))}
      ${card("Zehn size", `${h.fileSize} bytes`)}${card("TNS size", `${bytes.length} bytes`)}
      ${card("Relocations", h.relocCount)}${card("Flags", h.flagCount)}
      ${card("Extra data", `${h.extraSize} bytes`)}${card("Compression", result.compressed ? "zlib / FILE_COMPRESSED" : "No")}
    </div>
    <div class="ndless-editor-warning" style="margin-top:14px">La exportación conserva el loader y todo el archivo original. Solo se sustituyen los bytes que edites. Los cambios de tamaño estructural se bloquean en esta versión para no corromper offsets o relocations.</div>`;
  }

  function card(label, value) {
    return `<div class="ndless-editor-card"><label>${esc(label)}</label><div class="ndless-editor-mono">${esc(value)}</div></div>`;
  }

  function metadataPanel() {
    const m = current.result.metadata;
    const str = (label, key, type) => `<div class="ndless-editor-card"><label>${esc(label)}</label><input class="ndless-editor-input" data-meta-string="${type}" value="${esc(m[key] ?? "")}"><div class="ndless-editor-help">Se permite modificar mientras el UTF-8 no supere el espacio reservado original.</div></div>`;
    const num = (label, key, type) => `<div class="ndless-editor-card"><label>${esc(label)}</label><input class="ndless-editor-input" type="number" min="0" max="16777215" data-meta-number="${type}" value="${m[key] ?? ""}"></div>`;
    const bool = (label, key, type) => `<div class="ndless-editor-card"><label>${esc(label)}</label><div class="ndless-editor-check"><input type="checkbox" data-meta-bool="${type}" ${m[key] ? "checked" : ""} ${m[key] == null ? "disabled" : ""}><span>${m[key] == null ? "Flag no presente" : "Habilitado"}</span></div></div>`;
    return `<div class="ndless-editor-grid">
      ${str("Application name", "name", 8)}${str("Author", "author", 9)}${str("Notice", "notice", 11)}
      ${num("Executable version", "version", 10)}${num("Ndless minimum", "ndlessMin", 0)}${num("Ndless maximum", "ndlessMax", 1)}
      ${num("Revision minimum", "ndlessRevisionMin", 2)}${num("Revision maximum", "ndlessRevisionMax", 3)}
      ${bool("CX / CM", "runsOnColor", 4)}${bool("Clickpad", "runsOnClickpad", 5)}${bool("Touchpad", "runsOnTouchpad", 6)}${bool("32 MB", "runsOn32MB", 7)}${bool("HW-W", "runsOnHww", 12)}${bool("lcd_blit", "usesLcdBlit", 13)}
    </div><div class="ndless-editor-status" data-meta-status></div>`;
  }

  function stringsPanel() {
    if (current.result.compressed) return `<div class="ndless-editor-warning">Este Zehn marca el executable data como comprimido. Para no mostrar falsos positivos sobre bytes comprimidos, Strings/Data queda en modo protegido hasta integrar inflate/rebuild zlib. Metadata y Binary siguen disponibles.</div>`;
    const rows = scanStrings(current.bytes, current.layout.execStart, current.layout.zehnEnd);
    current.strings = rows;
    if (!rows.length) return `<div class="ndless-editor-code-placeholder">No se detectaron strings ASCII de 4+ caracteres en executable data.</div>`;
    return `<div class="ndless-editor-warning" style="margin-bottom:12px">Puedes reemplazar strings por textos de igual o menor longitud en bytes. No cambiaremos el tamaño del ejecutable.</div><div class="ndless-editor-strings"><table class="ndless-editor-table"><thead><tr><th>Offset</th><th>Bytes</th><th>String</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td class="ndless-editor-mono">${hex(r.offset)}</td><td>${r.length}</td><td><input class="ndless-editor-input ndless-editor-mono" data-string-index="${i}" value="${esc(r.value)}"></td></tr>`).join("")}</tbody></table></div><div class="ndless-editor-status" data-string-status></div>`;
  }

  function relocPanel() {
    const rows = current.result.relocs;
    return `<div class="ndless-editor-warning" style="margin-bottom:12px">Relocations se muestran completas. La edición de la tabla se deja bloqueada por ahora porque un valor inválido puede impedir que Ndless cargue el ejecutable.</div><div class="ndless-editor-strings"><table class="ndless-editor-table"><thead><tr><th>#</th><th>Tipo</th><th>Data / offset</th><th>Raw</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i}</td><td><span class="ndless-editor-badge">${esc(r.name)}</span></td><td class="ndless-editor-mono">${hex(r.data,6)}</td><td class="ndless-editor-mono">${hex(r.raw)}</td></tr>`).join("")}</tbody></table></div>`;
  }

  function codePanel() {
    return `<div class="ndless-editor-code-placeholder"><strong>ARM Code / Functions</strong><br><br>La imagen ejecutable y el entry point ya están localizados. Esta pestaña queda preparada para integrar el desensamblador ARM y CFG sin mezclarlo con un falso “source C original”.</div>`;
  }

  function binaryPanel() {
    return `<div class="ndless-editor-grid"><div class="ndless-editor-card"><label>Offset absoluto</label><input class="ndless-editor-input ndless-editor-mono" data-hex-offset value="${hex(current.result.header.offset)}"><div class="ndless-editor-help">Acepta decimal o 0xHEX.</div></div><div class="ndless-editor-card"><label>Bytes a escribir</label><input class="ndless-editor-input ndless-editor-mono" data-hex-bytes placeholder="E3 A0 00 0A"><div class="ndless-editor-help">Hexadecimal separado por espacios. No inserta ni elimina bytes.</div></div></div><div style="margin:12px 0"><button class="ndless-editor-button" data-apply-hex>Aplicar patch</button></div><textarea class="ndless-editor-hex" readonly data-hex-preview>${esc(bytesPreview(current.bytes, current.result.header.offset))}</textarea><div class="ndless-editor-status" data-hex-status></div>`;
  }

  function renderPanel(name) {
    const panel = $(`.ndless-editor-panel[data-panel="${name}"]`);
    if (!panel) return;
    const html = name === "overview" ? overviewPanel() : name === "metadata" ? metadataPanel() : name === "strings" ? stringsPanel() : name === "code" ? codePanel() : name === "relocations" ? relocPanel() : binaryPanel();
    panel.innerHTML = html;
    bindPanel(name, panel);
  }

  function bindPanel(name, panel) {
    if (name === "metadata") {
      $$('[data-meta-string]', panel).forEach(input => input.addEventListener("change", () => applyMetadata(panel)));
      $$('[data-meta-number]', panel).forEach(input => input.addEventListener("change", () => applyMetadata(panel)));
      $$('[data-meta-bool]', panel).forEach(input => input.addEventListener("change", () => applyMetadata(panel)));
    }
    if (name === "strings") {
      $$('[data-string-index]', panel).forEach(input => input.addEventListener("change", () => {
        const row = current.strings[Number(input.dataset.stringIndex)];
        const enc = utf8Bytes(input.value);
        const status = $('[data-string-status]', panel);
        try {
          if (enc.length > row.length) throw new Error(`Máximo ${row.length} bytes; el nuevo texto usa ${enc.length}.`);
          current.bytes.fill(0, row.offset, row.offset + row.length);
          current.bytes.set(enc, row.offset);
          if (status) status.textContent = `Patch aplicado en ${hex(row.offset)}.`;
        } catch (e) { if (status) status.textContent = e.message; input.value = row.value; }
      }));
    }
    if (name === "binary") {
      $('[data-apply-hex]', panel)?.addEventListener("click", () => applyHexPatch(panel));
      $('[data-hex-offset]', panel)?.addEventListener("change", () => refreshHexPreview(panel));
    }
  }

  function applyMetadata(panel) {
    const status = $('[data-meta-status]', panel);
    try {
      $$('[data-meta-string]', panel).forEach(input => patchFlagString(Number(input.dataset.metaString), input.value));
      $$('[data-meta-number]', panel).forEach(input => { if (input.value !== "") patchFlagValue(Number(input.dataset.metaNumber), input.value); });
      $$('[data-meta-bool]', panel).forEach(input => { if (!input.disabled) patchFlagValue(Number(input.dataset.metaBool), input.checked ? 1 : 0); });
      if (status) status.textContent = "Metadata aplicada a la copia de trabajo. Exporta para guardar un nuevo .tns.";
    } catch (e) { if (status) status.textContent = e.message; }
  }

  function parseOffset(value) {
    const text = String(value).trim();
    const n = /^0x/i.test(text) ? parseInt(text,16) : parseInt(text,10);
    if (!Number.isFinite(n) || n < 0 || n >= current.bytes.length) throw new Error("Offset fuera del archivo.");
    return n;
  }

  function applyHexPatch(panel) {
    const status = $('[data-hex-status]', panel);
    try {
      const off = parseOffset($('[data-hex-offset]', panel).value);
      const raw = $('[data-hex-bytes]', panel).value.trim();
      if (!raw) throw new Error("Escribe al menos un byte hexadecimal.");
      const parts = raw.split(/[\s,]+/).filter(Boolean);
      const values = parts.map(p => { if (!/^[0-9a-fA-F]{2}$/.test(p)) throw new Error(`Byte inválido: ${p}`); return parseInt(p,16); });
      if (off + values.length > current.bytes.length) throw new Error("El patch excede el tamaño del archivo.");
      current.bytes.set(values, off);
      if (status) status.textContent = `${values.length} byte(s) escritos en ${hex(off)}.`;
      refreshHexPreview(panel, off);
    } catch (e) { if (status) status.textContent = e.message; }
  }

  function refreshHexPreview(panel, explicit) {
    try {
      const off = explicit ?? parseOffset($('[data-hex-offset]', panel).value);
      $('[data-hex-preview]', panel).value = bytesPreview(current.bytes, off);
    } catch (_) {}
  }

  function exportTns() {
    const blob = new Blob([current.bytes], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const original = current.result.file.name || "program.tns";
    a.href = url;
    a.download = original.replace(/\.tns$/i, "-edited.tns");
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function validateWorkingCopy() {
    const parsed = window.TnsNdlessInspector?.findZehn?.(current.bytes);
    const el = $('[data-editor-global-status]');
    if (!parsed?.valid) { if (el) el.textContent = "Validación: la estructura Zehn ya no es válida."; return false; }
    if (el) el.textContent = `Validación: Zehn v${parsed.header.version} válido · ${parsed.header.flagCount} flags · ${parsed.header.relocCount} relocations.`;
    return true;
  }

  async function openEditor(file = candidateFile()) {
    if (!file) return alert("No hay un archivo .tns disponible para editar.");
    rememberFile(file);
    const inspector = window.TnsNdlessInspector;
    if (!inspector?.inspectFile) return alert("El Inspector Ndless todavía no está disponible.");
    const result = await inspector.inspectFile(file);
    if (!result?.valid) return alert("El archivo no contiene un Zehn Ndless válido.");
    current = { result, bytes: new Uint8Array(result.bytes), layout: computeLayout(result), strings: [] };

    $("#ndless-editor-overlay")?.remove();
    const overlay = document.createElement("div");
    overlay.id = "ndless-editor-overlay";
    overlay.className = "ndless-editor-overlay";
    overlay.innerHTML = `<section class="ndless-editor"><div class="ndless-editor-head"><div><h2>Edit Ndless</h2><small>${esc(file.name)} · Zehn v${result.header.version} · ARM</small></div><button class="ndless-editor-close" type="button">×</button></div><div class="ndless-editor-tabs">${[["overview","Overview"],["metadata","Metadata"],["strings","Strings / Data"],["code","ARM Code"],["relocations","Relocations"],["binary","Binary / Hex"]].map(([id,label],i)=>`<button class="ndless-editor-tab ${i===0?"active":""}" data-tab="${id}">${label}</button>`).join("")}</div><div class="ndless-editor-body">${["overview","metadata","strings","code","relocations","binary"].map((id,i)=>`<section class="ndless-editor-panel ${i===0?"active":""}" data-panel="${id}"></section>`).join("")}</div><div class="ndless-editor-actions"><div class="ndless-editor-status" data-editor-global-status></div><div class="ndless-editor-actions-group"><button class="ndless-editor-button" data-validate>Validate</button><button class="ndless-editor-button primary" data-export>Export edited TNS</button></div></div></section>`;
    document.body.appendChild(overlay);
    renderPanel("overview");

    const close = () => overlay.remove();
    $(".ndless-editor-close", overlay).addEventListener("click", close);
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
    $$('[data-tab]', overlay).forEach(tab => tab.addEventListener("click", () => {
      $$('[data-tab]', overlay).forEach(x => x.classList.toggle("active", x === tab));
      $$('[data-panel]', overlay).forEach(x => x.classList.toggle("active", x.dataset.panel === tab.dataset.tab));
      renderPanel(tab.dataset.tab);
    }));
    $('[data-validate]', overlay).addEventListener("click", validateWorkingCopy);
    $('[data-export]', overlay).addEventListener("click", () => { if (validateWorkingCopy()) exportTns(); });
  }

  function installInspectorButton() {
    const overlay = $("#ndless-inspector-overlay");
    const head = overlay && $(".ndless-head", overlay);
    if (!head || $(".ndless-edit-btn", head)) return;
    if (!$(".ndless-body .ndless-grid", overlay)) return;
    const close = $(".ndless-close", head);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ndless-edit-btn";
    btn.textContent = "Edit Ndless";
    btn.addEventListener("click", () => openEditor());
    if (close) head.insertBefore(btn, close); else head.appendChild(btn);
  }

  new MutationObserver(installInspectorButton).observe(document.documentElement, { childList: true, subtree: true });
  installInspectorButton();

  window.TnsNdlessEditor = Object.freeze({ open: openEditor, getLastFile: () => lastTnsFile });
})();