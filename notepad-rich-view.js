(() => {
  "use strict";

  const originalShowNotepadModal = window.showNotepadModal;
  const originalSaveNotepadWidgetToStage = window.saveNotepadWidgetToStage;
  const originalBuildTiNotepadRichText = window.buildTiNotepadRichText;

  if (typeof originalShowNotepadModal !== "function") {
    console.warn("TI Notes rich view: showNotepadModal is unavailable.");
    return;
  }

  const STYLE_ATTRS = ["tc", "fc", "fn", "fs", "fst", "fest", "feun", "fesub", "fesup", "cc"];
  let pendingRichBuild = null;

  const uiText = {
    es: { faithful: "Vista fiel", edit: "Editar texto", save: "Guardar", cancel: "Cancelar", note: "Notas", hint: "La vista fiel reproduce color, tamaño, negrita, cursiva, subrayado, subíndice y superíndice almacenados en TI.Notepad." },
    en: { faithful: "Faithful view", edit: "Edit text", save: "Save", cancel: "Cancel", note: "Notes", hint: "Faithful view reproduces color, size, bold, italic, underline, subscript and superscript stored in TI.Notepad." },
    fr: { faithful: "Vue fidèle", edit: "Modifier le texte", save: "Enregistrer", cancel: "Annuler", note: "Notes", hint: "La vue fidèle reproduit les couleurs, tailles, gras, italiques, soulignements, indices et exposants stockés dans TI.Notepad." }
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

  function parseRunStyle(leaf, runIndex, entries) {
    const raw = {};
    STYLE_ATTRS.forEach(key => {
      raw[key] = styleValue(leaf, runIndex, key, entries);
    });
    raw.fi = leaf.getAttribute("fi");
    raw.ucf = leaf.getAttribute("ucf");
    raw.ucfa = leaf.getAttribute("ucfa");

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

  function parseLeaf(leaf, entries) {
    const text = leaf.textContent || "";
    const total = cpLength(text);
    const declared = Math.max(1, parseNumber(leaf.getAttribute("np"), 1));
    const runs = [];
    let start = 0;

    for (let i = 0; i < declared && start <= total; i += 1) {
      const rawEnd = parseNumber(leaf.getAttribute(`pp${i}`), total);
      const end = Math.max(start, Math.min(total, rawEnd));
      runs.push({
        text: cpSlice(text, start, end),
        style: parseRunStyle(leaf, i, entries)
      });
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

  function renderRun(run) {
    const span = document.createElement("span");
    span.className = "ti-note-run";
    span.textContent = run.text;
    span.style.color = run.style.color;
    if (run.style.background) span.style.backgroundColor = run.style.background;
    span.style.fontFamily = familyCss(run.style.fontFamily);
    span.style.fontSize = `${Math.max(1, run.style.fontSize) * 4 / 3}px`;
    span.style.fontWeight = run.style.bold ? "700" : "400";
    span.style.fontStyle = run.style.italic ? "italic" : "normal";
    if (run.style.underline) span.style.textDecoration = "underline";
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

  function flattenParagraphStyles(model, paraIndex) {
    const para = model.paragraphs[paraIndex] || model.paragraphs[model.paragraphs.length - 1];
    const runs = para?.lines?.flatMap(line => line.runs) || [];
    if (runs.length) return runs;
    return [{ text: "", style: {
      raw: { tc: "1", fc: "268435199", fn: "TI-Nspire Sans", fs: "9", fst: "0", fest: "0", feun: "0", fesub: "0", fesup: "0", cc: "0", fi: "1", ucf: "1", ucfa: "1" },
      color: "#111111", background: "", fontFamily: "TI-Nspire Sans", fontSize: 9,
      bold: false, italic: false, underline: false, subscript: false, superscript: false
    }}];
  }

  function styleSegmentsForText(text, sourceRuns) {
    const length = cpLength(text);
    if (!length) return [{ text: "", style: sourceRuns[0]?.style }];
    const boundaries = [];
    let cumulative = 0;
    sourceRuns.forEach(run => {
      cumulative += cpLength(run.text);
      boundaries.push({ end: cumulative, style: run.style });
    });
    if (!boundaries.length) return [{ text, style: sourceRuns[0]?.style }];

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
    const raw = style?.raw || {};
    leaf.setAttribute("name", "1word");
    leaf.setAttribute("fi", raw.fi ?? "1");
    leaf.setAttribute("np", "1");
    STYLE_ATTRS.forEach(key => {
      let value = raw[key];
      if (value == null) {
        const defaults = { tc: "1", fc: "268435199", fn: "TI-Nspire Sans", fs: "9", fst: "0", fest: "0", feun: "0", fesub: "0", fesup: "0", cc: "0" };
        value = defaults[key];
      }
      leaf.setAttribute(`${key}0`, String(value));
    });
    leaf.setAttribute("pp0", String(Math.max(0, length)));
    if (raw.ucf != null) leaf.setAttribute("ucf", String(raw.ucf));
    if (raw.ucfa != null) leaf.setAttribute("ucfa", String(raw.ucfa));
  }

  function buildRichTextFromModel(model, text) {
    if (!model?.richDoc) return originalBuildTiNotepadRichText?.(text) || "";
    const clone = parseXml(new XMLSerializer().serializeToString(model.richDoc));
    if (!clone) return originalBuildTiNotepadRichText?.(text) || "";
    const docNode = byLocalName(clone, "node").find(node => node.getAttribute("name") === "1doc");
    if (!docNode) return originalBuildTiNotepadRichText?.(text) || "";
    while (docNode.firstChild) docNode.removeChild(docNode.firstChild);

    const newParagraphs = String(text ?? "").replace(/\r\n?/g, "\n").split("\n");
    newParagraphs.forEach((paraText, paraIndex) => {
      const para = clone.createElement("node");
      para.setAttribute("name", "1para");
      const line = clone.createElement("node");
      line.setAttribute("name", "1rtline");
      const sourceRuns = flattenParagraphStyles(model, paraIndex);
      const segments = styleSegmentsForText(paraText, sourceRuns);
      segments.forEach((segment, segmentIndex) => {
        const leaf = clone.createElement("leaf");
        applyStyleAttributes(leaf, segment.style, cpLength(segment.text));
        leaf.appendChild(clone.createTextNode(segment.text));
        if (paraIndex === newParagraphs.length - 1 && segmentIndex === segments.length - 1) {
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

  if (typeof originalBuildTiNotepadRichText === "function") {
    window.buildTiNotepadRichText = function patchedBuildTiNotepadRichText(text = "") {
      if (pendingRichBuild && String(text ?? "") === pendingRichBuild.text) return pendingRichBuild.rich;
      return originalBuildTiNotepadRichText(text);
    };
  }

  function close(backdrop) {
    if (typeof window.closeModal === "function") window.closeModal(backdrop);
    else backdrop.remove();
  }

  function makeButton(text, id, className = "") {
    const button = document.createElement("button");
    button.type = "button";
    button.id = id;
    if (className) button.className = className;
    button.textContent = text;
    return button;
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
    richView.setAttribute("aria-label", "TI-Nspire Notes rich preview");
    renderRichModel(richView, model);

    const editor = document.createElement("textarea");
    editor.id = "note-editor";
    editor.spellcheck = false;
    editor.setAttribute("aria-label", "TI-Nspire Notes");
    editor.value = model.plainText;
    editor.hidden = true;

    shell.append(calculatorBar, richView, editor);

    const hint = document.createElement("div");
    hint.className = "ti-note-rich-hint";
    hint.textContent = labels.hint;

    modal.append(topActions, title, modeBar, shell, hint);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    let mode = "faithful";
    function setMode(nextMode) {
      mode = nextMode;
      const editing = nextMode === "edit";
      richView.hidden = editing;
      editor.hidden = !editing;
      faithfulButton.classList.toggle("active", !editing);
      editButton.classList.toggle("active", editing);
      if (editing) editor.focus();
    }

    faithfulButton.addEventListener("click", () => setMode("faithful"));
    editButton.addEventListener("click", () => setMode("edit"));
    cancelButton.addEventListener("click", () => close(backdrop));

    saveButton.addEventListener("click", async () => {
      const newText = editor.value;
      if (newText === model.plainText) {
        close(backdrop);
        return;
      }
      if (typeof originalSaveNotepadWidgetToStage !== "function") {
        console.error("TI Notes rich view: saveNotepadWidgetToStage is unavailable.");
        return;
      }
      saveButton.disabled = true;
      cancelButton.disabled = true;
      try {
        pendingRichBuild = { text: newText, rich: buildRichTextFromModel(model, newText) };
        const result = await originalSaveNotepadWidgetToStage(item, newText);
        item.content = newText;
        item.raw_xml = result?.raw_xml || item.raw_xml;
        if (typeof window.xmlLog === "function") window.xmlLog(`${labels.save}: ${newText.length} chars (rich text preserved)`);
        close(backdrop);
      } catch (error) {
        console.error(error);
        saveButton.disabled = false;
        cancelButton.disabled = false;
      } finally {
        pendingRichBuild = null;
      }
    });

    backdrop.addEventListener("mousedown", event => {
      if (event.target === backdrop) close(backdrop);
    });

    if (mode === "faithful") richView.focus?.();
  };

  window.TiNotepadRichView = Object.freeze({
    parseNotepadRichText,
    renderRichModel,
    buildRichTextFromModel,
    tiColorToCss
  });
})();
