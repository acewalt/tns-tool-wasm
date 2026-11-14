(() => {
  "use strict";

  const originalShowNotepadModal = window.showNotepadModal;
  const originalSaveNotepadWidgetToStage = window.saveNotepadWidgetToStage;
  const originalBuildTiNotepadRichText = window.buildTiNotepadRichText;

  if (typeof originalShowNotepadModal !== "function") {
    console.warn("TI Notes rich editor: showNotepadModal is unavailable.");
    return;
  }

  const STYLE_ATTRS = ["tc", "fc", "fn", "fs", "fst", "fest", "feun", "fesub", "fesup", "cc"];
  const DEFAULT_RAW_STYLE = Object.freeze({
    id: "0",
    tc: "1",
    fc: "268435199",
    fn: "TI-Nspire Sans",
    // Legacy r2dtotree documents omit font tables and inherit Notes' 11 pt
    // default (also used by the native Notes factory). Explicit fs wins below.
    fs: "11",
    fst: "0",
    fest: "0",
    feun: "0",
    fesub: "0",
    fesup: "0",
    cc: "0",
    fi: "1",
    ucf: "1",
    ucfa: "1"
  });
  let pendingRichBuild = null;

  const uiText = {
    es: {
      faithful: "Vista fiel",
      edit: "Editar formato",
      save: "Guardar",
      cancel: "Cancelar",
      note: "Notas",
      bold: "Negrita",
      italic: "Cursiva",
      underline: "Subrayado",
      subscript: "Subíndice",
      superscript: "Superíndice",
      textColor: "Color de texto",
      fontSize: "Tamaño",
      undo: "Deshacer",
      redo: "Rehacer",
      mathExpression: "Expresión matemática",
      insertMath: "Insertar expresión",
      updateMath: "Actualizar expresión",
      invalidMath: "Escribe una expresión con paréntesis completos.",
      editMath: "Doble clic para editar la expresión matemática",
      hint: "En Editar formato puedes seleccionar texto y cambiar negrita, cursiva, subrayado, color, tamaño, subíndice y superíndice. Los cambios se guardan dentro del r2dtotree de TI.Notepad."
    },
    en: {
      faithful: "Faithful view",
      edit: "Format text",
      save: "Save",
      cancel: "Cancel",
      note: "Notes",
      bold: "Bold",
      italic: "Italic",
      underline: "Underline",
      subscript: "Subscript",
      superscript: "Superscript",
      textColor: "Text color",
      fontSize: "Size",
      undo: "Undo",
      redo: "Redo",
      mathExpression: "Math expression",
      insertMath: "Insert expression",
      updateMath: "Update expression",
      invalidMath: "Enter an expression with balanced parentheses.",
      editMath: "Double-click to edit the math expression",
      hint: "In Format text you can select text and change bold, italic, underline, color, size, subscript and superscript. Changes are written back into the TI.Notepad r2dtotree."
    },
    fr: {
      faithful: "Vue fidèle",
      edit: "Mettre en forme",
      save: "Enregistrer",
      cancel: "Annuler",
      note: "Notes",
      bold: "Gras",
      italic: "Italique",
      underline: "Souligné",
      subscript: "Indice",
      superscript: "Exposant",
      textColor: "Couleur du texte",
      fontSize: "Taille",
      undo: "Annuler",
      redo: "Rétablir",
      mathExpression: "Expression mathématique",
      insertMath: "Insérer l’expression",
      updateMath: "Modifier l’expression",
      invalidMath: "Saisissez une expression avec des parenthèses complètes.",
      editMath: "Double-cliquez pour modifier l’expression mathématique",
      hint: "Dans Mettre en forme, sélectionnez du texte pour modifier le gras, l’italique, le soulignement, la couleur, la taille, l’indice et l’exposant. Les changements sont réécrits dans le r2dtotree TI.Notepad."
    }
  };

  function getLanguage() {
    const lang = String(document.documentElement.lang || "es").toLowerCase().slice(0, 2);
    return uiText[lang] ? lang : "es";
  }

  function parseXml(source) {
    if (!source) return null;
    const doc = new DOMParser().parseFromString(String(source), "application/xml");
    return doc.querySelector("parsererror") ? null : doc;
  }

  function byLocalName(root, localName) {
    if (!root) return [];
    return Array.from(root.getElementsByTagName("*")).filter(node => node.localName === localName);
  }

  function findFmtxt(outerDoc) {
    if (!outerDoc) return null;
    const namespaced = outerDoc.getElementsByTagNameNS("urn:TI.Notepad", "fmtxt");
    if (namespaced.length) return namespaced[0];
    return byLocalName(outerDoc, "fmtxt")[0] || null;
  }

  function cpArray(text) {
    return Array.from(String(text ?? ""));
  }

  function cpLength(text) {
    return cpArray(text).length;
  }

  function cpSlice(text, start, end) {
    return cpArray(text).slice(start, end).join("");
  }

  function parseNumber(value, fallback = 0) {
    if (value == null || value === '') return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function cloneRaw(raw = {}) {
    return { ...DEFAULT_RAW_STYLE, ...Object.fromEntries(Object.entries(raw).filter(([,value]) => value != null)) };
  }

  function formatEntryMap(richDoc) {
    const map = new Map();
    byLocalName(richDoc, "formatEntry").forEach(entry => {
      const id = entry.getAttribute("entryID") ?? entry.getAttribute("entryIndex");
      if (id != null) map.set(String(id), entry);
    });
    return map;
  }

  function styleValue(leaf, runIndex, key, entries) {
    const direct = leaf.getAttribute(`${key}${runIndex}`);
    if (direct != null) return direct;
    const formatId = leaf.getAttribute(`id${runIndex}`) ?? leaf.getAttribute("id0");
    const entry = formatId != null ? entries.get(String(formatId)) : null;
    const inherited = entry?.getAttribute(key) ?? (key === "fn" ? entry?.getAttribute("fn0") : null);
    if (inherited != null) return inherited;
    const unsuffixed = leaf.getAttribute(key);
    return unsuffixed != null ? unsuffixed : null;
  }

  function tiColorToCss(value, fallback = "#111111") {
    if (value == null || value === "") return fallback;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > 0xFFFFFF) return fallback;
    return `#${(n & 0xFFFFFF).toString(16).padStart(6, "0")}`;
  }

  function tiBackgroundToCss(value) {
    if (value == null || value === "") return "";
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > 0xFFFFFF) return "";
    return tiColorToCss(n, "");
  }

  function cssColorToTi(value, fallback = "1") {
    const text = String(value || "").trim().toLowerCase();
    let r;
    let g;
    let b;
    const hex = text.match(/^#([0-9a-f]{6})$/i);
    if (hex) {
      r = parseInt(hex[1].slice(0, 2), 16);
      g = parseInt(hex[1].slice(2, 4), 16);
      b = parseInt(hex[1].slice(4, 6), 16);
    } else {
      const rgb = text.match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/i);
      if (!rgb) return String(fallback ?? "1");
      r = Math.max(0, Math.min(255, Math.round(Number(rgb[1]))));
      g = Math.max(0, Math.min(255, Math.round(Number(rgb[2]))));
      b = Math.max(0, Math.min(255, Math.round(Number(rgb[3]))));
    }
    return String((r << 16) | (g << 8) | b);
  }

  function rawToStyle(rawInput = {}) {
    const raw = cloneRaw(rawInput);
    const fst = parseNumber(raw.fst, 0);
    return {
      raw,
      color: tiColorToCss(raw.tc, "#111111"),
      background: tiBackgroundToCss(raw.fc),
      fontFamily: raw.fn || "TI-Nspire Sans",
      fontSize: parseNumber(raw.fs, 11),
      bold: (fst & 1) !== 0,
      italic: (fst & 2) !== 0,
      underline: parseNumber(raw.feun, 0) !== 0,
      subscript: parseNumber(raw.fesub, 0) !== 0,
      superscript: parseNumber(raw.fesup, 0) !== 0
    };
  }

  function parseRunStyle(leaf, runIndex, entries) {
    const raw = {};
    STYLE_ATTRS.forEach(key => {
      raw[key] = styleValue(leaf, runIndex, key, entries);
    });
    raw.id = leaf.getAttribute(`id${runIndex}`) ?? leaf.getAttribute("id0") ?? "0";
    raw.fi = leaf.getAttribute("fi");
    raw.ucf = leaf.getAttribute("ucf");
    raw.ucfa = leaf.getAttribute("ucfa");
    return rawToStyle(raw);
  }

  function parseLeaf(leaf, entries) {
    const text = leaf.textContent || "";
    const total = cpLength(text);
    const declared = Math.max(1, parseNumber(leaf.getAttribute("np"), 1));
    const runs = [];
    let start = 0;

    for (let i = 0; i < declared && start <= total; i += 1) {
      const rawEnd = parseNumber(leaf.getAttribute(`pp${i}`), total);
      const end = Math.max(start, Math.min(total, rawEnd));
      runs.push({ text: cpSlice(text, start, end), style: parseRunStyle(leaf, i, entries) });
      start = end;
    }

    if (start < total) {
      const style = runs.length ? runs[runs.length - 1].style : parseRunStyle(leaf, 0, entries);
      runs.push({ text: cpSlice(text, start, total), style });
    }

    if (!runs.length) runs.push({ text, style: parseRunStyle(leaf, 0, entries) });
    return runs;
  }

  // TI Notes mixes prose and r2d expression trees in the same rich-text line.
  // Reading only 1word leaves loses both the formula and its saved CAS answer.
  function nativeMathSource(node) {
    if (!node) return "";
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || "";
    if (node.nodeType !== Node.ELEMENT_NODE || ["mbox", "cursor"].includes(node.localName)) return "";
    return Array.from(node.childNodes).map(nativeMathSource).join("");
  }

  function parseNativeRun(node, entries) {
    if (node.localName === "leaf" && node.getAttribute("name") === "1word") return parseLeaf(node, entries);
    if (node.localName === "leaf" && node.getAttribute("name") === "1keyword") {
      return parseLeaf(node, entries).map(run => ({ ...run, keyword: true }));
    }
    const box = Array.from(node.children || []).find(child => child.localName === "mbox");
    const expressions = Array.from(node.children || []).filter(child => child.localName === "node");
    const input = box ? expressions[0] : node;
    const answer = box ? expressions[1] : null;
    const source = nativeMathSource(input);
    // The formatted result is a sibling of the input tree. In particular a
    // successful assignment may have only "Done" here, without an out/full.
    const output = nativeMathSource(answer) || (box ? byLocalName(box, "full")[0]?.textContent || "" : "");
    const sourceRuns = byLocalName(input, "leaf").filter(leaf => leaf.getAttribute("name") !== "cursor").flatMap(leaf => parseLeaf(leaf, entries));
    const outputRuns = byLocalName(answer, "leaf").flatMap(leaf => parseLeaf(leaf, entries));
    const sourceStyle = parseRunStyle(input || node, 0, entries);
    const outputOnly = box?.querySelector("attr")?.getAttribute("iomode") === "2";
    // The result tree keeps its evaluator color even when Notes is configured
    // to show only the answer. That view uses the enclosing mathbox's style.
    const outputStyle = parseRunStyle(outputOnly ? node : answer || box || node, 0, entries);
    if (!answer && !outputOnly) outputStyle.color = "#008000";
    // Older Notes uses 1keyword for its built-in bold style, and stores inline
    // unevaluated program names without a format table at all.
    if (!input?.hasAttribute("id0") && !input?.hasAttribute("tc0") && /^[\p{L}_][\p{L}\p{N}_]*\(\)$/u.test(source)) sourceStyle.bold = true;
    return [{ text: source, kind: "native", nativeXml: new XMLSerializer().serializeToString(node),
      source, output, sourceStyle, outputStyle, sourceRuns, outputRuns,
      outputOnly,
      style: parseRunStyle(node, 0, entries) }];
  }

  function parseNotepadRichText(rawXml = "") {
    const outerDoc = parseXml(rawXml);
    const fmtxt = findFmtxt(outerDoc);
    if (!fmtxt) return null;

    const richSource = fmtxt.textContent || "";
    const richDoc = parseXml(richSource);
    if (!richDoc) return null;

    const entries = formatEntryMap(richDoc);
    const paragraphs = byLocalName(richDoc, "node")
      .filter(node => node.getAttribute("name") === "1para")
      .map(para => {
        const lines = Array.from(para.children)
          .filter(node => node.localName === "node" && node.getAttribute("name") === "1rtline")
          .map(line => ({
            runs: Array.from(line.children).flatMap(node => parseNativeRun(node, entries))
          }));
        const effectiveLines = lines.length ? lines : [{
          runs: byLocalName(para, "leaf")
            .filter(leaf => ["1word", "1keyword"].includes(leaf.getAttribute("name")))
            .flatMap(leaf => parseLeaf(leaf, entries))
        }];
        return { lines: effectiveLines };
      });

    if (!paragraphs.length) return null;
    const plainText = paragraphs.map(para => para.lines.flatMap(line => line.runs).map(run => run.text).join("")).join("\n");
    return { outerDoc, fmtxt, richDoc, richSource, paragraphs, plainText };
  }

  function familyCss(name) {
    const normalized = String(name || "").toLowerCase();
    if (normalized.includes("nspire") || normalized.includes("sans")) return "Arial, Helvetica, sans-serif";
    if (normalized.includes("serif")) return "Georgia, 'Times New Roman', serif";
    if (normalized.includes("mono")) return "Consolas, 'Courier New', monospace";
    return `\"${String(name || "Arial").replace(/[\"\\]/g, "")}\", Arial, Helvetica, sans-serif`;
  }

  function encodeRaw(raw) {
    try {
      return encodeURIComponent(JSON.stringify(cloneRaw(raw)));
    } catch (_) {
      return "";
    }
  }

  function decodeRaw(value) {
    if (!value) return null;
    try {
      return cloneRaw(JSON.parse(decodeURIComponent(value)));
    } catch (_) {
      return null;
    }
  }

  function safeNoteExpression(source, mathSession) {
    if (!mathSession?.expression) return null;
    let expression = String(source || "").trim();
    const meval = expression.match(/^meval\(([\s\S]*)\)$/i);
    if (meval) {
      expression = meval[1].trim();
      if (/^"[\s\S]*"$/.test(expression)) expression = expression.slice(1, -1).replace(/""/g, '"');
    }
    if (!expression || expression.length > 2048 || /:=|→|\b(?:Define|Prgm|Func|DelVar|Request)\b/i.test(expression)) return null;
    // Opening a note must never invoke a stored program as a side effect.
    const allowed = new Set("abs sqrt root sin cos tan asin acos atan sinh cosh tanh asinh acosh atanh log ln exp floor ceiling ceil round int ip fp min max sum mean median dim determinant det identity newmat diag transpose approx exact string".split(" "));
    for (const match of expression.matchAll(/([\p{L}_][\p{L}\p{N}_]*(?:\\[\p{L}_][\p{L}\p{N}_]*)*)\s*\(/gu)) {
      if (!allowed.has(match[1].toLowerCase())) return null;
    }
    try {
      const value = mathSession.expression(expression);
      if (typeof value === "number") return Number.isFinite(value) ? String(Number(value.toPrecision(12))) : null;
      if (typeof value === "boolean" || typeof value === "string") return String(value);
      if (Array.isArray(value)) return value.every(Array.isArray) ? `[${value.map(row => `[${row.join(",")}]`).join("")}]` : `{${value.join(",")}}`;
    } catch (_) { /* Retain the native saved symbolic result when the bounded CAS cannot evaluate it. */ }
    return null;
  }

  function renderRun(run, options = {}) {
    const span = document.createElement("span");
    span.className = "ti-note-run";
    if (run.kind === "native") {
      span.classList.add("ti-note-math");
      span.contentEditable = "false";
      span.dataset.tiNative = encodeURIComponent(run.nativeXml);
      span.dataset.tiSource = run.source;
      span.dataset.tiOutput = run.output;
      span.dataset.tiOutputOnly = String(run.outputOnly);
      const result = options.recalculate ? safeNoteExpression(run.source, options.mathSession) : null;
      const output = result ?? run.output;
      renderNativeMath(span, run, output);
      span.title = run.source;
    } else {
      span.textContent = run.text;
      if (run.keyword) span.dataset.tiKeyword = "true";
    }
    span.dataset.tiRaw = encodeRaw(run.style.raw);
    span.style.color = run.style.color;
    if (run.style.background) span.style.backgroundColor = run.style.background;
    span.style.fontFamily = familyCss(run.style.fontFamily);
    span.style.fontSize = `${Math.max(1, run.style.fontSize) * 4 / 3}px`;
    span.style.fontWeight = run.style.bold || run.keyword ? "700" : "400";
    span.style.fontStyle = run.style.italic ? "italic" : "normal";
    span.style.textDecoration = run.style.underline ? "underline" : "none";
    if (run.style.subscript) {
      span.style.verticalAlign = "sub";
      span.style.fontSize = `${Math.max(1, run.style.fontSize) * 1.05}px`;
    } else if (run.style.superscript) {
      span.style.verticalAlign = "super";
      span.style.fontSize = `${Math.max(1, run.style.fontSize) * 1.05}px`;
    }
    return span;
  }

  function renderNativeMath(span, run, output = run.output) {
    span.replaceChildren();
    const append = (source, role, style, runs = []) => {
      const part = document.createElement("span");
      part.className = `ti-note-math-${role}`;
      part.style.color = style?.color || (role === "output" ? "#008000" : "#111111");
      part.style.fontSize = `${Math.max(1, style?.fontSize || run.style.fontSize) * 4 / 3}px`;
      part.style.fontWeight = style?.bold ? "700" : "400";
      part.style.fontStyle = style?.italic ? "italic" : "normal";
      if (window.TnsMathTypeset) {
        // Keep assignment on one baseline while rendering both mathematical
        // sides, rather than treating the colon as part of the variable name.
        const assignment = String(source).match(/^([\s\S]+?):=([\s\S]+)$/);
        if (assignment) {
          part.innerHTML = window.TnsMathTypeset.render(assignment[1]);
          const math = part.querySelector("math"), rhs = document.createElement("span");
          rhs.innerHTML = window.TnsMathTypeset.render(assignment[2]);
          if (math && rhs.querySelector("math")) {
            const op = document.createElementNS("http://www.w3.org/1998/Math/MathML", "mo");
            op.textContent = ":="; math.append(op, ...rhs.querySelector("math").childNodes);
          }
        } else part.innerHTML = window.TnsMathTypeset.render(source);
        // TI Notes gives fractions full-size numerator and denominator glyphs.
        // Inline MathML's default script sizing made saved results much smaller
        // than the prose next to them, especially inside split pages.
        part.querySelectorAll('math').forEach(math => math.setAttribute('displaystyle', 'true'));
        for (const token of part.querySelectorAll("mi,mn,mo,mtext")) {
          const native = runs.find(entry => entry.text.trim() === token.textContent.trim());
          if (!native) continue;
          token.style.color = native.style.color;
          token.style.fontWeight = native.style.bold ? "700" : "400";
          token.style.fontStyle = native.style.italic ? "italic" : "normal";
        }
        // Empty parentheses in a prose mathbox are a callable name, not an
        // active entry field. No placeholder/stepper is shown on the device.
        if (/^[\p{L}_][\p{L}\p{N}_]*\(\)$/u.test(String(source))) {
          part.querySelectorAll(".ti-math-placeholder").forEach(node => node.remove());
          if (style?.bold) part.querySelectorAll('mi').forEach(node => { node.style.fontWeight = '700'; });
        }
      } else part.textContent = source;
      span.appendChild(part);
    };
    if (!run.outputOnly || !output) append(run.source, "input", run.sourceStyle || run.style, run.sourceRuns);
    if (output) {
      if (!run.outputOnly) {
        const arrow = document.createElement("span");
        arrow.className = "ti-note-math-result-arrow"; arrow.textContent = "▸"; arrow.setAttribute("aria-hidden", "true");
        span.appendChild(arrow);
      }
      append(output, "output", run.outputStyle || { ...run.style, color: "#008000" }, run.outputOnly ? [] : run.outputRuns);
    }
  }

  function renderRichModel(container, model, options = {}) {
    container.__tiRichModel = model;
    container.replaceChildren();
    model.paragraphs.forEach((para, paraIndex) => {
      const paraEl = document.createElement("div");
      paraEl.className = "ti-note-para";
      para.lines.forEach(line => {
        const lineEl = document.createElement("div");
        lineEl.className = "ti-note-line";
        line.runs.forEach(run => lineEl.appendChild(renderRun(run, options)));
        if (!line.runs.length) lineEl.appendChild(document.createElement("br"));
        paraEl.appendChild(lineEl);
      });
      if (!para.lines.length) paraEl.appendChild(document.createElement("br"));
      if (paraIndex === model.paragraphs.length - 1) paraEl.classList.add("ti-note-para-last");
      container.appendChild(paraEl);
    });
  }

  function noteContext(item, options) {
    if (options.mathSession) return options;
    try { return { ...documentCalculatorContext(item?.file), ...options }; } catch (_) { return options; }
  }

  function mount(host, item, options = {}) {
    const model = parseNotepadRichText(item?.raw_xml || "");
    host.classList.add("ti-note-rich-view", "ti-note-embedded-view");
    host.contentEditable = "false";
    if (!model) { host.textContent = item?.content || ""; return { model, refresh() {}, destroy() {} }; }
    const context = noteContext(item, options);
    const fingerprint = () => JSON.stringify(context.mathSession?.snapshot?.().variables || context.getVariables?.() || {});
    let previous = fingerprint();
    renderRichModel(host, model, context);
    const refresh = () => {
      const next = fingerprint(); if (next === previous) return;
      previous = next;
      host.querySelectorAll(".ti-note-math").forEach(span => {
        const value = safeNoteExpression(span.dataset.tiSource, context.mathSession);
        if (value != null && span.dataset.tiOutputOnly === "true") {
          const run = model.paragraphs.flatMap(para => para.lines.flatMap(line => line.runs)).find(entry => entry.nativeXml && encodeURIComponent(entry.nativeXml) === span.dataset.tiNative);
          if (run) renderNativeMath(span, run, value);
        }
      });
    };
    const onVariables = event => {
      if (!event.detail?.file || String(event.detail.file).replaceAll('\\','/').split('/').pop() === String(item?.file).replaceAll('\\','/').split('/').pop()) refresh();
    };
    window.addEventListener('tns-document-variables-change', onVariables);
    return { model, refresh, destroy() { window.removeEventListener('tns-document-variables-change', onVariables); } };
  }

  function nearestRaw(node, editor) {
    let element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    while (element && element !== editor) {
      const raw = decodeRaw(element.dataset?.tiRaw);
      if (raw) return raw;
      element = element.parentElement;
    }
    return cloneRaw(DEFAULT_RAW_STYLE);
  }

  function fontPxToTiSize(pxText, fallback = 11) {
    const px = parseFloat(String(pxText || ""));
    if (!Number.isFinite(px) || px <= 0) return fallback;
    const pt = px * 0.75;
    return Math.round(pt * 10) / 10;
  }

  function styleFromEditableTextNode(textNode, editor) {
    const element = textNode.parentElement || editor;
    const computed = getComputedStyle(element);
    const raw = nearestRaw(textNode, editor);
    raw.tc = cssColorToTi(computed.color, raw.tc);

    const explicitSize = element.closest?.("[data-ti-fs]")?.dataset?.tiFs;
    const size = explicitSize != null ? parseNumber(explicitSize, parseNumber(raw.fs, 11)) : fontPxToTiSize(computed.fontSize, parseNumber(raw.fs, 11));
    raw.fs = String(size);

    const weight = parseInt(computed.fontWeight, 10);
    const bold = computed.fontWeight === "bold" || (Number.isFinite(weight) && weight >= 600);
    const italic = /italic|oblique/i.test(computed.fontStyle);
    raw.fst = String((bold ? 1 : 0) | (italic ? 2 : 0));
    raw.feun = computed.textDecorationLine.includes("underline") ? "-1" : "0";

    const tag = element.tagName?.toLowerCase();
    const vertical = String(computed.verticalAlign || "").toLowerCase();
    const isSub = tag === "sub" || vertical === "sub";
    const isSup = tag === "sup" || vertical === "super";
    raw.fesub = isSub ? "-1" : "0";
    raw.fesup = isSup ? "-1" : "0";
    return rawToStyle(raw);
  }

  function sameRawStyle(a, b) {
    if (!a || !b) return false;
    const keys = ["id", ...STYLE_ATTRS, "fi", "ucf", "ucfa"];
    return keys.every(key => String(a[key] ?? "") === String(b[key] ?? ""));
  }

  function extractEditableModel(editor) {
    const paragraphs = [{ runs: [] }];
    let current = paragraphs[0];

    function newParagraph() {
      current = { runs: [] };
      paragraphs.push(current);
    }

    function appendText(value, node) {
      const normalized = String(value ?? "").replace(/\u00a0/g, " ");
      const parts = normalized.split("\n");
      parts.forEach((part, index) => {
        if (part) {
          const style = styleFromEditableTextNode(node, editor);
          const keyword = Boolean((node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement)?.closest?.('[data-ti-keyword="true"]'));
          const previous = current.runs[current.runs.length - 1];
          if (previous && previous.keyword === keyword && sameRawStyle(previous.style.raw, style.raw)) previous.text += part;
          else current.runs.push({ text: part, style, keyword });
        }
        if (index < parts.length - 1) newParagraph();
      });
    }

    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        appendText(node.nodeValue || "", node);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (node.dataset?.tiNative) {
        current.runs.push({ kind: "native", text: node.dataset.tiSource || "", nativeXml: decodeURIComponent(node.dataset.tiNative), style: rawToStyle(nearestRaw(node, editor)) });
        return;
      }
      if (node.tagName === "BR") {
        newParagraph();
        return;
      }
      Array.from(node.childNodes).forEach(walk);
    }

    const topParas = Array.from(editor.children).filter(child => child.classList.contains("ti-note-para"));
    if (topParas.length) {
      paragraphs.length = 0;
      current = { runs: [] };
      paragraphs.push(current);
      topParas.forEach((para, paraIndex) => {
        if (paraIndex > 0) newParagraph();
        Array.from(para.childNodes).forEach(walk);
      });
    } else {
      paragraphs.length = 0;
      current = { runs: [] };
      paragraphs.push(current);
      Array.from(editor.childNodes).forEach(walk);
    }

    while (paragraphs.length > 1 && !paragraphs[paragraphs.length - 1].runs.length) {
      const lastChild = editor.lastElementChild;
      if (lastChild?.tagName === "BR") break;
      paragraphs.pop();
    }

    const plainText = paragraphs.map(para => para.runs.map(run => run.text).join("")).join("\n");
    return { paragraphs, plainText };
  }

  function flattenParagraphStyles(model, paraIndex) {
    const para = model.paragraphs[paraIndex] || model.paragraphs[model.paragraphs.length - 1];
    const runs = para?.lines?.flatMap(line => line.runs) || [];
    return runs.length ? runs : [{ text: "", style: rawToStyle(DEFAULT_RAW_STYLE) }];
  }

  function styleSegmentsForText(text, sourceRuns) {
    const length = cpLength(text);
    if (!length) return [{ text: "", style: sourceRuns[0]?.style || rawToStyle(DEFAULT_RAW_STYLE) }];
    const boundaries = [];
    let cumulative = 0;
    sourceRuns.forEach(run => {
      cumulative += cpLength(run.text);
      boundaries.push({ end: cumulative, style: run.style });
    });
    if (!boundaries.length) return [{ text, style: rawToStyle(DEFAULT_RAW_STYLE) }];

    const segments = [];
    let start = 0;
    for (const boundary of boundaries) {
      if (start >= length) break;
      const end = Math.min(length, Math.max(start, boundary.end));
      if (end > start) segments.push({ text: cpSlice(text, start, end), style: boundary.style });
      start = end;
    }
    if (start < length) segments.push({ text: cpSlice(text, start, length), style: boundaries[boundaries.length - 1].style });
    return segments.length ? segments : [{ text, style: boundaries[0].style }];
  }

  function applyStyleAttributes(leaf, style, length) {
    const raw = cloneRaw(style?.raw || style || DEFAULT_RAW_STYLE);
    leaf.setAttribute("name", "1word");
    leaf.setAttribute("fi", raw.fi ?? "1");
    leaf.setAttribute("np", "1");
    leaf.setAttribute("id0", raw.id ?? "0");
    STYLE_ATTRS.forEach(key => leaf.setAttribute(`${key}0`, String(raw[key] ?? DEFAULT_RAW_STYLE[key])));
    leaf.setAttribute("pp0", String(Math.max(0, length)));
    if (raw.ucf != null) leaf.setAttribute("ucf", String(raw.ucf));
    if (raw.ucfa != null) leaf.setAttribute("ucfa", String(raw.ucfa));
  }

  function buildRichTextFromParagraphRuns(model, editedParagraphs) {
    if (!model?.richDoc) return "";
    const clone = parseXml(new XMLSerializer().serializeToString(model.richDoc));
    if (!clone) return "";
    const docNode = byLocalName(clone, "node").find(node => node.getAttribute("name") === "1doc");
    if (!docNode) return "";
    while (docNode.firstChild) docNode.removeChild(docNode.firstChild);

    const source = editedParagraphs?.length ? editedParagraphs : [{ runs: [] }];
    source.forEach((paragraph, paraIndex) => {
      const para = clone.createElement("node");
      para.setAttribute("name", "1para");
      const line = clone.createElement("node");
      line.setAttribute("name", "1rtline");
      const runs = paragraph.runs?.length ? paragraph.runs : [{ text: "", style: rawToStyle(DEFAULT_RAW_STYLE) }];
      runs.forEach((run, runIndex) => {
        if (run.nativeXml) {
          const fragment = parseXml(run.nativeXml);
          if (fragment) line.appendChild(clone.importNode(fragment.documentElement, true));
          return;
        }
        const leaf = clone.createElement("leaf");
        applyStyleAttributes(leaf, run.style, cpLength(run.text));
        if (run.keyword) leaf.setAttribute("name", "1keyword");
        if (run.text) leaf.appendChild(clone.createTextNode(run.text));
        if (paraIndex === source.length - 1 && runIndex === runs.length - 1) {
          const cursor = clone.createElement("cursor");
          cursor.setAttribute("index", "0");
          leaf.appendChild(cursor);
        }
        line.appendChild(leaf);
      });
      para.appendChild(line);
      docNode.appendChild(para);
    });
    return new XMLSerializer().serializeToString(clone.documentElement);
  }

  function buildRichTextFromModel(model, text) {
    const lines = String(text ?? "").replace(/\r\n?/g, "\n").split("\n");
    const paragraphs = lines.map((line, index) => ({ runs: styleSegmentsForText(line, flattenParagraphStyles(model, index)) }));
    return buildRichTextFromParagraphRuns(model, paragraphs) || originalBuildTiNotepadRichText?.(text) || "";
  }

  if (typeof originalBuildTiNotepadRichText === "function") {
    window.buildTiNotepadRichText = function patchedBuildTiNotepadRichText(text = "") {
      if (pendingRichBuild && String(text ?? "") === pendingRichBuild.text) return pendingRichBuild.rich;
      return originalBuildTiNotepadRichText(text);
    };
  }

  function makeButton(text, id, className = "") {
    const button = document.createElement("button");
    button.type = "button";
    button.id = id;
    if (className) button.className = className;
    button.textContent = text;
    return button;
  }

  // A Notes formula is a native r2dtotree mathbox, not HTML or a picture. New
  // expressions have no manufactured answer cache. Existing boxes are copied
  // verbatim by buildRichTextFromParagraphRuns unless explicitly edited.
  function buildMathExpressionXml(source, rawStyle = DEFAULT_RAW_STYLE) {
    const doc = document.implementation.createDocument(null, "node");
    const raw = cloneRaw(rawStyle), box = doc.documentElement;
    box.setAttribute("name", "0el"); box.setAttribute("flags", "8");
    for (const key of STYLE_ATTRS) box.setAttribute(key, String(raw[key]));
    const make = (name, parent, text = null, attrs = {}) => {
      const node = doc.createElement(name);
      Object.entries(attrs).forEach(([key,value]) => node.setAttribute(key,String(value)));
      if (text != null) node.append(doc.createTextNode(text));
      parent.append(node); return node;
    };
    const mbox = make("mbox",box);
    make("attr",mbox,null,{iomode:1,digits:0,angle:0,symbol:1,wrap:true,warn:true,comp:2,active:true});
    const leaf = (parent,text) => make("leaf",parent,text,{name:"0text",...Object.fromEntries(STYLE_ATTRS.map(key=>[key,String(raw[key])]))});
    const expression = parent => make("node",parent,null,{name:"0el",flags:0});
    // Only emit structural operators whose r2dtotree representation is shared
    // with native Notes and Calculator documents. Other TI tokens remain in
    // the math input's 0text leaf rather than guessing undocumented node names.
    const topParts = (text, operators) => {
      let depth=0, quoted=false, start=0; const parts=[];
      for (let i=0;i<text.length;i++) {
        const ch=text[i];
        if (ch==='"') { if (quoted&&text[i+1]==='"') { i++;continue; } quoted=!quoted; }
        if (quoted) continue;
        if ('([{'.includes(ch)) depth++;
        else if (')]}'.includes(ch)) depth--;
        else if (!depth && operators.includes(ch) && (i>start || ch===',')) {
          if ('+-−'.includes(ch) && (i===0 || /[+\-−*/^(=,]/.test(text[i-1]))) continue;
          parts.push(text.slice(start,i),ch); start=i+1;
        }
      }
      parts.push(text.slice(start)); return parts;
    };
    const wraps = text => {
      if (!text.startsWith('(')||!text.endsWith(')')) return false;
      let depth=0,quoted=false;
      for (let i=0;i<text.length;i++) {
        if(text[i]==='"') quoted=!quoted;
        if(quoted) continue;
        if(text[i]==='(')depth++;
        if(text[i]===')'&&--depth===0&&i<text.length-1)return false;
      }
      return depth===0;
    };
    const unwrap = text => wraps(text) ? text.slice(1,-1) : text;
    function appendMath(parent, text, depth=0) {
      text=String(text).trim();
      if(depth>28) { leaf(parent,text);return; }
      if(wraps(text)) {
        // The native fraction node already serializes its own ((a)/(b))
        // delimiters. Do not add a visible parenthesis pair around a template.
        if(topParts(text.slice(1,-1),'/').length===3) {appendMath(parent,text.slice(1,-1),depth+1);return;}
        make('leaf',parent,'(',{name:'0paren',data:0});
        appendMath(parent,text.slice(1,-1),depth+1);
        make('leaf',parent,')',{name:'0paren',data:2147483648});return;
      }
      const sum=topParts(text,'+-−=<>');
      if(sum.length>1) { sum.forEach((part,index)=>index%2?leaf(parent,part):appendMath(parent,part,depth+1));return; }
      const product=topParts(text,'*×·');
      if(product.length>1) { product.forEach((part,index)=>index%2?leaf(parent,part):appendMath(parent,part,depth+1));return; }
      const fraction=topParts(text,'/');
      if(fraction.length===3) {
        const node=make('node',parent,'((',{name:'0fraction'});
        appendMath(expression(node),unwrap(fraction[0]),depth+1);node.append(doc.createTextNode(')/('));
        appendMath(expression(node),unwrap(fraction[2]),depth+1);node.append(doc.createTextNode('))'));return;
      }
      const power=topParts(text,'^');
      if(power.length===3) {
        appendMath(parent,power[0],depth+1);
        const node=make('node',parent,'^(',{name:'0power'});
        appendMath(expression(node),unwrap(power[2]),depth+1);node.append(doc.createTextNode(')'));return;
      }
      const sqrt=text.match(/^(?:√|sqrt)\(([\s\S]*)\)$/i);
      if(sqrt) {
        const node=make('node',parent,'√(',{name:'0sqrt'});
        appendMath(expression(node),sqrt[1],depth+1);node.append(doc.createTextNode(')'));return;
      }
      if(text.startsWith('[[')&&text.endsWith(']]')) {
        const rows=[];let level=0,start=2,quoted=false;
        for(let i=2;i<text.length-2;i++) {
          const ch=text[i];if(ch==='"')quoted=!quoted;if(quoted)continue;
          if(!level&&text.slice(i,i+2)==='][') { rows.push(text.slice(start,i));start=i+2;i++;continue; }
          if('([{'.includes(ch))level++;else if(')]}'.includes(ch))level--;
        }
        rows.push(text.slice(start,-2));
        const cells=rows.map(row=>topParts(row,',').filter((_,index)=>!(index%2)));
        if(cells[0].length&&cells.every(row=>row.length===cells[0].length)) {
          leaf(parent,'');const node=make('node',parent,'[[',{name:'0matrix',data:cells[0].length});
          cells.forEach((row,r)=>row.forEach((cell,c)=>{appendMath(expression(node),cell,depth+1);node.append(doc.createTextNode(c<row.length-1?',':r<cells.length-1?'][':']]'));}));
          leaf(parent,'');return;
        }
      }
      leaf(parent,text);
    }
    const input = expression(box);
    for (const key of STYLE_ATTRS) input.setAttribute(key,String(raw[key]));
    appendMath(input,source);
    return new XMLSerializer().serializeToString(box);
  }

  function insertPlainTextWithBreaks(editor, text) {
    const lines = String(text ?? "").replace(/\r\n?/g, "\n").split("\n");
    lines.forEach((line, index) => {
      if (line) document.execCommand("insertText", false, line);
      if (index < lines.length - 1) document.execCommand("insertLineBreak", false);
    });
    editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
  }

  function createFormatToolbar(labels, editor, onDirty) {
    const toolbar = document.createElement("div");
    toolbar.className = "ti-note-formatbar";
    toolbar.setAttribute("role", "toolbar");
    toolbar.hidden = true;

    let savedRange = null;
    const selectionListener = () => {
      const selection = window.getSelection();
      if (!selection?.rangeCount) return;
      const anchor = selection.anchorNode;
      const focus = selection.focusNode;
      if (!editor.contains(anchor) || !editor.contains(focus)) return;
      savedRange = selection.getRangeAt(0).cloneRange();
      refreshState();
    };
    document.addEventListener("selectionchange", selectionListener);

    function rememberSelection() {
      const selection = window.getSelection();
      if (selection?.rangeCount && editor.contains(selection.anchorNode) && editor.contains(selection.focusNode)) {
        savedRange = selection.getRangeAt(0).cloneRange();
      }
    }

    function restoreSelection() {
      if (!savedRange || !editor.contains(savedRange.startContainer) || !editor.contains(savedRange.endContainer)) return false;
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedRange);
      return true;
    }

    function command(name, value = null) {
      restoreSelection();
      editor.focus({ preventScroll: true });
      document.execCommand("styleWithCSS", false, true);
      document.execCommand(name, false, value);
      rememberSelection();
      onDirty();
      refreshState();
    }

    function formatButton(text, title, commandName) {
      const button = makeButton(text, "", "ti-note-format-button");
      button.title = title;
      button.dataset.command = commandName;
      button.addEventListener("mousedown", event => {
        event.preventDefault();
        rememberSelection();
      });
      button.addEventListener("click", () => command(commandName));
      toolbar.appendChild(button);
      return button;
    }

    const undo = formatButton("↶", labels.undo, "undo");
    const redo = formatButton("↷", labels.redo, "redo");
    undo.classList.add("ti-note-history-button");
    redo.classList.add("ti-note-history-button");

    const bold = formatButton("B", labels.bold, "bold");
    bold.classList.add("ti-note-bold-button");
    const italic = formatButton("I", labels.italic, "italic");
    italic.classList.add("ti-note-italic-button");
    const underline = formatButton("U", labels.underline, "underline");
    underline.classList.add("ti-note-underline-button");
    const sub = formatButton("x₂", labels.subscript, "subscript");
    const sup = formatButton("x²", labels.superscript, "superscript");

    const sizeWrap = document.createElement("label");
    sizeWrap.className = "ti-note-format-field";
    sizeWrap.title = labels.fontSize;
    const sizeLabel = document.createElement("span");
    sizeLabel.textContent = labels.fontSize;
    const sizeSelect = document.createElement("select");
    sizeSelect.className = "ti-note-size-select";
    [6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24].forEach(size => {
      const option = document.createElement("option");
      option.value = String(size);
      option.textContent = String(size);
      if (size === 9) option.selected = true;
      sizeSelect.appendChild(option);
    });
    sizeSelect.addEventListener("pointerdown", rememberSelection);
    sizeSelect.addEventListener("change", () => {
      const pt = parseNumber(sizeSelect.value, 9);
      restoreSelection();
      editor.focus({ preventScroll: true });
      document.execCommand("styleWithCSS", false, true);
      document.execCommand("fontSize", false, "7");
      editor.querySelectorAll('font[size="7"]').forEach(font => {
        font.removeAttribute("size");
        font.style.fontSize = `${pt * 4 / 3}px`;
        font.dataset.tiFs = String(pt);
      });
      rememberSelection();
      onDirty();
      refreshState();
    });
    sizeWrap.append(sizeLabel, sizeSelect);
    toolbar.appendChild(sizeWrap);

    const colorWrap = document.createElement("label");
    colorWrap.className = "ti-note-format-field ti-note-color-field";
    colorWrap.title = labels.textColor;
    const colorLabel = document.createElement("span");
    colorLabel.textContent = labels.textColor;
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = "#000001";
    colorInput.className = "ti-note-color-input";
    colorInput.addEventListener("pointerdown", rememberSelection);
    colorInput.addEventListener("input", () => command("foreColor", colorInput.value));
    colorWrap.append(colorLabel, colorInput);
    toolbar.appendChild(colorWrap);

    const states = [
      [bold, "bold"],
      [italic, "italic"],
      [underline, "underline"],
      [sub, "subscript"],
      [sup, "superscript"]
    ];

    function refreshState() {
      states.forEach(([button, name]) => {
        let active = false;
        try { active = document.queryCommandState(name); } catch (_) { active = false; }
        button.classList.toggle("active", Boolean(active));
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });

      const selection = window.getSelection();
      const node = selection?.anchorNode;
      const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
      if (element && editor.contains(element)) {
        const computed = getComputedStyle(element);
        const color = cssColorToTi(computed.color, "1");
        colorInput.value = tiColorToCss(color, "#000001");
        const explicit = element.closest?.("[data-ti-fs]")?.dataset?.tiFs;
        const size = explicit != null ? parseNumber(explicit, 11) : fontPxToTiSize(computed.fontSize, 11);
        const nearest = Array.from(sizeSelect.options).reduce((best, option) => {
          const distance = Math.abs(Number(option.value) - size);
          return !best || distance < best.distance ? { option, distance } : best;
        }, null);
        if (nearest) sizeSelect.value = nearest.option.value;
      }
    }

    return {
      element: toolbar,
      show() { toolbar.hidden = false; refreshState(); },
      hide() { toolbar.hidden = true; },
      rememberSelection,
      restoreSelection,
      getRange() { return savedRange?.cloneRange() || null; },
      destroy() { document.removeEventListener("selectionchange", selectionListener); }
    };
  }

  window.showNotepadModal = function showRichNotepadModal(item, options = {}) {
    const model = parseNotepadRichText(item?.raw_xml || "");
    if (!model) return originalShowNotepadModal(item, options);

    const lang = getLanguage();
    const labels = uiText[lang];
    const backdrop = window.makeDocumentPreviewBackdrop?.(options) || document.createElement("div");
    backdrop.classList.add("modal-backdrop");
    backdrop.replaceChildren();

    const modal = document.createElement("div");
    modal.className = "modal note-page-modal ti-note-rich-modal";

    const topActions = document.createElement("div");
    topActions.className = "modal-top-actions";
    const saveButton = makeButton(labels.save, "note-save");
    const cancelButton = makeButton(labels.cancel, "note-cancel");
    topActions.append(saveButton, cancelButton);

    const title = document.createElement("h2");
    title.textContent = labels.note;

    const modeBar = document.createElement("div");
    modeBar.className = "ti-note-modebar";
    const faithfulButton = makeButton(labels.faithful, "note-faithful-view", "ti-note-mode active");
    const editButton = makeButton(labels.edit, "note-edit-view", "ti-note-mode");
    modeBar.append(faithfulButton, editButton);

    const shell = document.createElement("div");
    shell.className = "note-calculator-shell ti-note-rich-shell";
    const calculatorBar = document.createElement("div");
    calculatorBar.className = "love-preview-calculator-bar";
    calculatorBar.textContent = "CALCULATOR VIEW";

    const richView = document.createElement("div");
    richView.className = "ti-note-rich-view";
    richView.setAttribute("role", "document");
    richView.setAttribute("aria-label", "TI-Nspire Notes rich editor");
    richView.setAttribute("contenteditable", "false");
    richView.spellcheck = false;
    const renderer = mount(richView, item, options);
    if (options.draft?.richNodes) richView.replaceChildren(...options.draft.richNodes.map(node => node.cloneNode(true)));
    shell.append(calculatorBar, richView);

    let dirty = Boolean(options.draft?.richNodes);
    const markDirty = () => { dirty = true; };
    const toolbar = createFormatToolbar(labels, richView, markDirty);

    const mathComposer = document.createElement('form');
    mathComposer.className = 'ti-note-math-composer';
    mathComposer.hidden = true;
    const mathLabel = document.createElement('label');
    mathLabel.textContent = labels.mathExpression;
    const mathSource = document.createElement('textarea');
    mathSource.className = 'ti-note-math-source';
    mathSource.rows = 3; mathSource.maxLength = 8192; mathSource.spellcheck = false;
    mathSource.setAttribute('aria-label',labels.mathExpression);
    mathLabel.append(mathSource);
    const mathPreview = document.createElement('div');
    mathPreview.className = 'ti-note-math-composer-preview';
    mathPreview.setAttribute('aria-live','polite');
    const mathError = document.createElement('div');
    mathError.className = 'ti-note-math-error'; mathError.setAttribute('role','status');
    const mathActions = document.createElement('div');
    mathActions.className = 'ti-note-math-composer-actions';
    const mathInsert = makeButton(labels.insertMath,'note-math-insert','green-tool-button');
    mathInsert.type = 'submit';
    const mathCancel = makeButton(labels.cancel,'note-math-cancel');
    mathActions.append(mathInsert,mathCancel);
    mathComposer.append(mathLabel,mathPreview,mathError,mathActions);
    toolbar.element.append(mathComposer);
    let editingMath = null;
    let mathInsertionRange = null;

    function refreshMathPreview() {
      const source=mathSource.value.trim();
      const parsed=window.TnsMathTypeset?.parse(source);
      const valid=Boolean(source && parsed?.valid);
      mathInsert.disabled=!valid;
      mathError.textContent=valid?'':labels.invalidMath;
      if(valid) mathPreview.innerHTML=window.TnsMathTypeset.render(source);
      else mathPreview.textContent='';
      mathPreview.querySelectorAll('math').forEach(math=>math.setAttribute('displaystyle','true'));
      return valid;
    }

    function openMathComposer(source, target = null) {
      // Only selections in Notes update the remembered Range. Focus in the
      // template/dimension popups or the source field cannot move that caret.
      if (!mathInsertionRange) { toolbar.rememberSelection(); mathInsertionRange=toolbar.getRange(); }
      editingMath=target;
      mathSource.value=source;
      mathInsert.textContent=target?labels.updateMath:labels.insertMath;
      setMode('edit');
      mathComposer.hidden=false;
      refreshMathPreview();
      mathSource.focus({preventScroll:true}); mathSource.select();
    }

    if(window.TnsMathTools?.openTemplates && window.TnsMathTools?.iconButton) {
      const templatesButton=window.TnsMathTools.iconButton('templates');
      templatesButton.id='note-math-templates';
      let pointerPrepared=false;
      templatesButton.addEventListener('mousedown',event=>{event.preventDefault();toolbar.rememberSelection();mathInsertionRange=toolbar.getRange();pointerPrepared=true;});
      templatesButton.addEventListener('click',()=>{
        if(!pointerPrepared) {toolbar.rememberSelection();mathInsertionRange=toolbar.getRange();}
        pointerPrepared=false;
        window.TnsMathTools.openTemplates({anchor:templatesButton,insert:source=>openMathComposer(source)});
      });
      modeBar.append(templatesButton);
    }

    function closeMathComposer() {
      editingMath=null; mathComposer.hidden=true;
      richView.focus({preventScroll:true});
      if(mathInsertionRange&&richView.contains(mathInsertionRange.startContainer)) {
        const selection=window.getSelection();selection.removeAllRanges();selection.addRange(mathInsertionRange);
      } else toolbar.restoreSelection();
      toolbar.rememberSelection();mathInsertionRange=null;
    }

    mathSource.addEventListener('input',refreshMathPreview);
    mathSource.addEventListener('keydown',event=>{
      if(event.key==='Escape') {event.preventDefault();event.stopPropagation();closeMathComposer();}
      else if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)) {event.preventDefault();mathComposer.requestSubmit();}
    });
    mathCancel.addEventListener('click',closeMathComposer);
    mathComposer.addEventListener('submit',event=>{
      event.preventDefault();
      if(!refreshMathPreview())return;
      if(editingMath?.dataset.tiSource.trim()===mathSource.value.trim()) {closeMathComposer();return;}
      let range=mathInsertionRange?.cloneRange();
      if(editingMath?.isConnected && richView.contains(editingMath)) {
        range=document.createRange();range.selectNode(editingMath);
      }
      if(!range||!richView.contains(range.startContainer)||!richView.contains(range.endContainer)) {
        range=document.createRange();range.selectNodeContents(richView.lastElementChild?.lastElementChild||richView);range.collapse(false);
      }
      // Never split an existing noneditable mathbox and lose its native XML.
      const start=range.startContainer.nodeType===Node.ELEMENT_NODE?range.startContainer:range.startContainer.parentElement;
      const enclosing=start.closest?.('[data-ti-native]');
      if(enclosing && !editingMath) {range.setStartAfter(enclosing);range.collapse(true);}
      const style=editingMath ? nearestRaw(editingMath,richView) : styleFromEditableTextNode(range.startContainer,richView).raw;
      const xml=buildMathExpressionXml(mathSource.value.trim(),style);
      const run=parseNativeRun(parseXml(xml).documentElement,new Map())[0];
      const span=renderRun(run);span.title=labels.editMath;
      range.deleteContents();range.insertNode(span);
      range.setStartAfter(span);range.collapse(true);
      richView.focus({preventScroll:true});
      const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
      toolbar.rememberSelection();markDirty();
      editingMath=null;mathInsertionRange=null;mathComposer.hidden=true;
    });
    richView.addEventListener('dblclick',event=>{
      const target=event.target.closest?.('[data-ti-native]');
      if(target && richView.contains(target)) {mathInsertionRange=null;openMathComposer(target.dataset.tiSource||'',target);}
    });
    const updateMathCaret=()=>{
      if(mathComposer.hidden)return;
      toolbar.rememberSelection();mathInsertionRange=toolbar.getRange();
    };
    richView.addEventListener('pointerup',updateMathCaret);
    richView.addEventListener('keyup',updateMathCaret);

    const hint = document.createElement("div");
    hint.className = "ti-note-rich-hint";
    hint.textContent = labels.hint;

    modal.append(topActions, title, modeBar, toolbar.element, shell, hint);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    let closed = false;
    function close(afterClose = null) {
      if (closed) return;
      closed = true;
      renderer.destroy();
      toolbar.destroy();
      if (mathComposer.contains(document.activeElement)) mathSource.blur();
      if (typeof window.closeModal === "function") window.closeModal(backdrop, typeof afterClose === 'function' ? afterClose : null);
      else { backdrop.remove(); if (typeof afterClose === 'function') afterClose(); }
    }
    window.mountDocumentPreviewTabs?.(backdrop, options, '.love-preview-calculator-bar', next => {
      options.setDraft?.({ richNodes: Array.from(richView.childNodes, node => node.cloneNode(true)) });
      close(() => options.pageNavigation.onSelect(next));
    }, true);

    function setMode(nextMode) {
      const editing = nextMode === "edit";
      richView.setAttribute("contenteditable", editing ? "true" : "false");
      richView.classList.toggle("is-editing", editing);
      faithfulButton.classList.toggle("active", !editing);
      editButton.classList.toggle("active", editing);
      faithfulButton.setAttribute("aria-pressed", editing ? "false" : "true");
      editButton.setAttribute("aria-pressed", editing ? "true" : "false");
      if (editing) {
        toolbar.show();
        richView.focus();
      } else {
        mathComposer.hidden=true;
        editingMath=null;
        mathInsertionRange=null;
        toolbar.hide();
        richView.blur();
      }
    }

    richView.addEventListener("input", markDirty);
    richView.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        document.execCommand("insertLineBreak", false);
        markDirty();
      }
    });
    richView.addEventListener("paste", event => {
      event.preventDefault();
      const text = event.clipboardData?.getData("text/plain") || "";
      insertPlainTextWithBreaks(richView, text);
      markDirty();
    });

    faithfulButton.addEventListener("click", () => setMode("faithful"));
    editButton.addEventListener("click", () => setMode("edit"));
    cancelButton.addEventListener("click", close);

    saveButton.addEventListener("click", async () => {
      const edited = extractEditableModel(richView);
      const newText = edited.plainText;
      if (!dirty && newText === model.plainText) {
        close();
        return;
      }
      if (typeof originalSaveNotepadWidgetToStage !== "function") {
        console.error("TI Notes rich editor: saveNotepadWidgetToStage is unavailable.");
        return;
      }

      const rich = buildRichTextFromParagraphRuns(model, edited.paragraphs);
      if (!rich) {
        console.error("TI Notes rich editor: could not rebuild r2dtotree.");
        return;
      }

      saveButton.disabled = true;
      cancelButton.disabled = true;
      try {
        pendingRichBuild = { text: newText, rich };
        const result = await originalSaveNotepadWidgetToStage(item, newText);
        item.content = newText;
        item.raw_xml = result?.raw_xml || item.raw_xml;
        if (typeof window.xmlLog === "function") {
          window.xmlLog(`${labels.save}: ${newText.length} chars (WYSIWYG rich text preserved)`);
        }
        close();
      } catch (error) {
        console.error(error);
        saveButton.disabled = false;
        cancelButton.disabled = false;
      } finally {
        pendingRichBuild = null;
      }
    });

    backdrop.addEventListener("mousedown", event => {
      if (event.target === backdrop) close();
    });

    setMode("faithful");
  };

  window.TiNotepadRichView = Object.freeze({
    mount,
    readOnlyRenderer: mount,
    parseNotepadRichText,
    nativeMathSource,
    safeNoteExpression,
    renderRichModel,
    extractEditableModel,
    buildRichTextFromModel,
    buildRichTextFromParagraphRuns,
    buildMathExpressionXml,
    tiColorToCss,
    cssColorToTi
  });
  window.TnsNotepadRichView = window.TiNotepadRichView;
})();
