(() => {
  "use strict";

  // Persist the WYSIWYG Notes DOM as TI.Notepad's native rich-text tree.
  // A known-good TI Notes document stores formatting directly on 1word leaves
  // (tc0/fs0/fst0/feun0/...), without forcing id0 to a normal format entry.
  let pending = null;
  let clearTimer = 0;

  const DEFAULT = Object.freeze({
    tc: "1",
    fc: "268435199",
    fn: "TI-Nspire Sans",
    fs: "9",
    fst: "0",
    fest: "0",
    feun: "0",
    fesub: "0",
    fesup: "0",
    cc: "0"
  });

  function cpLength(text) {
    return Array.from(String(text ?? "")).length;
  }

  function cssColorToTi(value, fallback = "1") {
    const text = String(value || "").trim().toLowerCase();
    const hex = text.match(/^#([0-9a-f]{6})$/i);
    if (hex) return String(parseInt(hex[1], 16));
    const rgb = text.match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/i);
    if (!rgb) return String(fallback);
    const r = Math.max(0, Math.min(255, Math.round(Number(rgb[1]))));
    const g = Math.max(0, Math.min(255, Math.round(Number(rgb[2]))));
    const b = Math.max(0, Math.min(255, Math.round(Number(rgb[3]))));
    return String((r << 16) | (g << 8) | b);
  }

  function tiSizeForElement(element) {
    const explicit = element?.closest?.("[data-ti-fs]")?.dataset?.tiFs;
    const explicitNumber = Number(explicit);
    if (Number.isFinite(explicitNumber) && explicitNumber > 0) return Math.round(explicitNumber);
    const px = parseFloat(getComputedStyle(element).fontSize || "");
    if (!Number.isFinite(px) || px <= 0) return 9;
    return Math.max(1, Math.round(px * 0.75));
  }

  function styleForTextNode(node, editor) {
    const element = node.parentElement || editor;
    const computed = getComputedStyle(element);
    const weight = parseInt(computed.fontWeight, 10);
    const bold = computed.fontWeight === "bold" || (Number.isFinite(weight) && weight >= 600);
    const italic = /italic|oblique/i.test(computed.fontStyle || "");
    const tag = String(element.tagName || "").toLowerCase();
    const vertical = String(computed.verticalAlign || "").toLowerCase();
    const sub = tag === "sub" || vertical === "sub" || Boolean(element.closest?.("sub"));
    const sup = tag === "sup" || vertical === "super" || Boolean(element.closest?.("sup"));
    return {
      tc: cssColorToTi(computed.color, DEFAULT.tc),
      fc: DEFAULT.fc,
      fn: "TI-Nspire Sans",
      fs: String(tiSizeForElement(element)),
      fst: String((bold ? 1 : 0) | (italic ? 2 : 0)),
      fest: "0",
      feun: String(computed.textDecorationLine || "").includes("underline") ? "-1" : "0",
      fesub: sub ? "-1" : "0",
      fesup: sup ? "-1" : "0",
      cc: "0"
    };
  }

  function sameStyle(a, b) {
    if (!a || !b) return false;
    return Object.keys(DEFAULT).every(key => String(a[key] ?? DEFAULT[key]) === String(b[key] ?? DEFAULT[key]));
  }

  function extractEditorParagraphs(editor) {
    const paragraphs = [{ runs: [] }];
    let current = paragraphs[0];

    function newParagraph() {
      current = { runs: [] };
      paragraphs.push(current);
    }

    function appendText(value, node) {
      const normalized = String(value ?? "").replace(/\u00a0/g, " ");
      const pieces = normalized.split("\n");
      pieces.forEach((piece, index) => {
        if (piece) {
          const style = styleForTextNode(node, editor);
          const previous = current.runs[current.runs.length - 1];
          if (previous && sameStyle(previous.style, style)) previous.text += piece;
          else current.runs.push({ text: piece, style });
        }
        if (index < pieces.length - 1) newParagraph();
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
      topParas.forEach((para, index) => {
        if (index > 0) newParagraph();
        Array.from(para.childNodes).forEach(walk);
      });
    } else {
      paragraphs.length = 0;
      current = { runs: [] };
      paragraphs.push(current);
      Array.from(editor.childNodes).forEach(walk);
    }

    while (paragraphs.length > 1 && !paragraphs[paragraphs.length - 1].runs.length) paragraphs.pop();
    return paragraphs.length ? paragraphs : [{ runs: [] }];
  }

  function buildCanonicalRich(editor) {
    const paragraphs = extractEditorParagraphs(editor);
    const xml = document.implementation.createDocument(null, "r2dtotree", null);
    const root = xml.documentElement;
    const doc = xml.createElement("node");
    doc.setAttribute("name", "1doc");
    root.appendChild(doc);

    paragraphs.forEach((paragraph, paraIndex) => {
      const para = xml.createElement("node");
      para.setAttribute("name", "1para");
      const line = xml.createElement("node");
      line.setAttribute("name", "1rtline");
      const runs = paragraph.runs.length ? paragraph.runs : [{ text: "", style: { ...DEFAULT } }];

      runs.forEach((run, runIndex) => {
        const leaf = xml.createElement("leaf");
        leaf.setAttribute("name", "1word");
        leaf.setAttribute("fi", "1");
        leaf.setAttribute("np", "1");
        for (const key of Object.keys(DEFAULT)) leaf.setAttribute(`${key}0`, String(run.style?.[key] ?? DEFAULT[key]));
        leaf.setAttribute("pp0", String(cpLength(run.text)));
        leaf.setAttribute("ucf", "1");
        leaf.setAttribute("ucfa", "1");
        if (run.text) leaf.appendChild(xml.createTextNode(run.text));
        if (paraIndex === paragraphs.length - 1 && runIndex === runs.length - 1) {
          const cursor = xml.createElement("cursor");
          cursor.setAttribute("index", "0");
          leaf.appendChild(cursor);
        }
        line.appendChild(leaf);
      });

      para.appendChild(line);
      doc.appendChild(para);
    });

    const plainText = paragraphs.map(para => para.runs.map(run => run.text).join("")).join("\n");
    return { rich: new XMLSerializer().serializeToString(root), plainText };
  }

  function plainTextFromRich(rich) {
    try {
      const xml = new DOMParser().parseFromString(String(rich || ""), "application/xml");
      if (xml.querySelector("parsererror")) return null;
      const paras = Array.from(xml.getElementsByTagName("node")).filter(node => node.getAttribute("name") === "1para");
      return paras.map(para => Array.from(para.getElementsByTagName("leaf"))
        .filter(leaf => leaf.getAttribute("name") === "1word")
        .map(leaf => Array.from(leaf.childNodes).filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.nodeValue || "").join(""))
        .join("")).join("\n");
    } catch (_) {
      return null;
    }
  }

  function stageCanonical(editor) {
    const built = buildCanonicalRich(editor);
    pending = { ...built, createdAt: Date.now() };
    if (clearTimer) clearTimeout(clearTimer);
    clearTimer = setTimeout(() => { pending = null; }, 4000);
    window.TiNotepadRichSaveFix.lastRich = built.rich;
    window.TiNotepadRichSaveFix.lastPlainText = built.plainText;
  }

  function replacementFor(value) {
    if (!pending || Date.now() - pending.createdAt > 4000) return value;
    const incomingText = plainTextFromRich(value);
    if (incomingText !== pending.plainText) return value;
    const rich = pending.rich;
    pending = null;
    if (clearTimer) clearTimeout(clearTimer);
    clearTimer = 0;
    return rich;
  }

  function installBuilderHook() {
    const current = window.buildTiNotepadRichText;
    if (typeof current !== "function" || current.__tiNotepadCanonicalSaveFix) return false;
    // Wait until the rich editor has installed its own builder wrapper first.
    if (!window.TiNotepadRichView) return false;
    const wrapped = function buildTiNotepadRichTextCanonical(text = "") {
      const built = current(text);
      return replacementFor(built);
    };
    wrapped.__tiNotepadCanonicalSaveFix = true;
    wrapped.__previous = current;
    window.buildTiNotepadRichText = wrapped;
    return true;
  }

  function installPyodideHook() {
    try {
      if (typeof pyodide === "undefined" || !pyodide?.globals || typeof pyodide.globals.set !== "function") return false;
      const current = pyodide.globals.set;
      if (current.__tiNotepadCanonicalSaveFix) return true;
      const wrapped = function setTiNotepadRich(name, value) {
        if (name === "wasm_note_save_rich") value = replacementFor(value);
        return current.call(this, name, value);
      };
      wrapped.__tiNotepadCanonicalSaveFix = true;
      pyodide.globals.set = wrapped;
      return true;
    } catch (_) {
      return false;
    }
  }

  document.addEventListener("click", event => {
    const save = event.target?.closest?.("#note-save");
    if (!save) return;
    const modal = save.closest(".ti-note-rich-modal");
    const editor = modal?.querySelector?.(".ti-note-rich-view");
    if (!editor) return;
    stageCanonical(editor);
  }, true);

  const api = {
    version: "20260904-v1",
    lastRich: "",
    lastPlainText: "",
    buildCanonicalRich
  };
  window.TiNotepadRichSaveFix = api;

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    const builderOk = installBuilderHook();
    const pyodideOk = installPyodideHook();
    if ((builderOk && pyodideOk) || attempts > 200) clearInterval(timer);
  }, 50);
})();
