import * as monaco from "monaco-editor/editor/editor.api";
import "../../node_modules/monaco-editor/esm/vs/editor/contrib/folding/browser/folding.js";
import "../../node_modules/monaco-editor/esm/vs/base/browser/ui/codicons/codicon/codicon.css";
import { conf as luaConf, language as luaLanguage } from "../../node_modules/monaco-editor/esm/vs/languages/definitions/lua/lua.js";
import { conf as pythonConf, language as pythonLanguage } from "../../node_modules/monaco-editor/esm/vs/languages/definitions/python/python.js";
import editorWorker from "monaco-editor/editor/editor.worker?worker";

globalThis.MonacoEnvironment = {
  getWorker() {
    return new editorWorker();
  },
};

const DARK_THEME = "tns-lua-dark";
const LIGHT_THEME = "tns-lua-light";
const EDITOR_UI_STYLE_ID = "tns-monaco-editor-ui-tweaks";
let themesDefined = false;
let luaDefined = false;
let pythonDefined = false;
let tiDefined = false;

function installEditorUiTweaks() {
  if (document.getElementById(EDITOR_UI_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = EDITOR_UI_STYLE_ID;
  style.textContent = `
    /* Keep the floating search control clear of Monaco's vertical scrollbar. */
    .tns-monaco-search-rail {
      right: 58px !important;
    }

    /* Move the expanded search panel with the button so both stay aligned. */
    .tns-monaco-search-panel {
      right: 101px !important;
      width: min(330px, calc(100% - 124px)) !important;
    }
  `;
  document.head.append(style);
}

function registerLanguageOnce(id, definition) {
  if (!monaco.languages.getLanguages().some((language) => language.id === id)) {
    monaco.languages.register(definition);
  }
}

function defineLuaLanguage() {
  if (luaDefined) return;
  luaDefined = true;
  registerLanguageOnce("lua", {
    id: "lua",
    extensions: [".lua"],
    aliases: ["Lua", "lua"],
    mimetypes: ["text/x-lua"],
  });
  monaco.languages.setLanguageConfiguration("lua", luaConf);
  monaco.languages.setMonarchTokensProvider("lua", luaLanguage);
}

function definePythonLanguage() {
  if (pythonDefined) return;
  pythonDefined = true;
  registerLanguageOnce("python", {
    id: "python",
    extensions: [".py"],
    aliases: ["Python", "py"],
    mimetypes: ["text/x-python"],
  });
  monaco.languages.setLanguageConfiguration("python", pythonConf);
  monaco.languages.setMonarchTokensProvider("python", pythonLanguage);
}

function defineTiLanguage() {
  if (tiDefined) return;
  tiDefined = true;
  registerLanguageOnce("ti-basic", {
    id: "ti-basic",
    extensions: [".tns-program", ".tnsprg"],
    aliases: ["TI-Nspire Program", "TI-Basic", "TNS Program"],
    mimetypes: ["text/x-ti-nspire-program"],
  });
  monaco.languages.setLanguageConfiguration("ti-basic", {
    comments: {
      lineComment: "//",
      blockComment: ["/*", "*/"],
    },
    brackets: [
      ["(", ")"],
      ["[", "]"],
    ],
    autoClosingPairs: [
      { open: '"', close: '"' },
      { open: "(", close: ")" },
      { open: "[", close: "]" },
    ],
  });
  monaco.languages.setMonarchTokensProvider("ti-basic", {
    defaultToken: "identifier",
    ignoreCase: true,
    keywords: [
      "Define", "LibPriv", "LibPub", "Prgm", "Func", "Local", "If", "Then",
      "Else", "ElseIf", "For", "To", "Step", "Do", "While", "Loop", "EndIf",
      "EndFor", "EndLoop", "Disp", "Request", "Text", "Return", "EndPrgm",
      "EndFunc", "Try", "ElseTry", "EndTry", "Stop", "Cycle", "Exit",
    ],
    builtins: [
      "approx", "string", "sqrt", "cos", "sin", "tan", "ln", "log", "abs",
      "when", "nSolve", "solve", "factor", "expand", "clrio",
    ],
    tokenizer: {
      root: [
        [/"([^"\\]|\\.)*$/, "string.invalid"],
        [/"/, "string", "@string"],
        [/[A-Za-z_][A-Za-z0-9_]*/, {
          cases: {
            "@keywords": "keyword",
            "@builtins": "type",
            "@default": "identifier",
          },
        }],
        [/\d+(?:\.\d+)?(?:e[+-]?\d+)?/i, "number"],
        [/[→:=+\-*/^=<>&·√πΣΔ]/, "operator"],
        [/[()[\],]/, "delimiter"],
      ],
      string: [
        [/[^\\"]+/, "string"],
        [/"/, "string", "@pop"],
      ],
    },
  });
}

function defineLanguage(language) {
  if (language === "python") {
    definePythonLanguage();
  } else if (language === "ti-basic") {
    defineTiLanguage();
  } else {
    defineLuaLanguage();
  }
}

function defineThemes() {
  if (themesDefined) return;
  themesDefined = true;

  monaco.editor.defineTheme(DARK_THEME, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "7dd3fc", fontStyle: "bold" },
      { token: "comment", foreground: "94a3b8", fontStyle: "italic" },
      { token: "string", foreground: "bef264" },
      { token: "number", foreground: "fb923c" },
      { token: "operator", foreground: "f0abfc" },
      { token: "delimiter", foreground: "bfdbfe" },
      { token: "identifier", foreground: "e2e8f0" },
      { token: "type", foreground: "67e8f9" },
    ],
    colors: {
      "editor.background": "#0f172a",
      "editor.foreground": "#e2e8f0",
      "editorLineNumber.foreground": "#8fb7ee",
      "editorLineNumber.activeForeground": "#dbeafe",
      "editorGutter.background": "#0f172a",
      "editorGutter.foldingControlForeground": "#93c5fd",
      "editor.selectionBackground": "#3b628f",
      "editor.inactiveSelectionBackground": "#20334d",
      "editorCursor.foreground": "#a3e635",
      "editor.lineHighlightBackground": "#17223a",
      "editorIndentGuide.background1": "#20324e",
      "scrollbarSlider.background": "#64748b80",
      "scrollbarSlider.hoverBackground": "#94a3b880",
      "scrollbarSlider.activeBackground": "#cbd5e180",
    },
  });

  monaco.editor.defineTheme(LIGHT_THEME, {
    base: "vs",
    inherit: true,
    rules: [
      // Palette inspired by the TI-Nspire Program Editor references: blue
      // commands/keywords, red literals/operators and dark variable names.
      { token: "keyword", foreground: "0000cc", fontStyle: "" },
      { token: "comment", foreground: "008000", fontStyle: "italic" },
      { token: "string", foreground: "c00000" },
      { token: "string.invalid", foreground: "c00000" },
      { token: "number", foreground: "c00000" },
      { token: "operator", foreground: "c00000" },
      { token: "delimiter", foreground: "111111" },
      { token: "identifier", foreground: "111111" },
      { token: "type", foreground: "0050b3" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#111111",
      "editorLineNumber.foreground": "#687386",
      "editorLineNumber.activeForeground": "#111111",
      "editorGutter.background": "#ffffff",
      "editorGutter.foldingControlForeground": "#2563eb",
      "editor.selectionBackground": "#cfe3ff",
      "editor.inactiveSelectionBackground": "#e6f0ff",
      "editorCursor.foreground": "#111111",
      "editor.lineHighlightBackground": "#f5f8fc",
      "editorIndentGuide.background1": "#d8dee8",
      "scrollbarSlider.background": "#94a3b866",
      "scrollbarSlider.hoverBackground": "#64748b80",
      "scrollbarSlider.activeBackground": "#47556980",
    },
  });
}

function themeName(theme) {
  return theme === "light" ? LIGHT_THEME : DARK_THEME;
}

function toOffset(model, value) {
  const safeValue = Math.max(0, Number(value) || 0);
  return model.getPositionAt(safeValue);
}

function severityFor(level) {
  const normalized = String(level || "").toUpperCase();
  if (normalized === "ERROR") return monaco.MarkerSeverity.Error;
  if (normalized === "WARNING") return monaco.MarkerSeverity.Warning;
  return monaco.MarkerSeverity.Info;
}

export function createTextEditor(container, options = {}) {
  installEditorUiTweaks();
  defineThemes();
  const language = options.language || "lua";
  defineLanguage(language);
  const editor = monaco.editor.create(container, {
    value: String(options.value ?? ""),
    language,
    theme: themeName(options.theme),
    automaticLayout: true,
    minimap: { enabled: false },
    fontFamily: "'Cascadia Mono', 'JetBrains Mono', Consolas, monospace",
    fontSize: 13,
    lineHeight: 19,
    glyphMargin: true,
    folding: true,
    foldingStrategy: "indentation",
    foldingHighlight: true,
    showFoldingControls: "always",
    lineNumbers: "on",
    lineNumbersMinChars: 6,
    lineDecorationsWidth: 36,
    foldingMaximumRegions: 8000,
    padding: { top: 10, bottom: 10 },
    tabSize: 2,
    insertSpaces: true,
    scrollBeyondLastLine: false,
    renderWhitespace: "selection",
    overviewRulerBorder: false,
    fixedOverflowWidgets: true,
    scrollbar: {
      verticalScrollbarSize: 26,
      horizontalScrollbarSize: 26,
      arrowSize: 16,
      useShadows: false,
    },
    contextmenu: true,
    wordWrap: "off",
    ...options.editorOptions,
  });

  return {
    editor,
    getValue() {
      return editor.getValue();
    },
    setValue(value) {
      const nextValue = String(value ?? "");
      if (editor.getValue() !== nextValue) editor.setValue(nextValue);
    },
    getSelectionOffsets() {
      const model = editor.getModel();
      const selection = editor.getSelection();
      if (!model || !selection) return { start: 0, end: 0 };
      return {
        start: model.getOffsetAt(selection.getStartPosition()),
        end: model.getOffsetAt(selection.getEndPosition()),
      };
    },
    setSelectionRange(start, end = start) {
      const model = editor.getModel();
      if (!model) return;
      const startPosition = toOffset(model, start);
      const endPosition = toOffset(model, end);
      editor.setSelection(new monaco.Range(
        startPosition.lineNumber,
        startPosition.column,
        endPosition.lineNumber,
        endPosition.column,
      ));
      editor.revealPositionInCenter(startPosition);
    },
    getScrollTop() {
      return editor.getScrollTop();
    },
    setScrollTop(value) {
      editor.setScrollTop(Number(value) || 0);
    },
    getScrollLeft() {
      return editor.getScrollLeft();
    },
    setScrollLeft(value) {
      editor.setScrollLeft(Number(value) || 0);
    },
    setDiagnostics(diagnostics = []) {
      const model = editor.getModel();
      if (!model) return;
      const markers = diagnostics.map((diag) => {
        const line = Math.max(1, Number(diag.line) || 1);
        return {
          severity: severityFor(diag.level),
          message: String(diag.message || diag.level || "Diagnostic"),
          startLineNumber: line,
          endLineNumber: line,
          startColumn: 1,
          endColumn: Math.max(2, model.getLineMaxColumn(line)),
        };
      });
      monaco.editor.setModelMarkers(model, `tns-${language}`, markers);
    },
    setReadOnly(value) {
      editor.updateOptions({ readOnly: Boolean(value) });
    },
    focus() {
      editor.focus();
    },
    blur() {
      editor.getDomNode()?.blur?.();
    },
    layout() {
      editor.layout();
    },
    onInput(callback) {
      return editor.onDidChangeModelContent(() => callback(editor.getValue()));
    },
    onCursor(callback) {
      return editor.onDidChangeCursorPosition(callback);
    },
    onScroll(callback) {
      return editor.onDidScrollChange(callback);
    },
    dispose() {
      const model = editor.getModel();
      if (model) monaco.editor.setModelMarkers(model, `tns-${language}`, []);
      editor.dispose();
    },
  };
}

export function createLuaEditor(container, options = {}) {
  return createTextEditor(container, { ...options, language: "lua" });
}

export function createPythonEditor(container, options = {}) {
  return createTextEditor(container, { ...options, language: "python" });
}

export function createTiEditor(container, options = {}) {
  return createTextEditor(container, { ...options, language: "ti-basic" });
}

export function setTheme(theme) {
  defineThemes();
  monaco.editor.setTheme(themeName(theme));
}

globalThis.TnsMonacoEditor = {
  createTextEditor,
  createLuaEditor,
  createPythonEditor,
  createTiEditor,
  setTheme,
  monaco,
};

globalThis.dispatchEvent(new CustomEvent("tns-monaco-ready"));
