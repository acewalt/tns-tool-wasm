(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

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

  function workspaceApi() { return window.NdlessProjectWorkspace; }
  function project() { return workspaceApi()?.getProject?.() || null; }
  function workspace() { return $("#xml-doctor-panel .ndless-project-workspace"); }

  function registerMonacoLanguages() {
    const monaco = window.TnsMonacoEditor?.monaco;
    if (!monaco) return false;
    const register = (id, aliases, config, tokens) => {
      if (!monaco.languages.getLanguages().some((x) => x.id === id)) monaco.languages.register({ id, aliases });
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
    return true;
  }

  function autoLanguage(name) {
    if (/Makefile$/i.test(name)) return "ndless-makefile";
    if (/\.(?:cpp|cc|cxx|hpp|hh)$/i.test(name)) return "ndless-cpp";
    if (/\.(?:c|h)$/i.test(name)) return "ndless-c";
    if (/\.(?:S|s)$/i.test(name)) return "ndless-arm";
    if (/\.lua$/i.test(name)) return "lua";
    return "plaintext";
  }

  function activeModel() {
    const p = project(), monaco = window.TnsMonacoEditor?.monaco;
    if (!p || !monaco) return null;
    const text = String(p.files?.[p.activeFile] ?? "");
    const matches = monaco.editor.getModels().filter((m) => !m.isDisposed() && m.getValue() === text);
    return matches[matches.length - 1] || monaco.editor.getModels().filter((m) => !m.isDisposed()).at(-1) || null;
  }

  function applyLanguage(mode) {
    const p = project(), monaco = window.TnsMonacoEditor?.monaco;
    if (!p || !monaco) return;
    registerMonacoLanguages();
    p.settings ||= {};
    p.settings.languageOverrides ||= {};
    if (mode === "auto") delete p.settings.languageOverrides[p.activeFile];
    else p.settings.languageOverrides[p.activeFile] = mode;
    const target = mode === "auto" ? autoLanguage(p.activeFile) : mode;
    const model = activeModel();
    if (model) monaco.editor.setModelLanguage(model, target);
    updateLanguageLabel(target);
  }

  function refreshActiveLanguage() {
    const p = project(); if (!p) return;
    const mode = p.settings?.languageOverrides?.[p.activeFile] || "auto";
    setTimeout(() => applyLanguage(mode), 25);
  }

  function updateLanguageLabel(id) {
    const root = workspace(); if (!root) return;
    const label = LANGUAGE_OPTIONS.find(([key]) => key === id)?.[1] || id.replace(/^ndless-/, "").toUpperCase();
    const el = $("[data-sdk-language-label]", root); if (el) el.textContent = label;
  }

  function compileCommand(p) {
    const f = p.activeFile || "";
    const obj = f.replace(/\.[^.]+$/, ".o");
    if (/\.c$/i.test(f)) return `nspire-gcc -Os -c "${f}" -o "${obj}"`;
    if (/\.(?:cpp|cc|cxx)$/i.test(f)) return `nspire-g++ -std=c++11 -Os -c "${f}" -o "${obj}"`;
    if (/\.(?:S|s)$/i.test(f)) return `nspire-as -c "${f}" -o "${obj}"`;
    return null;
  }

  function showConsole(lines) {
    const root = workspace(); if (!root) return;
    $("[data-project-tab='console']", root)?.click();
    setTimeout(() => {
      const out = $("[data-project-console]", root);
      if (out) out.textContent = lines.join("\n");
    }, 0);
  }

  function toolAction(action) {
    const p = project(); if (!p) return;
    const name = window.NdlessProjectCore?.sanitizeProjectName?.(p.name) || p.name || "program";
    if (action === "compile") {
      const cmd = compileCommand(p);
      showConsole(cmd ? [`> Compile ${p.activeFile}`, cmd, "", "The browser workspace shows the SDK command; native nspire-gcc/nspire-g++ execution requires the Ndless toolchain."] : [`> Compile ${p.activeFile}`, "This file type is not compiled directly by the Ndless toolchain."]);
    } else if (action === "build") {
      $("[data-project-tab='build']", workspace())?.click();
    } else if (action === "clean-build") {
      showConsole(["> Clean Build", "make clean all", "", "Equivalent to the NdlessEditor Clean Build tool."]);
    } else if (action === "clean") {
      showConsole(["> Clean", "make clean"]);
    } else if (action === "emulator") {
      showConsole(["> TI-Nspire emulator", "nspire_emu is a native desktop executable and cannot be launched by GitHub Pages.", "", "SDK workflow:", "1. Configure emu_resources with OS, boot1 and NAND/boot2.", "2. Launch nspire_emu.", "3. Transfer the generated .tns to the emulator."]);
    } else if (action === "build-run") {
      showConsole(["> Build & Run in emulator", "make", `# then transfer ${name}.tns to nspire_emu`, "", "This mirrors cmd_tools/run_prgm_in_emu.lua from the r903 SDK."]);
    } else if (action === "transfer") {
      showConsole(["> Transfer to calculator", `navnetcmd put ${name}.tns /ndless/${name}.tns`, "", "The r903 SDK uses navnetcmd for this step. Browser USB transfer is not connected yet."]);
    } else if (action === "sdk-console") {
      showConsole(["> Ndless SDK console", "Toolchain expected in PATH:", "nspire-gcc / nspire-g++ / nspire-as / nspire-ld or nspire-ld-bflt", "genzehn / make-prg (Zehn target)", "", "Project build command:", "make"]);
    }
  }

  function closeMenus(root = document) { $$(".ndless-sdk-popover.open", root).forEach((x) => x.classList.remove("open")); }

  function injectTopbar(root) {
    const top = $(".ndless-project-topbar", root); if (!top || $("[data-sdk-controls]", top)) return;
    const controls = document.createElement("div");
    controls.className = "ndless-sdk-controls";
    controls.dataset.sdkControls = "1";
    controls.innerHTML = `
      <div class="ndless-sdk-menu">
        <button type="button" class="ndless-sdk-trigger" data-sdk-language-trigger>Language · <span data-sdk-language-label>Auto detect</span></button>
        <div class="ndless-sdk-popover" data-sdk-language-menu>
          ${LANGUAGE_OPTIONS.map(([id, label]) => `<button type="button" data-sdk-language="${esc(id)}">${esc(label)}</button>`).join("")}
          <small>Editor syntax only. Ndless itself compiles C/C++/ARM source.</small>
        </div>
      </div>
      <div class="ndless-sdk-menu">
        <button type="button" class="ndless-sdk-trigger" data-sdk-tools-trigger>Tools</button>
        <div class="ndless-sdk-popover ndless-sdk-tools" data-sdk-tools-menu>
          ${TOOL_ITEMS.map(([id, label, key]) => `<button type="button" data-sdk-tool="${esc(id)}"><span>${esc(label)}</span><kbd>${esc(key)}</kbd></button>`).join("")}
        </div>
      </div>`;
    const actions = $(".ndless-project-actions", top);
    top.insertBefore(controls, actions || null);

    $("[data-sdk-language-trigger]", controls).addEventListener("click", (e) => { e.stopPropagation(); const pop = $("[data-sdk-language-menu]", controls); const open = !pop.classList.contains("open"); closeMenus(root); pop.classList.toggle("open", open); });
    $("[data-sdk-tools-trigger]", controls).addEventListener("click", (e) => { e.stopPropagation(); const pop = $("[data-sdk-tools-menu]", controls); const open = !pop.classList.contains("open"); closeMenus(root); pop.classList.toggle("open", open); });
    $$('[data-sdk-language]', controls).forEach((b) => b.addEventListener("click", () => { applyLanguage(b.dataset.sdkLanguage); closeMenus(root); }));
    $$('[data-sdk-tool]', controls).forEach((b) => b.addEventListener("click", () => { toolAction(b.dataset.sdkTool); closeMenus(root); }));
    refreshActiveLanguage();
  }

  function fileDialog() {
    const p = project(); if (!p) return;
    const ov = document.createElement("div");
    ov.className = "ndless-sdk-dialog-overlay";
    ov.innerHTML = `<form class="ndless-sdk-dialog"><header><div><small>NDLESS PROJECT</small><h3>New source file</h3></div><button type="button" data-close>×</button></header><label>Type<select name="type">${Object.entries(FILE_TYPES).map(([id, item]) => `<option value="${id}">${esc(item.label)}</option>`).join("")}</select></label><label>File name<input name="name" value="new_file.c" autocomplete="off"></label><p data-file-note>C, C++, headers and ARM Assembly participate in the Ndless build. Lua/text files are auxiliary project files.</p><footer><button type="button" data-close>Cancel</button><button type="submit" class="primary">Create file</button></footer></form>`;
    document.body.appendChild(ov);
    const form = $("form", ov), type = $("select[name='type']", ov), name = $("input[name='name']", ov);
    const syncName = () => { const item = FILE_TYPES[type.value]; const base = String(name.value || "new_file").replace(/\.[^.]+$/, ""); name.value = `${base || "new_file"}${item.ext}`; };
    type.addEventListener("change", syncName);
    $$('[data-close]', ov).forEach((b) => b.addEventListener("click", () => ov.remove()));
    ov.addEventListener("click", (e) => { if (e.target === ov) ov.remove(); });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const item = FILE_TYPES[type.value] || FILE_TYPES.c;
      let filename = String(name.value || "").trim().replace(/[\\/:*?"<>|]+/g, "_");
      if (!filename) return;
      if (p.files[filename] != null) { alert("File already exists."); return; }
      const api = workspaceApi();
      api?.closeProject?.();
      p.files[filename] = item.starter;
      p.activeFile = filename;
      p.settings ||= {};
      p.settings.languageOverrides ||= {};
      if (item.language && item.language !== autoLanguage(filename)) p.settings.languageOverrides[filename] = item.language;
      ov.remove();
      api?.activateProject?.(p);
    });
  }

  function installKeyboardShortcuts() {
    if (document.documentElement.dataset.ndlessSdkKeys === "1") return;
    document.documentElement.dataset.ndlessSdkKeys = "1";
    document.addEventListener("keydown", (e) => {
      if (!project()) return;
      if (e.ctrlKey && e.key === "F7") { e.preventDefault(); toolAction("compile"); }
      else if (!e.ctrlKey && e.key === "F7") { e.preventDefault(); toolAction("build"); }
      else if (e.ctrlKey && e.key === "1") { e.preventDefault(); toolAction("clean"); }
      else if (e.ctrlKey && e.key === "2") { e.preventDefault(); toolAction("emulator"); }
      else if (e.ctrlKey && e.key === "5") { e.preventDefault(); toolAction("build-run"); }
      else if (e.ctrlKey && e.key === "6") { e.preventDefault(); toolAction("sdk-console"); }
    }, true);
  }

  function observeWorkspace() {
    const observer = new MutationObserver(() => {
      const root = workspace();
      if (!root) return;
      injectTopbar(root);
      refreshActiveLanguage();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    const root = workspace(); if (root) injectTopbar(root);
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest?.("[data-project-new-file]") && project()) {
      e.preventDefault(); e.stopImmediatePropagation(); fileDialog(); return;
    }
    if (!e.target.closest?.(".ndless-sdk-menu")) closeMenus();
  }, true);

  function init() {
    if (!window.NdlessProjectWorkspace || !window.NdlessProjectCore) return setTimeout(init, 100);
    registerMonacoLanguages();
    observeWorkspace();
    installKeyboardShortcuts();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})();