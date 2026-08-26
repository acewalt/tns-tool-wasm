(() => {
  "use strict";
  if (window.__tnsXmlProgramEditorFix) return;
  window.__tnsXmlProgramEditorFix = true;

  const oldNew = createNewXmlProject;
  const oldAdd = addProgramEditorToStage;
  const oldInspector = openDocumentInspector;
  const oldSelect = selectXmlProgram;
  const oldRunXmlSyntax = runXmlSyntax;
  const oldRenderXmlAnalysis = renderXmlAnalysis;
  const oldLoadLuaPreviewSymbols = loadLuaPreviewSymbols;
  const codeBox = () => document.querySelector("#xml-code");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function syncCode() {
    if (!xmlDoctor.current || !codeBox()) return;
    xmlDoctor.current.code = codeBox().value;
    xmlDoctor.embedded = false;
  }

  function uniqueName(base = "nuevo") {
    const used = new Set((xmlDoctor.candidates || []).map((x) => String(x.program_name || "").toLowerCase()));
    let name = base, i = 2;
    while (used.has(name.toLowerCase())) name = `${base}_${i++}`;
    return name;
  }

  function settingsModal(initial, title, checkDuplicate = false, exclude = "") {
    return new Promise((resolve) => {
      const modal = document.createElement("div");
      modal.className = "modal-backdrop";
      modal.innerHTML = `<div class="modal document-settings-modal">
        <h2>${esc(title)}</h2>
        <div class="document-settings-grid">
          <label>Name<input id="xpe-name" value="${esc(initial.name || "nuevo")}" spellcheck="false"></label>
          <label>Type<select id="xpe-type"><option>Prgm</option><option>Func</option></select></label>
          <label>Library access<select id="xpe-access"><option>None</option><option>LibPub</option><option>LibPriv</option></select></label>
          <label>Arguments<input id="xpe-args" value="${esc(initial.parameters || "")}" spellcheck="false"></label>
        </div>
        <div id="xpe-error" style="color:#ff6b6b;min-height:20px"></div>
        <div class="modal-actions"><button id="xpe-cancel">Cancel</button><button id="xpe-apply">Apply</button></div>
      </div>`;
      document.body.append(modal);
      modal.querySelector("#xpe-type").value = initial.documentType === "Func" ? "Func" : "Prgm";
      modal.querySelector("#xpe-access").value = ["None","LibPub","LibPriv"].includes(initial.libraryAccess) ? initial.libraryAccess : "LibPub";
      const done = (value) => typeof closeModal === "function" ? closeModal(modal, () => resolve(value)) : (modal.remove(), resolve(value));
      modal.querySelector("#xpe-cancel").onclick = () => done(null);
      modal.querySelector("#xpe-apply").onclick = () => {
        const name = modal.querySelector("#xpe-name").value.trim();
        const exists = (xmlDoctor.candidates || []).some((x) => String(x.program_name || "").toLowerCase() === name.toLowerCase() && String(x.program_name || "").toLowerCase() !== String(exclude || "").toLowerCase());
        if (!/^[A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*$/.test(name)) {
          modal.querySelector("#xpe-error").textContent = "Nombre TI-Nspire inválido.";
          return;
        }
        if (checkDuplicate && exists) {
          modal.querySelector("#xpe-error").textContent = `Ya existe ${name}.`;
          return;
        }
        done({name, documentType: modal.querySelector("#xpe-type").value, libraryAccess: modal.querySelector("#xpe-access").value, parameters: modal.querySelector("#xpe-args").value.trim()});
      };
    });
  }

  async function persist() {
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

  async function applySettings(settings, fresh = false) {
    if (!xmlDoctor.current) throw new Error("No hay Prgm/Func seleccionado.");
    const item = xmlDoctor.current;
    if (!item.original_name) item.original_name = item.program_name;
    item.program_name = settings.name;
    item.document_type = settings.documentType;
    item.library_access = settings.libraryAccess;
    item.parameters = settings.parameters;
    let code = codeBox().value || item.code || "";
    code = fresh && settings.documentType === "Func" ? "Func\nReturn 0\nEndFunc" : coerceXmlDocumentType(code, settings.documentType);
    codeBox().value = code;
    item.code = code;
    xmlDoctor.embedded = false;
    refreshXmlProgramOptions();
    updateXmlLineNumbers();
    await embedXmlCode();
    return rescanSelect(settings.name, settings.documentType);
  }

  async function editSettings() {
    if (!xmlDoctor.current) return;
    syncCode();
    const oldName = xmlDoctor.current.program_name || "nuevo";
    const s = await settingsModal({name: oldName, documentType: xmlDoctor.current.document_type || detectXmlDocumentType(codeBox().value), libraryAccess: xmlDoctor.current.library_access || "None", parameters: xmlDoctor.current.parameters || ""}, "Document settings", true, oldName);
    if (!s) return;
    await applySettings(s, false);
    xmlLog(`Document settings guardados en XML: ${s.name} [${s.documentType}].`);
  }

  function validBareFuncValues() {
    const box = codeBox();
    if (!box || detectXmlDocumentType(box.value) !== "Func") return new Map();
    const lines = String(box.value || "").replace(/\r\n?/g, "\n").split("\n");
    const declared = new Set();
    for (const raw of String(xmlDoctor.current?.parameters || "").split(",")) {
      const name = raw.trim();
      if (/^[A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*$/.test(name)) declared.add(name);
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
          if (/^[A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*$/.test(name)) declared.add(name);
        }
      }
      const colonAssign = /^([A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*)\s*:=/.exec(line);
      if (colonAssign) declared.add(colonAssign[1]);
      const arrowAssign = /(?:->|→)\s*([A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*)\s*$/.exec(line);
      if (arrowAssign) declared.add(arrowAssign[1]);
      const forVar = /^For\s+([A-Za-z_À-ÿµλσπθΩ][A-Za-z0-9_À-ÿµλσπθΩ]*)\b/i.exec(line);
      if (forVar) declared.add(forVar[1]);
    }
    return valid;
  }

  function normalizeFuncSyntaxReport(report) {
    if (!report || !Array.isArray(report.diagnostics)) return report;
    const valid = validBareFuncValues();
    if (!valid.size) return report;
    const originalLength = report.diagnostics.length;
    report.diagnostics = report.diagnostics.filter((diag) => {
      const isUnknownCommand = Number(diag?.code) === 410 || String(diag?.code_label || "").toUpperCase() === "E410";
      if (!isUnknownCommand) return true;
      const line = Number(diag?.line) || 0;
      return !valid.has(line);
    });
    if (report.diagnostics.length !== originalLength) {
      report.errors = report.diagnostics.filter((diag) => String(diag?.severity || "").toUpperCase() === "ERROR").length;
      report.warnings = report.diagnostics.filter((diag) => String(diag?.severity || "").toUpperCase() === "WARNING").length;
    }
    return report;
  }

  renderXmlAnalysis = function (report) {
    return oldRenderXmlAnalysis(normalizeFuncSyntaxReport(report));
  };

  runXmlSyntax = async function () {
    return normalizeFuncSyntaxReport(await oldRunXmlSyntax());
  };

  function normalizeFsPath(path) {
    return String(path || "").replace(/\\/g, "/").replace(/\/$/, "");
  }

  function fsExists(path) {
    if (!path || !pyodide?.FS) return false;
    try {
      return Boolean(pyodide.FS.analyzePath(path).exists);
    } catch (_error) {
      return false;
    }
  }

  function stageAwarePreviewItem(item) {
    if (!item?.file || !xmlDoctor.stagePrepared) return item;
    const file = normalizeFsPath(item.file);
    const sourceRoot = normalizeFsPath(xmlDoctor.sourcePath);
    const stageRoot = normalizeFsPath(xmlDoctor.stagePath);
    if (!stageRoot || file === stageRoot || file.startsWith(`${stageRoot}/`)) return item;
    if (sourceRoot && (file === sourceRoot || file.startsWith(`${sourceRoot}/`))) {
      const relative = file.slice(sourceRoot.length).replace(/^\/+/, "");
      const candidate = `${stageRoot}/${relative}`;
      if (fsExists(candidate)) return { ...item, file: candidate };
    }
    const basename = file.split("/").pop();
    const fallback = basename ? `${stageRoot}/${basename}` : "";
    return fsExists(fallback) ? { ...item, file: fallback } : item;
  }

  async function loadProjectBasicFunctions() {
    if (!pyodide) return { functions: [], basicFunctions: {} };
    const root = normalizeFsPath(xmlDoctor.stagePrepared ? xmlDoctor.stagePath : xmlDoctor.sourcePath);
    if (!root || !fsExists(root)) return { functions: [], basicFunctions: {} };
    pyodide.globals.set("wasm_xpe_symbol_root", root);
    const payload = await pyodide.runPythonAsync(`
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from xml_scanner import local_name

root_path = Path(wasm_xpe_symbol_root)
functions = []
basic_functions = {}
for xml_file in root_path.rglob("*.xml"):
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
        symbol_type = element.attrib.get("t", "")
        is_program = symbol_type in {"6", "7"} or value.lstrip().startswith(("Func", "Prgm"))
        if not is_program:
            continue
        if name not in functions:
            functions.append(name)
        if symbol_type == "6" or value.lstrip().startswith("Func"):
            basic_functions[name] = {"params": params, "body": value}
json.dumps({"functions": functions, "basicFunctions": basic_functions})
`);
    return JSON.parse(payload);
  }

  loadLuaPreviewSymbols = async function (item, sourceOverride = null) {
    const base = await oldLoadLuaPreviewSymbols(stageAwarePreviewItem(item), sourceOverride);
    const project = await loadProjectBasicFunctions();
    const functions = Array.from(new Set([...(base?.functions || []), ...(project.functions || [])]));
    return {
      ...(base || {}),
      functions,
      basicFunctions: {
        ...(base?.basicFunctions || {}),
        ...(project.basicFunctions || {}),
      },
    };
  };

  createNewXmlProject = async function () {
    const s = await settingsModal({name:"nuevo",documentType:"Prgm",libraryAccess:"LibPub",parameters:""}, "New document");
    if (!s) return;
    await oldNew();
    if (!xmlDoctor.current) await scanXmlPrograms();
    await applySettings(s, true);
    xmlLog(`Documento creado como ${s.documentType}: ${s.name}.`);
  };

  addProgramEditorToStage = async function () {
    const s = await settingsModal({name:uniqueName(),documentType:"Prgm",libraryAccess:"LibPub",parameters:""}, "Add Program Editor", true);
    if (!s) return null;
    if (xmlDoctor.current && !xmlDoctor.embedded) await persist();
    await oldAdd();
    if (!xmlDoctor.current) await scanXmlPrograms();
    await applySettings(s, true);
    xmlLog(`ProgramEditor agregado como ${s.documentType}: ${s.name}.`);
    return xmlDoctor.current;
  };

  openDocumentInspector = async function () {
    if (xmlDoctor.current && !xmlDoctor.embedded) await persist();
    return oldInspector();
  };

  selectXmlProgram = function (index) {
    syncCode();
    return oldSelect(index);
  };

  codeBox()?.addEventListener("input", syncCode);

  document.querySelector("#xml-document-btn")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    editSettings().catch((e) => { xmlLog(`ERROR Document settings: ${e.message}`); console.error(e); });
  }, true);

  document.querySelector("#xml-programs")?.addEventListener("change", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const next = Number(event.target.value);
    const previous = xmlDoctor.current?.index;
    (async () => {
      if (xmlDoctor.current && !xmlDoctor.embedded && previous !== next) await persist();
      oldSelect(next);
    })().catch((e) => {
      if (previous != null) event.target.value = String(previous);
      xmlLog(`ERROR guardando antes de cambiar: ${e.message}`);
      console.error(e);
    });
  }, true);
})();
