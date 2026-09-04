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
    fs: "9",
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
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function cloneRaw(raw = {}) {
    return { ...DEFAULT_RAW_STYLE, ...raw };
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
    const inherited = entry?.getAttribute(key);
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
      fontSize: parseNumber(raw.fs, 9),
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
            runs: Array.from(line.children)
              .filter(node => node.localName === "leaf" && node.getAttribute("name") === "1word")
              .flatMap(leaf => parseLeaf(leaf, entries))
          }));
        const effectiveLines = lines.length ? lines : [{
          runs: byLocalName(para, "leaf")
            .filter(leaf => leaf.getAttribute("name") === "1word")
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

  function renderRun(run) {
    const span = document.createElement("span");
    span.className = "ti-note-run";
    span.textContent = run.text;
    span.dataset.tiRaw = encodeRaw(run.style.raw);
    span.style.color = run.style.color;
    if (run.style.background) span.style.backgroundColor = run.style.background;
    span.style.fontFamily = familyCss(run.style.fontFamily);
    span.style.fontSize = `${Math.max(1, run.style.fontSize) * 4 / 3}px`;
    span.style.fontWeight = run.style.bold ? "700" : "400";
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

  function renderRichModel(container, model) {
    container.replaceChildren();
    model.paragraphs.forEach((para, paraIndex) => {
      const paraEl = document.createElement("div");
      paraEl.className = "ti-note-para";
      para.lines.forEach(line => {
        const lineEl = document.createElement("div");
        lineEl.className = "ti-note-line";
        line.runs.forEach(run => lineEl.appendChild(renderRun(run)));
        if (!line.runs.length) lineEl.appendChild(document.createElement("br"));
        paraEl.appendChild(lineEl);
      });
      if (!para.lines.length) paraEl.appendChild(document.createElement("br"));
      if (paraIndex === model.paragraphs.length - 1) paraEl.classList.add("ti-note-para-last");
      container.appendChild(paraEl);
    });
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

  function fontPxToTiSize(pxText, fallback = 9) {
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
    const size = explicitSize != null ? parseNumber(explicitSize, parseNumber(raw.fs, 9)) : fontPxToTiSize(computed.fontSize, parseNumber(raw.fs, 9));
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
          const previous = current.runs[current.runs.length - 1];
          if (previous && sameRawStyle(previous.style.raw, style.raw)) previous.text += part;
          else current.runs.push({ text: part, style });
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
        const leaf = clone.createElement("leaf");
        applyStyleAttributes(leaf, run.style, cpLength(run.text));
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
      if (!savedRange) return false;
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
        const size = explicit != null ? parseNumber(explicit, 9) : fontPxToTiSize(computed.fontSize, 9);
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
      destroy() { document.removeEventListener("selectionchange", selectionListener); }
    };
  }

  window.showNotepadModal = function showRichNotepadModal(item) {
    const model = parseNotepadRichText(item?.raw_xml || "");
    if (!model) return originalShowNotepadModal(item);

    const lang = getLanguage();
    const labels = uiText[lang];
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";

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
    renderRichModel(richView, model);
    shell.append(calculatorBar, richView);

    let dirty = false;
    const markDirty = () => { dirty = true; };
    const toolbar = createFormatToolbar(labels, richView, markDirty);

    const hint = document.createElement("div");
    hint.className = "ti-note-rich-hint";
    hint.textContent = labels.hint;

    modal.append(topActions, title, modeBar, toolbar.element, shell, hint);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      toolbar.destroy();
      if (typeof window.closeModal === "function") window.closeModal(backdrop);
      else backdrop.remove();
    }

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
    parseNotepadRichText,
    renderRichModel,
    extractEditableModel,
    buildRichTextFromModel,
    buildRichTextFromParagraphRuns,
    tiColorToCss,
    cssColorToTi
  });
})();
