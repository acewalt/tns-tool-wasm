(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const AUTOSAVE_KEY = "tns-tool-ndless-project-autosave-v1";

  const FILE_TYPES = Object.freeze({
    c: { label: "C source", ext: ".c", language: "ndless-c", starter: "#include <os.h>\n\nvoid feature(void) {\n    \n}\n" },
    cpp: { label: "C++ source", ext: ".cpp", language: "ndless-cpp", starter: "#include <os.h>\n\nvoid feature() {\n    \n}\n" },
    header: { label: "Header", ext: ".h", language: "ndless-c", starter: "#pragma once\n\n" },
    asm: { label: "ARM Assembly", ext: ".S", language: "ndless-arm", starter: ".syntax unified\n.arm\n.text\n\n.global my_function\nmy_function:\n    bx lr\n" },
    lua: { label: "Lua auxiliary", ext: ".lua", language: "lua", starter: "-- Auxiliary Lua file. It is not compiled by the Ndless Makefile.\n\n" },
    text: { label: "Plain text", ext: ".txt", language: "plaintext", starter: "" },
  });

  const LANGUAGE_OPTIONS = Object.freeze([
    ["auto", "Auto detect"],
    ["ndless-c", "C"],
    ["ndless-cpp", "C++"],
    ["ndless-arm", "ARM Assembly"],
    ["ndless-makefile", "Makefile"],
    ["lua", "Lua"],
    ["plaintext", "Plain text"],
  ]);

  const TOOL_ITEMS = Object.freeze([
    ["compile", "Compile current file", "Ctrl+F7"],
    ["build", "Build", "F7"],
    ["clean-build", "Clean Build", ""],
    ["clean", "Clean", "Ctrl+1"],
    ["emulator", "TI-Nspire emulator", "Ctrl+2"],
    ["build-run", "Build & Run in emulator", "Ctrl+5"],
    ["transfer", "Transfer to calculator", ""],
    ["sdk-console", "Ndless SDK console", "Ctrl+6"],
  ]);

  let languagesRegistered = false;
  let currentWorkspace = null;
  let lastActiveFile = null;
  let lastAppliedLanguage = null;
  let auxiliaryEditor = null;

  const api = () => window.NdlessProjectWorkspace;
  const core = () => window.NdlessProjectCore;
  const project = () => api()?.getProject?.() || null;
  const workspace = () => $("#xml-doctor-panel .ndless-project-workspace");

  function persistProject() {
    const p = project();
    if (!p) return;
    try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(p)); } catch (_) {}
  }

  function registerMonacoLanguages() {
    if (languagesRegistered) return true;
    const monaco = window.TnsMonacoEditor?.monaco;
    if (!monaco) return false;
    const register = (id, aliases, config, tokens) => {
      if (!monaco.languages.getLanguages().some(item => item.id === id)) monaco.languages.register({ id, aliases });
      if (config) monaco.languages.setLanguageConfiguration(id, config);
      if (tokens) monaco.languages.setMonarchTokensProvider(id, tokens);
    };
    register("ndless-arm", ["ARM Assembly", "GNU Assembly"], {
      comments: { lineComment: "@", blockComment: ["/*", "*/"] },
      brackets: [["[", "]"], ["(", ")"]],
    }, {
      ignoreCase: true,
      keywords: ["adc","add","and","asr","b","bic","bl","blx","bx","cmp","cmn","eor","ldr","ldrb","ldrh","ldm","lsl","lsr","mla","mov","mvn","mul","orr","pop","push","rsb","rsc","sbc","stm","str","strb","strh","sub","swi","teq","tst"],
      directives: [".arm",".thumb",".text",".data",".bss",".global",".globl",".extern",".align",".word",".byte",".short",".ascii",".asciz",".syntax",".section",".type",".size"],
      tokenizer: { root: [
        [/@.*$/, "comment"], [/\/\*/, "comment", "@comment"],
        [/\.[A-Za-z_][\w.]*/, { cases: { "@directives": "keyword.directive", "@default": "keyword" } }],
        [/\b(?:r1[0-5]|r\d|sp|lr|pc|cpsr|spsr)\b/i, "variable.predefined"],
        [/[A-Za-z_.$][\w.$]*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
        [/0x[0-9a-f]+|\b\d+\b/i, "number"], [/"([^"\\]|\\.)*"/, "string"],
        [/[#,:!{}\[\]()]/, "delimiter"], [/[+\-*\/]/, "operator"],
      ], comment: [[/[^*]+/, "comment"], [/\*\//, "comment", "@pop"], [/\*/, "comment"]] }
    });
    register("ndless-makefile", ["Makefile", "GNU Make"], { comments: { lineComment: "#" } }, {
      tokenizer: { root: [
        [/#.*$/, "comment"], [/^\s*(?:ifeq|ifneq|ifdef|ifndef|else|endif|include|-?include|define|endef|override|export|unexport|private|vpath)\b/, "keyword"],
        [/\$\((?:[^()]|\([^)]*\))*\)|\$\{[^}]+\}/, "variable"], [/^[A-Za-z0-9_.%+\/-]+(?=\s*:)/, "type.identifier"],
        [/\b(?:gcc|g\+\+|nspire-gcc|nspire-g\+\+|nspire-as|nspire-ld|nspire-ld-bflt|genzehn|make-prg|make|rm|echo)\b/, "type"],
        [/[:=+?@%<>|&;*-]+/, "operator"], [/"([^"\\]|\\.)*"/, "string"], [/\b\d+\b/, "number"],
      ] }
    });
    languagesRegistered = true;
    return true;
  }

  function autoLanguage(name) {
    if (/Makefile$/i.test(name) || /\.mk$/i.test(name)) return "ndless-makefile";
    if (/\.(?:cpp|cc|cxx|hpp|hh)$/i.test(name)) return "ndless-cpp";
    if (/\.(?:c|h)$/i.test(name)) return "ndless-c";
    if (/\.(?:S|s)$/i.test(name)) return "ndless-arm";
    if (/\.lua$/i.test(name)) return "lua";
    return "plaintext";
  }

  function activeModel() {
    const monaco = window.TnsMonacoEditor?.monaco;
    if (!monaco) return null;
    const models = monaco.editor.getModels().filter(model => !model.isDisposed());
    return models.at(-1) || null;
  }

  function updateLanguageLabel(id) {
    const root = workspace(); if (!root) return;
    const label = LANGUAGE_OPTIONS.find(([key]) => key === id)?.[1] || id.replace(/^ndless-/, "").toUpperCase();
    const top = $("[data-sdk-language-label]", root); if (top) top.textContent = label;
    const badge = $("[data-active-language]", root); if (badge) badge.textContent = label.toUpperCase();
  }

  function applyLanguage(mode, { force = false } = {}) {
    const p = project(), monaco = window.TnsMonacoEditor?.monaco;
    if (!p || !monaco || !registerMonacoLanguages()) return;
    p.settings ||= {};
    p.settings.languageOverrides ||= {};
    if (mode === "auto") delete p.settings.languageOverrides[p.activeFile];
    else p.settings.languageOverrides[p.activeFile] = mode;
    const target = mode === "auto" ? autoLanguage(p.activeFile) : mode;
    const model = activeModel();
    const current = model?.getLanguageId?.();
    if (model && (force || current !== target)) monaco.editor.setModelLanguage(model, target);
    lastActiveFile = p.activeFile;
    lastAppliedLanguage = target;
    updateLanguageLabel(target);
    persistProject();
  }

  function refreshActiveLanguage(force = false) {
    const p = project(); if (!p) return;
    const mode = p.settings?.languageOverrides?.[p.activeFile] || "auto";
    const target = mode === "auto" ? autoLanguage(p.activeFile) : mode;
    if (!force && lastActiveFile === p.activeFile && lastAppliedLanguage === target) {
      updateLanguageLabel(target);
      return;
    }
    applyLanguage(mode, { force });
  }

  function disposeAuxiliaryEditor() {
    try { auxiliaryEditor?.dispose?.(); } catch (_) {}
    auxiliaryEditor = null;
  }

  function ensureAuxiliaryEditor() {
    const p = project(), root = workspace();
    if (!p || !root || !/\.lua$/i.test(p.activeFile || "")) return;
    const host = $("[data-ndless-project-editor]", root);
    if (!host || !window.TnsMonacoEditor) return;
    if (!host.querySelector(".ndless-project-empty") && host.querySelector(".monaco-editor")) return;
    disposeAuxiliaryEditor();
    host.innerHTML = "";
    auxiliaryEditor = window.TnsMonacoEditor.createTextEditor(host, {
      value: String(p.files[p.activeFile] || ""), language: "lua",
      theme: document.documentElement.dataset.theme === "light" ? "light" : "dark",
      editorOptions: { fontSize: 13, lineHeight: 20, wordWrap: "off", minimap: { enabled: false }, padding: { top: 12, bottom: 12 } },
    });
    auxiliaryEditor.onInput(value => { p.files[p.activeFile] = value; persistProject(); });
    updateLanguageLabel("lua");
  }

  function compileCommand(p) {
    const file = p.activeFile || "", object = file.replace(/\.[^.]+$/, ".o");
    if (/\.c$/i.test(file)) return `nspire-gcc -Os -c "${file}" -o "${object}"`;
    if (/\.(?:cpp|cc|cxx)$/i.test(file)) return `nspire-g++ -std=c++11 -Os -c "${file}" -o "${object}"`;
    if (/\.(?:S|s)$/i.test(file)) return `nspire-as -c "${file}" -o "${object}"`;
    return null;
  }

  function showConsole(lines) {
    const root = workspace(); if (!root) return;
    $("[data-project-tab='console']", root)?.click();
    setTimeout(() => { const out = $("[data-project-console]", root); if (out) out.textContent = lines.join("\n"); }, 0);
  }

  function toolAction(action) {
    const p = project(); if (!p) return;
    const name = core()?.sanitizeProjectName?.(p.name) || p.name || "program";
    if (action === "compile") {
      const cmd = compileCommand(p);
      showConsole(cmd ? [`> Compile ${p.activeFile}`, cmd, "", "Native execution requires the Ndless toolchain; the browser is showing the exact SDK command."] : [`> Compile ${p.activeFile}`, "This file is not compiled directly by the Ndless toolchain."]);
    } else if (action === "build") $("[data-project-tab='build']", workspace())?.click();
    else if (action === "clean-build") showConsole(["> Clean Build", "make clean all"]);
    else if (action === "clean") showConsole(["> Clean", "make clean"]);
    else if (action === "emulator") showConsole(["> TI-Nspire emulator", "nspire_emu is a native desktop executable and cannot be launched directly by GitHub Pages.", "", "Configure OS/boot/NAND, launch nspire_emu, then transfer the built .tns."]);
    else if (action === "build-run") showConsole(["> Build & Run in emulator", "make", `# transfer ${name}.tns to nspire_emu`, "", "Equivalent to the r903 run_prgm_in_emu workflow."]);
    else if (action === "transfer") showConsole(["> Transfer to calculator", `navnetcmd put ${name}.tns /ndless/${name}.tns`, "", "Browser USB transfer is not connected yet."]);
    else if (action === "sdk-console") showConsole(["> Ndless SDK console", "nspire-gcc / nspire-g++ / nspire-as", "nspire-ld or nspire-ld-bflt", "genzehn / make-prg for Zehn", "", "Build: make"]);
  }

  function closeMenus(root = document) { $$(".ndless-sdk-popover.open", root).forEach(menu => menu.classList.remove("open")); }

  function injectTopbar(root) {
    const top = $(".ndless-project-topbar", root); if (!top || $("[data-sdk-controls]", top)) return;
    const controls = document.createElement("div");
    controls.className = "ndless-sdk-controls";
    controls.dataset.sdkControls = "1";
    controls.innerHTML = `<div class="ndless-sdk-menu"><button type="button" class="ndless-sdk-trigger" data-sdk-language-trigger>Language · <span data-sdk-language-label>Auto detect</span></button><div class="ndless-sdk-popover" data-sdk-language-menu>${LANGUAGE_OPTIONS.map(([id,label]) => `<button type="button" data-sdk-language="${esc(id)}">${esc(label)}</button>`).join("")}<small>Syntax highlighting only. Ndless builds C/C++/ARM source.</small></div></div><div class="ndless-sdk-menu"><button type="button" class="ndless-sdk-trigger" data-sdk-tools-trigger>Tools</button><div class="ndless-sdk-popover ndless-sdk-tools" data-sdk-tools-menu>${TOOL_ITEMS.map(([id,label,key]) => `<button type="button" data-sdk-tool="${esc(id)}"><span>${esc(label)}</span><kbd>${esc(key)}</kbd></button>`).join("")}</div></div>`;
    top.insertBefore(controls, $(".ndless-project-actions", top) || null);
    $("[data-sdk-language-trigger]", controls).onclick = event => { event.stopPropagation(); const pop = $("[data-sdk-language-menu]", controls), open = !pop.classList.contains("open"); closeMenus(root); pop.classList.toggle("open", open); };
    $("[data-sdk-tools-trigger]", controls).onclick = event => { event.stopPropagation(); const pop = $("[data-sdk-tools-menu]", controls), open = !pop.classList.contains("open"); closeMenus(root); pop.classList.toggle("open", open); };
    $$('[data-sdk-language]', controls).forEach(button => button.onclick = () => { applyLanguage(button.dataset.sdkLanguage, { force: true }); closeMenus(root); });
    $$('[data-sdk-tool]', controls).forEach(button => button.onclick = () => { toolAction(button.dataset.sdkTool); closeMenus(root); });
  }

  function setupWorkspace(force = false) {
    const root = workspace();
    if (!root) { currentWorkspace = null; lastActiveFile = null; lastAppliedLanguage = null; disposeAuxiliaryEditor(); return; }
    if (root !== currentWorkspace) {
      currentWorkspace = root;
      lastActiveFile = null;
      lastAppliedLanguage = null;
      injectTopbar(root);
      force = true;
    }
    refreshActiveLanguage(force);
    ensureAuxiliaryEditor();
  }

  function activateProject(projectValue) {
    const original = window.__NdlessProjectOriginalApi || window.NdlessProjectWorkspace;
    original?.activateProject?.(projectValue);
    requestAnimationFrame(() => setupWorkspace(true));
  }

  function showFileDialog() {
    const p = project(); if (!p) return;
    const overlay = document.createElement("div");
    overlay.className = "ndless-sdk-dialog-overlay";
    overlay.innerHTML = `<form class="ndless-sdk-dialog"><header><div><small>NDLESS PROJECT</small><h3>New source file</h3></div><button type="button" data-close>×</button></header><label>Type<select name="type">${Object.entries(FILE_TYPES).map(([id,item]) => `<option value="${id}">${esc(item.label)}</option>`).join("")}</select></label><label>File name<input name="name" value="new_file.c" autocomplete="off"></label><p>C, C++, headers and ARM Assembly participate in the build. Lua/text files are auxiliary.</p><footer><button type="button" data-close>Cancel</button><button type="submit" class="primary">Create file</button></footer></form>`;
    document.body.appendChild(overlay);
    const form = $("form", overlay), type = $("select[name='type']", overlay), name = $("input[name='name']", overlay);
    type.onchange = () => { const item = FILE_TYPES[type.value], base = String(name.value || "new_file").replace(/\.[^.]+$/, ""); name.value = `${base || "new_file"}${item.ext}`; };
    $$('[data-close]', overlay).forEach(button => button.onclick = () => overlay.remove());
    overlay.onclick = event => { if (event.target === overlay) overlay.remove(); };
    form.onsubmit = event => {
      event.preventDefault();
      const item = FILE_TYPES[type.value] || FILE_TYPES.c;
      const filename = String(name.value || "").trim().replace(/[\\/:*?"<>|]+/g, "_");
      if (!filename) return;
      if (p.files[filename] != null) { alert("File already exists."); return; }
      p.files[filename] = item.starter;
      p.activeFile = filename;
      p.settings ||= {}; p.settings.languageOverrides ||= {};
      if (item.language && item.language !== autoLanguage(filename)) p.settings.languageOverrides[filename] = item.language;
      overlay.remove();
      activateProject(p);
    };
  }

  function showProjectWizard() {
    const existing = project();
    if (existing && !confirm("An Ndless project is already open. Replace the current session?")) return;
    const overlay = document.createElement("div");
    overlay.className = "ndless-project-dialog-overlay ndless-project-dialog-overlay-v2";
    overlay.innerHTML = `<form class="ndless-project-dialog"><div class="ndless-project-dialog-head"><div><span>NDLESS</span><h3>Create Ndless project</h3></div><button type="button" data-close>×</button></div><label>Project name<input name="name" value="my-ndless-app" autocomplete="off"></label><div class="ndless-project-dialog-grid"><label>Primary source<select name="language"><option value="c">C</option><option value="cpp">C++</option><option value="asm">ARM Assembly</option><option value="mixed">Mixed C/C++/ARM</option></select></label><label>Template<select name="template"><option value="basic">Basic</option><option value="graphics">Graphics (nSDL)</option><option value="console">Console</option></select></label></div><label>Target<select name="target"><option value="bflt-r903">Legacy bFLT · OS 3.1</option><option value="zehn-modern">Modern Zehn</option></select></label><p data-project-mode-note>Makefile, headers, Lua and text remain project files; they are not standalone Ndless executable languages.</p><div class="ndless-project-dialog-actions"><button type="button" data-close>Cancel</button><button class="primary" type="submit">Create project</button></div></form>`;
    document.body.appendChild(overlay);
    const form = $("form", overlay), language = $("select[name='language']", overlay), template = $("select[name='template']", overlay), note = $("[data-project-mode-note]", overlay);
    const sync = () => {
      const asm = language.value === "asm";
      template.disabled = asm;
      if (asm) { template.innerHTML = '<option value="basic">Minimal ARM</option>'; note.textContent = "Creates main.S with a global main label and a Makefile that uses nspire-as."; }
      else if (template.options.length === 1) { template.innerHTML = '<option value="basic">Basic</option><option value="graphics">Graphics (nSDL)</option><option value="console">Console</option>'; note.textContent = language.value === "mixed" ? "Starts with C plus an ARM helper. Add C++, headers or more Assembly files as needed." : "Makefile, headers, Lua and text remain project files; they are not standalone Ndless executable languages."; }
    };
    language.onchange = sync; sync();
    $$('[data-close]', overlay).forEach(button => button.onclick = () => overlay.remove());
    overlay.onclick = event => { if (event.target === overlay) overlay.remove(); };
    form.onsubmit = event => {
      event.preventDefault();
      const data = new FormData(form);
      const created = core().createProject({ name: data.get("name"), language: data.get("language"), template: data.get("template"), target: data.get("target") });
      overlay.remove();
      activateProject(created);
    };
  }

  function wrapWorkspaceApi() {
    if (!window.NdlessProjectWorkspace || window.__NdlessProjectOriginalApi) return;
    const original = window.NdlessProjectWorkspace;
    window.__NdlessProjectOriginalApi = original;
    window.NdlessProjectWorkspace = Object.freeze({ ...original, newProject: showProjectWizard, activateProject });
  }

  function installKeyboardShortcuts() {
    if (document.documentElement.dataset.ndlessSdkKeysV2 === "1") return;
    document.documentElement.dataset.ndlessSdkKeysV2 = "1";
    document.addEventListener("keydown", event => {
      if (!project()) return;
      if (event.ctrlKey && event.key === "F7") { event.preventDefault(); toolAction("compile"); }
      else if (!event.ctrlKey && event.key === "F7") { event.preventDefault(); toolAction("build"); }
      else if (event.ctrlKey && event.key === "1") { event.preventDefault(); toolAction("clean"); }
      else if (event.ctrlKey && event.key === "2") { event.preventDefault(); toolAction("emulator"); }
      else if (event.ctrlKey && event.key === "5") { event.preventDefault(); toolAction("build-run"); }
      else if (event.ctrlKey && event.key === "6") { event.preventDefault(); toolAction("sdk-console"); }
    }, true);
  }

  document.addEventListener("click", event => {
    const newProjectButton = event.target.closest?.("#xml-new-ndless-project");
    if (newProjectButton) { event.preventDefault(); event.stopImmediatePropagation(); showProjectWizard(); return; }
    if (event.target.closest?.("[data-project-new-file]") && project()) { event.preventDefault(); event.stopImmediatePropagation(); showFileDialog(); return; }
    if (event.target.closest?.("[data-project-files] button")) {
      disposeAuxiliaryEditor();
      setTimeout(() => setupWorkspace(true), 0);
    }
    if (!event.target.closest?.(".ndless-sdk-menu")) closeMenus();
  }, true);

  document.addEventListener("change", event => {
    if (event.target.closest?.(".ndless-project-menu-action") || event.target.matches?.("input[type='file']")) setTimeout(() => setupWorkspace(true), 30);
  }, true);

  function init() {
    if (!window.NdlessProjectWorkspace || !window.NdlessProjectCore) return setTimeout(init, 80);
    wrapWorkspaceApi();
    registerMonacoLanguages();
    installKeyboardShortcuts();
    setupWorkspace(true);
    window.addEventListener("tns-monaco-ready", () => { registerMonacoLanguages(); setupWorkspace(true); }, { once: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})();