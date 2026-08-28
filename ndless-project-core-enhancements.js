(() => {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const base = root.NdlessProjectCore;
  if (!base || base.__projectModesV2) return;

  const PROJECT_LANGUAGES = Object.freeze({
    c: { id: "c", label: "C", description: "C source project" },
    cpp: { id: "cpp", label: "C++", description: "C++ source project" },
    asm: { id: "asm", label: "ARM Assembly", description: "GNU ARM assembly project" },
    mixed: { id: "mixed", label: "Mixed C/C++/ARM", description: "C/C++ project with ARM assembly helpers" },
  });

  const ARM_MAIN = `.syntax unified\n.arm\n.text\n\n.global main\n.type main, %function\nmain:\n    mov r0, #0\n    bx lr\n.size main, .-main\n`;
  const ARM_HELPER = `.syntax unified\n.arm\n.text\n\n.global ndless_helper\n.type ndless_helper, %function\nndless_helper:\n    bx lr\n.size ndless_helper, .-ndless_helper\n`;
  const BROWSER_C = `/* Browser-buildable freestanding Ndless starter.\n * No SDK/newlib calls are used in this minimal target.\n */\n\nint main(void) {\n    return 0;\n}\n`;
  const BROWSER_CPP = `/* Browser-buildable freestanding Ndless C++ starter.\n * Keep exceptions/RTTI disabled for the minimal browser provider.\n */\n\nclass App {\npublic:\n    int run() { return 0; }\n};\n\nint main(void) {\n    App app;\n    return app.run();\n}\n`;

  const languageLabel = language => PROJECT_LANGUAGES[language]?.label || (language === "cpp" ? "C++" : "C");

  function enhancedReadme(project) {
    const target = base.TARGETS[project.target]?.label || project.target;
    const browser = !!project.settings?.browserFreestanding;
    return `# ${project.name}\n\nThis project was created by TNS Tool WASM.\n\nTarget: ${target}\nLanguage: ${languageLabel(project.language)}\n\n## Browser Build TNS\n\n${browser ? "This project uses the freestanding browser-compatible starter. Open the Build tab and press **Build TNS**. The browser build produces ARM ELF32 and packages it as Modern Zehn when the lazy compiler exposes an ARM backend." : "The standard SDK templates may use <os.h>, newlib, nSDL or other Ndless libraries. Those still require the full SDK sysroot. Use the **Browser minimal (freestanding)** template for the current in-browser Modern Zehn provider."}\n\n## External SDK build\n\nOpen a terminal with the matching Ndless SDK toolchain in PATH, then run:\n\nmake\n\nThe Quick Preview is source-aware and intentionally limited; it is not an emulator.\n`;
  }

  function createProject(options = {}) {
    const mode = PROJECT_LANGUAGES[options.language] ? options.language : "c";
    const baseLanguage = mode === "cpp" ? "cpp" : "c";
    const browserMinimal = options.template === "browser-minimal";
    const project = base.createProject({ ...options, language: baseLanguage, template: browserMinimal ? "basic" : options.template });
    project.language = mode;
    project.settings ||= {};
    project.settings.browserFreestanding = browserMinimal || mode === "asm";

    if (mode === "asm") {
      for (const name of Object.keys(project.files)) {
        if (/\.(?:c|cpp|cc|cxx)$/i.test(name)) delete project.files[name];
      }
      project.files["main.S"] = ARM_MAIN;
      project.activeFile = "main.S";
      project.template = "asm-minimal";
    } else {
      if (browserMinimal) {
        const main = Object.keys(project.files).find(name => /\.(?:c|cpp|cc|cxx)$/i.test(name));
        if (main) project.files[main] = mode === "cpp" ? BROWSER_CPP : BROWSER_C;
        project.template = "browser-minimal";
      }
      if (mode === "mixed") {
        project.files["helper.S"] = ARM_HELPER;
        if (!/\.(?:c|cpp|cc|cxx)$/i.test(project.activeFile || "")) {
          project.activeFile = Object.keys(project.files).find(name => /\.(?:c|cpp|cc|cxx)$/i.test(name)) || "main.c";
        }
      }
    }

    project.files.Makefile = base.makefileFor(project);
    project.files["README_BUILD.md"] = enhancedReadme(project);
    return project;
  }

  function refreshGeneratedFiles(project) {
    project.files.Makefile = base.makefileFor(project);
    project.files["README_BUILD.md"] = enhancedReadme(project);
    return project;
  }

  function validateAssembly(sources) {
    const errors = [], warnings = [];
    const text = sources.map(([, source]) => String(source)).join("\n");
    if (!/(?:^|\s)(?:\.global|\.globl)\s+main\b/im.test(text) || !/^\s*main\s*:/mi.test(text)) {
      errors.push("ARM Assembly project needs a global main label.");
    }
    if (!/\.arm\b/i.test(text)) warnings.push("No .arm directive was detected.");
    return { valid: errors.length === 0, errors, warnings };
  }

  function validateProject(project) {
    const mode = PROJECT_LANGUAGES[project?.language] ? project.language : "c";
    const entries = Object.entries(project?.files || {});
    const asm = entries.filter(([name]) => /\.(?:S|s)$/i.test(name));
    const cFamily = entries.filter(([name]) => /\.(?:c|cpp|cc|cxx)$/i.test(name));

    if (mode === "asm") {
      if (!asm.length) return { valid: false, errors: ["Project has no ARM Assembly source file."], warnings: [] };
      return validateAssembly(asm);
    }

    const result = base.validateProject(project);
    if (mode === "mixed" && !asm.length) result.warnings.push("Mixed project has no ARM Assembly source file yet.");
    if (mode === "mixed" && !cFamily.length && asm.length) return validateAssembly(asm);
    return result;
  }

  function manifest(project) {
    const parsed = JSON.parse(base.manifest(project));
    parsed.language = project.language;
    parsed.settings = project.settings || {};
    return JSON.stringify(parsed, null, 2);
  }

  function exportEntries(project) {
    refreshGeneratedFiles(project);
    return { ".tnsproject.json": manifest(project), ...project.files };
  }

  function importEntries(entries) {
    let meta = null;
    try { if (entries?.[".tnsproject.json"]) meta = JSON.parse(entries[".tnsproject.json"]); } catch (_) {}
    const project = base.importEntries(entries);
    const names = Object.keys(project.files || {});
    const hasAsm = names.some(name => /\.(?:S|s)$/i.test(name));
    const hasC = names.some(name => /\.(?:c|cpp|cc|cxx)$/i.test(name));
    if (PROJECT_LANGUAGES[meta?.language]) project.language = meta.language;
    else if (hasAsm && hasC) project.language = "mixed";
    else if (hasAsm) project.language = "asm";
    project.settings ||= {};
    if (meta?.settings && typeof meta.settings === "object") project.settings = { ...project.settings, ...meta.settings };
    refreshGeneratedFiles(project);
    return project;
  }

  root.NdlessProjectCore = Object.freeze({
    ...base,
    __projectModesV2: true,
    PROJECT_LANGUAGES,
    BROWSER_C,
    BROWSER_CPP,
    languageLabel,
    createProject,
    refreshGeneratedFiles,
    validateProject,
    manifest,
    exportEntries,
    importEntries,
    buildReadme: enhancedReadme,
  });
})();
