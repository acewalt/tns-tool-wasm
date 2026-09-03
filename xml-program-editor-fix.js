(() => {
  "use strict";

  window.__tnsXmlProgramEditorFix = true;
  window.__tnsXmlProgramEditorFixVersion = 7;

  const oldNew = createNewXmlProject;
  const oldAdd = addProgramEditorToStage;
  const oldInspector = openDocumentInspector;
  const oldSelect = selectXmlProgram;
  const oldRunXmlSyntax = runXmlSyntax;
  const oldRenderXmlAnalysis = renderXmlAnalysis;
  const oldAutoFixXml = autoFixXml;
  const oldLoadLuaPreviewSymbols = loadLuaPreviewSymbols;
  const oldCreateLovePreviewNspireRuntime = createLovePreviewNspireRuntime;

  const codeBox = () => document.querySelector("#xml-code");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
  const validTiName = (name) => /^[A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*$/.test(String(name || ""));
  const TI_COMPAT_BUILTINS = new Set(["gcd", "system"]);

  function normalizedTiStatement(line) {
    return String(line || "").replace(/^\s*:+\s*/, "").trim();
  }

  function isSingleLineIf(line) {
    const statement = normalizedTiStatement(line);
    return /^If\b\s+.+/i.test(statement) && !/\bThen\b/i.test(statement);
  }

  function currentCodeLines() {
    return String(codeBox()?.value || "").replace(/\r\n?/g, "\n").split("\n");
  }

  function siblingFunctionNames() {
    const result = new Set();
    for (const item of xmlDoctor.candidates || []) {
      const name = String(item?.program_name || item?.name || "").trim();
      if (!name) continue;
      if (item?.document_type === "Func" || item?.type === "Func") result.add(name.toLowerCase());
    }
    return result;
  }

  function indexedAssignmentBases(lines) {
    const result = new Set();
    const targetRe = /(?:->|→)\s*([A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*)\s*\[[^\]]+\]\s*(?::|$)/g;
    for (const line of lines) {
      let match;
      while ((match = targetRe.exec(String(line || "")))) result.add(match[1].toLowerCase());
    }
    return result;
  }

  function hasIndexedAssignmentTarget(line) {
    return /(?:->|→)\s*[A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*\s*\[[^\]]+\]\s*(?::|$)/.test(String(line || ""));
  }

  function delVarNames(line) {
    const result = new Set();
    for (const part of String(line || "").split(":")) {
      const match = /^\s*DelVar\s+(.+)$/i.exec(part);
      if (!match) continue;
      for (const raw of match[1].split(",")) {
        const name = raw.trim();
        if (validTiName(name)) result.add(name.toLowerCase());
      }
    }
    return result;
  }

  function diagnosticCode(diag) {
    const direct = Number(diag?.code);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const match = /E(\d+)/i.exec(String(diag?.code_label || ""));
    return match ? Number(match[1]) : 0;
  }

  function diagnosticText(diag) {
    return String(diag?.message || diag?.description || diag?.detail || "");
  }

  function referencedName(diag) {
    const text = diagnosticText(diag);
    const patterns = [
      /Function is not defined:\s*([A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*)/i,
      /Variable (?:is not defined|no declarada):\s*([A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*)/i,
      /Undefined variable:\s*([A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*)/i,
    ];
    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match) return match[1].toLowerCase();
    }
    return "";
  }

  function protectSingleLineIfs(code) {
    const mapping = new Map();
    let count = 0;
    const lines = String(code || "").replace(/\r\n?/g, "\n").split("\n");
    const protectedLines = lines.map((line) => {
      if (!isSingleLineIf(line)) return line;
      const token = `__TNS_SINGLE_IF_GUARD_${count++}__`;
      mapping.set(token, line);
      return token;
    });
    return { code: protectedLines.join("\n"), mapping };
  }

  function restoreSingleLineIfs(code, mapping) {
    if (!mapping?.size) return String(code || "");
    return String(code || "").replace(/\r\n?/g, "\n").split("\n").map((line) => {
      const original = mapping.get(line.trim());
      return original ?? line;
    }).join("\n");
  }

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

  openXmlDocumentSettings = async function () {
    if (!xmlDoctor.current) return;
    syncCode();
    const current = xmlDoctor.current;
    const originalName = current.original_name || current.program_name;
    const settings = await programSettingsModal({
      name: current.program_name,
      documentType: current.document_type || detectXmlDocumentType(codeBox()?.value || ""),
      libraryAccess: current.library_access || "None",
      parameters: current.parameters || "",
    }, t("documentSettings"), true, current.program_name);
    if (!settings) return;

    current.original_name = originalName;
    current.program_name = settings.name;
    current.document_type = settings.documentType;
    current.library_access = settings.libraryAccess;
    current.parameters = settings.parameters;
    const coerced = coerceXmlDocumentType(codeBox()?.value || current.code || "", settings.documentType);
    codeBox().value = coerced;
    current.code = coerced;
    xmlDoctor.embedded = false;
    refreshXmlProgramOptions();
    updateXmlLineNumbers();
    renderXmlAnalysis({ errors: 0, warnings: 0, infos: 0, diagnostics: [] });

    try {
      await embedXmlCode();
      await rescanSelect(settings.name, settings.documentType);
      xmlLog(`${t("documentSettings")}: ${settings.name}, ${settings.documentType}, ${settings.libraryAccess}, args=${settings.parameters || "-"}`);
    } catch (error) {
      xmlLog(`ERROR Document settings: ${error.message}`);
      throw error;
    }
  };

  function validBareFuncValues() {
    const box = codeBox();
    if (!box || (xmlDoctor.current?.document_type !== "Func" && detectXmlDocumentType(box.value) !== "Func")) return new Map();
    const lines = String(box.value || "").replace(/\r\n?/g, "\n").split("\n");
    const declared = new Set();
    for (const raw of String(xmlDoctor.current?.parameters || "").split(",")) {
      const name = raw.trim();
      if (validTiName(name)) declared.add(name);
    }
    const valid = new Map();
    for (let index = 0; index < lines.length; index += 1) {
      const line = normalizedTiStatement(lines[index]);
      const bare = /^([A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*)$/.exec(line);
      if (bare && declared.has(bare[1])) valid.set(index + 1, bare[1]);
      const local = /^Local\s+(.+)$/i.exec(line);
      if (local) for (const rawName of local[1].split(",")) {
        const name = rawName.trim();
        if (validTiName(name)) declared.add(name);
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
    const lines = currentCodeLines();
    const assignedBases = indexedAssignmentBases(lines);
    const siblingFuncs = siblingFunctionNames();

    report.diagnostics = report.diagnostics.filter((diag) => {
      const code = diagnosticCode(diag);
      const lineNumber = Number(diag?.line) || 0;
      const line = lines[lineNumber - 1] || "";
      const text = diagnosticText(diag);
      const name = referencedName(diag);

      if (code === 410 && valid.has(lineNumber)) return false;

      // TI-Basic permits assignment directly into list/matrix elements, e.g.
      // x→lst[1] or value→m[2,3]. The core analyzer currently only accepts a
      // bare identifier as an assignment target.
      if (code === 910 && /invalid assignment target/i.test(text) && hasIndexedAssignmentTarget(line)) return false;

      // TI-Nspire has a one-command If form that intentionally omits Then and
      // EndIf. Only the block form uses Then ... EndIf.
      if (code === 740 && isSingleLineIf(line)) return false;
      if (code === 730 && isSingleLineIf(line) && /If|EndIf|block/i.test(text)) return false;

      // Built-ins observed in valid TI documents and Func cards in the same TNS
      // must not be reported as undefined function references.
      if (code === 1090 && name && (TI_COMPAT_BUILTINS.has(name) || siblingFuncs.has(name))) return false;

      // Indexed assignment creates/updates the base list/matrix variable. Also,
      // DelVar targets are destinations, not reads, so they should not trigger
      // an undefined-variable diagnostic.
      if (code === 960 && name) {
        if (assignedBases.has(name)) return false;
        if (delVarNames(line).has(name)) return false;
      }

      return true;
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

  autoFixXml = async function () {
    const box = codeBox();
    if (!box) return oldAutoFixXml();
    const original = box.value;
    const guarded = protectSingleLineIfs(original);
    if (!guarded.mapping.size) return oldAutoFixXml();

    box.value = guarded.code;
    try {
      const result = await oldAutoFixXml();
      box.value = restoreSingleLineIfs(box.value, guarded.mapping);
      if (xmlDoctor.current) xmlDoctor.current.code = box.value;
      xmlDoctor.embedded = false;
      updateXmlLineNumbers();
      if (xmlDoctor.lastDiff) {
        let restoredDiff = String(xmlDoctor.lastDiff);
        for (const [token, originalLine] of guarded.mapping) {
          restoredDiff = restoredDiff.split(token).join(originalLine);
        }
        xmlDoctor.lastDiff = restoredDiff;
      }
      return result;
    } catch (error) {
      box.value = original;
      updateXmlLineNumbers();
      throw error;
    }
  };

  function normalizeFuncBody(item, bodyOverride = null) {
    const rawBody = String(bodyOverride ?? item?.code ?? item?.content ?? item?.text ?? "").replace(/\r\n?/g, "\n").trim();
    const isFunc = item?.document_type === "Func" || item?.type === "Func" || /^Func\b/i.test(rawBody);
    if (!isFunc || !rawBody) return null;
    if (/^Func\b/i.test(rawBody)) return rawBody;
    return `Func\nReturn ${rawBody}\nEndFunc`;
  }

  function collectMemoryFuncSymbols() {
    const functions = [];
    const basicFunctions = {};
    const sources = {};
    const add = (item, source, bodyOverride = null) => {
      if (!item) return;
      const name = String(item.program_name || item.name || "").trim();
      const body = normalizeFuncBody(item, bodyOverride);
      if (!name || !body) return;
      if (!functions.includes(name)) functions.push(name);
      basicFunctions[name] = { params: String(item.parameters ?? item.params ?? ""), body };
      sources[name] = source;
    };
    for (const item of xmlDoctor.candidates || []) add(item, "xmlDoctor.candidates");
    if (xmlDoctor.current) add(xmlDoctor.current, "editor-memory", codeBox()?.value ?? xmlDoctor.current.code);
    return { functions, basicFunctions, sources };
  }

  async function readFuncSymbolsFromXml() {
    const memory = collectMemoryFuncSymbols();
    if (!pyodide) return memory;
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
    if not raw: return None
    p = Path(raw)
    return p if p.exists() else None
root_path = usable(stage_raw) or usable(source_raw)
functions, basic_functions, sources = [], {}, {}
def xml_files(root):
    if root is None: return []
    if root.is_file(): return [root] if root.suffix.lower() == ".xml" else []
    return sorted(root.rglob("*.xml"), key=lambda p: str(p).lower())
def direct_text(parent, wanted):
    for child in list(parent):
        if local_name(child.tag) == wanted:
            return child.text or ""
    return ""
for xml_file in xml_files(root_path):
    try: xml_root = ET.parse(xml_file).getroot()
    except Exception: continue
    for element in xml_root.iter():
        name = direct_text(element, "n").strip()
        value = direct_text(element, "v")
        if not name or element.attrib.get("t") != "6" or not value.strip(): continue
        params = direct_text(element, "p")
        body = value.strip()
        if not body.lstrip().startswith("Func"):
            body = "Func\\nReturn " + body + "\\nEndFunc"
        if name not in functions: functions.append(name)
        basic_functions[name] = {"params": params, "body": body}
        sources[name] = str(xml_file)
json.dumps({"functions": functions, "basicFunctions": basic_functions, "sources": sources})
`);
    let disk = { functions: [], basicFunctions: {}, sources: {} };
    try { disk = JSON.parse(payload); } catch (error) { console.warn(error); }
    const functions = Array.from(new Set([...(disk.functions || []), ...(memory.functions || [])]));
    return {
      functions,
      basicFunctions: { ...(disk.basicFunctions || {}), ...(memory.basicFunctions || {}) },
      sources: { ...(disk.sources || {}), ...(memory.sources || {}) },
    };
  }

  function mergePreviewSymbols(base = {}, funcs = {}) {
    const hasFuncs = Object.keys(funcs?.basicFunctions || {}).length > 0;
    return {
      ...(base || {}),
      functions: Array.from(new Set([...(base?.functions || []), ...(funcs?.functions || [])])),
      basicFunctions: hasFuncs ? { ...(funcs.basicFunctions || {}) } : { ...(base?.basicFunctions || {}) },
    };
  }

  function requestedMathEvalFunctions(code) {
    const names = [];
    const regex = /math\.eval\s*\(\s*["']\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
    let match;
    while ((match = regex.exec(String(code || "")))) if (!names.includes(match[1])) names.push(match[1]);
    return names;
  }

  loadLuaPreviewSymbols = async function (item, sourceOverride = null) {
    const base = await oldLoadLuaPreviewSymbols(item, sourceOverride);
    return mergePreviewSymbols(base, await readFuncSymbolsFromXml());
  };

  createLovePreviewNspireRuntime = async function (code, ctx, canvas, logEl, symbols = {}) {
    const funcs = await readFuncSymbolsFromXml();
    const merged = mergePreviewSymbols(symbols, funcs);
    const linked = Object.entries(merged.basicFunctions || {}).map(([name, def]) => `${name}(${String(def?.params || "").trim()})`);
    if (logEl) {
      appendPreviewLog(logEl, `TI Func XML: ${linked.length ? linked.join(", ") : "0"}`);
      const requested = requestedMathEvalFunctions(code);
      if (requested.length) appendPreviewLog(logEl, `TI Func solicitadas por math.eval: ${requested.join(", ")}`);
      const sources = Object.entries(funcs.sources || {}).map(([name, source]) => `${name}←${String(source).split("/").pop() || source}`);
      if (sources.length) appendPreviewLog(logEl, `TI Func fuentes: ${sources.join(", ")}`);
    }
    const runtime = await oldCreateLovePreviewNspireRuntime(code, ctx, canvas, logEl, merged);
    if (logEl && linked.length) {
      const status = Object.keys(merged.basicFunctions || {}).map((name) => `${name}=${typeof window.G?.str?.[name] === "function" ? "OK" : "MISSING"}`);
      appendPreviewLog(logEl, `TI Func runtime: ${status.join(", ")}`);
    }
    return runtime;
  };

  function patchInspectorIfEmpty() {
    const backdrop = Array.from(document.querySelectorAll(".modal-backdrop")).pop();
    const modal = backdrop?.querySelector(".modal");
    if (!modal) return;
    const heading = String(modal.querySelector("h2")?.textContent || "").toLowerCase();
    if (!heading.includes("inspector") && !heading.includes("document")) return;
    const table = modal.querySelector("table");
    if (!table) return;
    const tbody = table.tBodies[0] || table.createTBody();
    if (Array.from(tbody.rows).some((row) => String(row.textContent || "").trim())) return;
    const candidates = xmlDoctor.candidates || [];
    for (const item of candidates) {
      const row = tbody.insertRow();
      const values = [item.program_name || "(sin nombre)", "Editor", item.document_type || item.kind || "Basic",
        String(item.file || "").split("/").pop(), item.path || "", item.parameters ? `(${item.parameters})` : ""];
      for (const value of values) row.insertCell().textContent = String(value ?? "");
    }
    if (candidates.length) xmlLog(`Inspector: restauradas ${candidates.length} filas de ProgramEditor.`);
  }

  createNewXmlProject = async function () {
    const settings = await programSettingsModal({ name: "nuevo", documentType: "Prgm", libraryAccess: "LibPub", parameters: "" }, t("newXmlProject"));
    if (!settings) return;
    await oldNew();
    if (!xmlDoctor.current) await scanXmlPrograms();
    await applyFreshSettings(settings);
    xmlLog(`Documento creado como ${settings.documentType}: ${settings.name}.`);
  };

  addProgramEditorToStage = async function () {
    const settings = await programSettingsModal({ name: uniqueName(), documentType: "Prgm", libraryAccess: "LibPub", parameters: "" }, t("addProgramEditorWidget"), true);
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
    await scanXmlPrograms();
    const result = await oldInspector();
    patchInspectorIfEmpty();
    requestAnimationFrame(patchInspectorIfEmpty);
    return result;
  };

  selectXmlProgram = function (index) {
    syncCode();
    return oldSelect(index);
  };

  document.querySelector("#xml-document-btn")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    openXmlDocumentSettings().catch((error) => xmlLog(`ERROR Document settings: ${error.message}`));
  }, true);

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