(() => {
  "use strict";
  if (window.__tnsXmlProgramEditorFix) return;
  window.__tnsXmlProgramEditorFix = true;
  window.__tnsXmlProgramEditorFixVersion = 4;

  const oldNew = createNewXmlProject;
  const oldAdd = addProgramEditorToStage;
  const oldInspector = openDocumentInspector;
  const oldSelect = selectXmlProgram;
  const oldRunXmlSyntax = runXmlSyntax;
  const oldRenderXmlAnalysis = renderXmlAnalysis;
  const oldLoadLuaPreviewSymbols = loadLuaPreviewSymbols;
  const oldCreateLovePreviewNspireRuntime = createLovePreviewNspireRuntime;

  const codeBox = () => document.querySelector("#xml-code");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
  const validTiName = (name) => /^[A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*$/.test(String(name || ""));

  function syncCode() {
    if (!xmlDoctor.current || !codeBox()) return;
    xmlDoctor.current.code = codeBox().value;
    xmlDoctor.embedded = false;
  }

  function uniqueName(base = "nuevo") {
    const used = new Set((xmlDoctor.candidates || []).map((x) => String(x.program_name || "").toLowerCase()));
    let name = base;
    let index = 2;
    while (used.has(name.toLowerCase())) name = `${base}_${index++}`;
    return name;
  }

  function programSettingsModal(initial, title, checkDuplicate = false, exclude = "") {
    return new Promise((resolve) => {
      const backdrop = document.createElement("div");
      backdrop.className = "modal-backdrop";
      backdrop.innerHTML = `
        <div class="modal document-modal">
          <h2>${esc(title)}</h2>
          <div class="document-form">
            <label for="xpe-name">${esc(t("documentName"))}</label>
            <input id="xpe-name" value="${esc(initial.name || "nuevo")}" spellcheck="false">
            <label for="xpe-type">${esc(t("documentType"))}</label>
            <select id="xpe-type"><option>Prgm</option><option>Func</option></select>
            <label for="xpe-access">${esc(t("libraryAccess"))}</label>
            <select id="xpe-access"><option>None</option><option>LibPriv</option><option>LibPub</option></select>
            <label for="xpe-args">${esc(t("arguments"))}</label>
            <input id="xpe-args" value="${esc(initial.parameters || "")}" spellcheck="false">
          </div>
          <div id="xpe-error" style="color:#ff6b6b;min-height:20px"></div>
          <div class="modal-actions">
            <button type="button" id="xpe-cancel">${esc(t("cancel"))}</button>
            <button type="button" id="xpe-apply">${esc(t("apply"))}</button>
          </div>
        </div>`;
      document.body.append(backdrop);
      backdrop.querySelector("#xpe-type").value = initial.documentType === "Func" ? "Func" : "Prgm";
      backdrop.querySelector("#xpe-access").value = ["None", "LibPriv", "LibPub"].includes(initial.libraryAccess)
        ? initial.libraryAccess : "LibPub";
      const done = (value) => closeModal(backdrop, () => resolve(value));
      backdrop.querySelector("#xpe-cancel").addEventListener("click", () => done(null));
      backdrop.querySelector("#xpe-apply").addEventListener("click", () => {
        const name = backdrop.querySelector("#xpe-name").value.trim();
        const exists = (xmlDoctor.candidates || []).some((item) => (
          String(item.program_name || "").toLowerCase() === name.toLowerCase()
          && String(item.program_name || "").toLowerCase() !== String(exclude || "").toLowerCase()
        ));
        if (!validTiName(name)) {
          backdrop.querySelector("#xpe-error").textContent = "Nombre TI-Nspire inválido.";
          return;
        }
        if (checkDuplicate && exists) {
          backdrop.querySelector("#xpe-error").textContent = `Ya existe ${name}.`;
          return;
        }
        done({
          name,
          documentType: backdrop.querySelector("#xpe-type").value,
          libraryAccess: backdrop.querySelector("#xpe-access").value,
          parameters: backdrop.querySelector("#xpe-args").value.trim(),
        });
      });
    });
  }

  async function persistCurrentProgram() {
    if (!xmlDoctor.current) return;
    syncCode();
    if (!xmlDoctor.embedded) {
      await embedXmlCode();
      if (xmlDoctor.current) xmlDoctor.current.original_name = xmlDoctor.current.program_name;
    }
  }

  async function rescanSelect(name, type) {
    await scanXmlPrograms();
    const found = (xmlDoctor.candidates || []).find((x) => x.program_name === name && x.document_type === type)
      || (xmlDoctor.candidates || []).find((x) => x.program_name === name);
    if (found) oldSelect(found.index);
    return found;
  }

  async function applyFreshSettings(settings) {
    if (!xmlDoctor.current) throw new Error("No hay Prgm/Func seleccionado.");
    const item = xmlDoctor.current;
    if (!item.original_name) item.original_name = item.program_name;
    item.program_name = settings.name;
    item.document_type = settings.documentType;
    item.library_access = settings.libraryAccess;
    item.parameters = settings.parameters;
    const code = settings.documentType === "Func" ? "Func\nReturn 0\nEndFunc" : "Prgm\n\nEndPrgm";
    codeBox().value = code;
    item.code = code;
    xmlDoctor.embedded = false;
    refreshXmlProgramOptions();
    updateXmlLineNumbers();
    await embedXmlCode();
    return rescanSelect(settings.name, settings.documentType);
  }

  function validBareFuncValues() {
    const box = codeBox();
    if (!box || detectXmlDocumentType(box.value) !== "Func") return new Map();
    const lines = String(box.value || "").replace(/\r\n?/g, "\n").split("\n");
    const declared = new Set();
    for (const raw of String(xmlDoctor.current?.parameters || "").split(",")) {
      const name = raw.trim();
      if (validTiName(name)) declared.add(name);
    }
    const valid = new Map();
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index].trim();
      const bare = /^([A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*)$/.exec(line);
      if (bare && declared.has(bare[1])) valid.set(index + 1, bare[1]);
      const local = /^Local\s+(.+)$/i.exec(line);
      if (local) {
        for (const rawName of local[1].split(",")) {
          const name = rawName.trim();
          if (validTiName(name)) declared.add(name);
        }
      }
      const assign = /^([A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*)\s*:=/.exec(line);
      if (assign) declared.add(assign[1]);
      const arrow = /(?:->|→)\s*([A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*)\s*$/.exec(line);
      if (arrow) declared.add(arrow[1]);
    }
    return valid;
  }

  function normalizeFuncSyntaxReport(report) {
    if (!report || !Array.isArray(report.diagnostics)) return report;
    const valid = validBareFuncValues();
    if (!valid.size) return report;
    report.diagnostics = report.diagnostics.filter((diag) => {
      const e410 = Number(diag?.code) === 410 || String(diag?.code_label || "").toUpperCase() === "E410";
      return !(e410 && valid.has(Number(diag?.line) || 0));
    });
    report.errors = report.diagnostics.filter((d) => String(d?.severity || "").toUpperCase() === "ERROR").length;
    report.warnings = report.diagnostics.filter((d) => String(d?.severity || "").toUpperCase() === "WARNING").length;
    return report;
  }

  renderXmlAnalysis = function (report) {
    return oldRenderXmlAnalysis(normalizeFuncSyntaxReport(report));
  };
  runXmlSyntax = async function () {
    return normalizeFuncSyntaxReport(await oldRunXmlSyntax());
  };

  function currentFuncFallback() {
    const current = xmlDoctor.current;
    const box = codeBox();
    if (!current || !box) return { functions: [], basicFunctions: {}, sources: {} };
    const name = String(current.program_name || "").trim();
    const body = String(box.value || current.code || "").replace(/\r\n?/g, "\n");
    const isFunc = current.document_type === "Func" || /^\s*Func\b/i.test(body);
    if (!name || !isFunc) return { functions: [], basicFunctions: {}, sources: {} };
    return {
      functions: [name],
      basicFunctions: { [name]: { params: String(current.parameters || ""), body } },
      sources: { [name]: "editor-memory" },
    };
  }

  async function readFuncSymbolsFromXml() {
    const fallback = currentFuncFallback();
    if (!pyodide) return fallback;

    pyodide.globals.set("wasm_xpe_stage_root", String(xmlDoctor.stagePath || ""));
    pyodide.globals.set("wasm_xpe_source_root", String(xmlDoctor.sourcePath || ""));
    const payload = await pyodide.runPythonAsync(`
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from xml_scanner import local_name

stage_raw = str(wasm_xpe_stage_root or "")
source_raw = str(wasm_xpe_source_root or "")

def usable(raw):
    if not raw:
        return None
    p = Path(raw)
    return p if p.exists() else None

# Staging is the edited document and therefore wins completely over the source copy.
root_path = usable(stage_raw) or usable(source_raw)
functions = []
basic_functions = {}
sources = {}

def xml_files(root):
    if root is None:
        return []
    if root.is_file():
        return [root] if root.suffix.lower() == ".xml" else []
    return sorted(root.rglob("*.xml"), key=lambda p: str(p).lower())

for xml_file in xml_files(root_path):
    try:
        xml_root = ET.parse(xml_file).getroot()
    except Exception:
        continue
    for element in xml_root.iter():
        if local_name(element.tag) != "e":
            continue
        name = ""
        params = ""
        value = ""
        for child in element:
            lname = local_name(child.tag)
            if lname == "n":
                name = (child.text or "").strip()
            elif lname == "p":
                params = child.text or ""
            elif lname == "v":
                value = child.text or ""
        if not name:
            continue
        is_func = element.attrib.get("t", "") == "6" or value.lstrip().startswith("Func")
        if not is_func or not value.lstrip().startswith("Func"):
            continue
        if name not in functions:
            functions.append(name)
        basic_functions[name] = {"params": params, "body": value}
        sources[name] = str(xml_file)

json.dumps({
    "root": str(root_path) if root_path is not None else "",
    "functions": functions,
    "basicFunctions": basic_functions,
    "sources": sources,
})
`);

    const disk = JSON.parse(payload);
    if (Array.isArray(disk.functions) && disk.functions.length) return disk;
    return fallback;
  }

  function mergePreviewSymbols(base = {}, funcs = {}) {
    const hasAuthoritativeFuncs = Object.keys(funcs?.basicFunctions || {}).length > 0;
    return {
      ...(base || {}),
      functions: Array.from(new Set([...(base?.functions || []), ...(funcs?.functions || [])])),
      basicFunctions: hasAuthoritativeFuncs
        ? { ...(funcs.basicFunctions || {}) }
        : { ...(base?.basicFunctions || {}) },
    };
  }

  function requestedMathEvalFunctions(code) {
    const names = [];
    const text = String(code || "");
    const regex = /math\.eval\s*\(\s*["']\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
    let match;
    while ((match = regex.exec(text))) {
      if (!names.includes(match[1])) names.push(match[1]);
    }
    return names;
  }

  loadLuaPreviewSymbols = async function (item, sourceOverride = null) {
    const base = await oldLoadLuaPreviewSymbols(item, sourceOverride);
    const funcs = await readFuncSymbolsFromXml();
    return mergePreviewSymbols(base, funcs);
  };

  createLovePreviewNspireRuntime = async function (code, ctx, canvas, logEl, symbols = {}) {
    const funcs = await readFuncSymbolsFromXml();
    const merged = mergePreviewSymbols(symbols, funcs);
    const linked = Object.entries(merged.basicFunctions || {}).map(([name, def]) => {
      const params = String(def?.params || "").trim();
      return `${name}(${params})`;
    });
    if (logEl) {
      appendPreviewLog(logEl, `TI Func XML: ${linked.length ? linked.join(", ") : "0"}`);
      const requested = requestedMathEvalFunctions(code);
      if (requested.length) appendPreviewLog(logEl, `TI Func solicitadas por math.eval: ${requested.join(", ")}`);
    }

    const runtime = await oldCreateLovePreviewNspireRuntime(code, ctx, canvas, logEl, merged);

    if (logEl && linked.length) {
      const status = Object.keys(merged.basicFunctions || {}).map((name) => (
        `${name}=${typeof window.G?.str?.[name] === "function" ? "OK" : "MISSING"}`
      ));
      appendPreviewLog(logEl, `TI Func runtime: ${status.join(", ")}`);
    }
    return runtime;
  };

  createNewXmlProject = async function () {
    const settings = await programSettingsModal({
      name: "nuevo", documentType: "Prgm", libraryAccess: "LibPub", parameters: "",
    }, t("newXmlProject"));
    if (!settings) return;
    await oldNew();
    if (!xmlDoctor.current) await scanXmlPrograms();
    await applyFreshSettings(settings);
    xmlLog(`Documento creado como ${settings.documentType}: ${settings.name}.`);
  };

  addProgramEditorToStage = async function () {
    const settings = await programSettingsModal({
      name: uniqueName(), documentType: "Prgm", libraryAccess: "LibPub", parameters: "",
    }, t("addProgramEditorWidget"), true);
    if (!settings) return null;
    if (xmlDoctor.current && !xmlDoctor.embedded) await persistCurrentProgram();
    await oldAdd();
    if (!xmlDoctor.current) await scanXmlPrograms();
    await applyFreshSettings(settings);
    xmlLog(`ProgramEditor agregado como ${settings.documentType}: ${settings.name}.`);
    return xmlDoctor.current;
  };

  openDocumentInspector = async function () {
    if (xmlDoctor.current && !xmlDoctor.embedded) await persistCurrentProgram();
    return oldInspector();
  };

  selectXmlProgram = function (index) {
    syncCode();
    return oldSelect(index);
  };

  codeBox()?.addEventListener("input", syncCode);

  document.querySelector("#xml-programs")?.addEventListener("change", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const next = Number(event.target.value);
    const previous = xmlDoctor.current?.index;
    (async () => {
      if (xmlDoctor.current && !xmlDoctor.embedded && previous !== next) await persistCurrentProgram();
      oldSelect(next);
    })().catch((error) => {
      if (previous != null) event.target.value = String(previous);
      xmlLog(`ERROR guardando antes de cambiar: ${error.message}`);
      console.error(error);
    });
  }, true);
})();
