(() => {
  "use strict";

  const STYLE_ID = "tns-ti-reference-theme-style";
  const PATCH_FLAG = "__tnsTiReferenceMarkersPatched";
  const decorationIds = new WeakMap();

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .monaco-editor .tns-ti-error-line {
        background: rgba(224, 73, 73, 0.13) !important;
      }

      .monaco-editor .tns-ti-error-line-number {
        color: #c93d3d !important;
        font-weight: 700 !important;
      }

      .monaco-editor .tns-ti-error-glyph {
        position: relative !important;
      }

      .monaco-editor .tns-ti-error-glyph::before {
        content: "";
        position: absolute;
        width: 8px;
        height: 8px;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        border-radius: 999px;
        background: #d44747;
        box-shadow: 0 0 0 2px rgba(212, 71, 71, 0.12);
      }
    `;
    document.head.appendChild(style);
  }

  function installTiTokenizer(monaco) {
    monaco.languages.setMonarchTokensProvider("ti-basic", {
      defaultToken: "identifier.ti",
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
          [/\/\/.*$/, "comment.ti"],
          [/"([^"\\]|\\.)*$/, "string.invalid.ti"],
          [/"/, "string.ti", "@string"],
          [/[A-Za-z_][A-Za-z0-9_]*/, {
            cases: {
              "@keywords": "keyword.ti",
              "@builtins": "builtin.ti",
              "@default": "identifier.ti",
            },
          }],
          [/\d+(?:\.\d+)?(?:e[+-]?\d+)?/i, "number.ti"],
          [/[→:=+\-*/^=<>&·√πΣΔ]/, "operator.ti"],
          [/[()[\],]/, "delimiter.ti"],
        ],
        string: [
          [/[^\\"]+/, "string.ti"],
          [/\\./, "string.ti"],
          [/"/, "string.ti", "@pop"],
        ],
      },
    });
  }

  function defineReferenceLightTheme(monaco) {
    monaco.editor.defineTheme("tns-lua-light", {
      base: "vs",
      inherit: true,
      rules: [
        // Keep the existing Lua/Python light palette for non-TI editors.
        { token: "keyword", foreground: "0000CC" },
        { token: "comment", foreground: "008000", fontStyle: "italic" },
        { token: "string", foreground: "C00000" },
        { token: "string.invalid", foreground: "C00000" },
        { token: "number", foreground: "C00000" },
        { token: "operator", foreground: "C00000" },
        { token: "delimiter", foreground: "111111" },
        { token: "identifier", foreground: "111111" },
        { token: "type", foreground: "0050B3" },

        // TI-Nspire Program Editor reference palette from the supplied captures.
        { token: "keyword.ti", foreground: "211A6B" },
        { token: "string.ti", foreground: "4F7E57" },
        { token: "string.invalid.ti", foreground: "B64646" },
        { token: "comment.ti", foreground: "6E7F6C", fontStyle: "italic" },
        { token: "builtin.ti", foreground: "202020" },
        { token: "identifier.ti", foreground: "171717" },
        { token: "number.ti", foreground: "171717" },
        { token: "operator.ti", foreground: "171717" },
        { token: "delimiter.ti", foreground: "171717" },
      ],
      colors: {
        "editor.background": "#FFFFFF",
        "editor.foreground": "#171717",
        "editorLineNumber.foreground": "#73777F",
        "editorLineNumber.activeForeground": "#303030",
        "editorGutter.background": "#FFFFFF",
        "editorGutter.foldingControlForeground": "#4C5563",
        "editor.selectionBackground": "#D8E8FF",
        "editor.inactiveSelectionBackground": "#EAF2FF",
        "editorCursor.foreground": "#171717",
        "editor.lineHighlightBackground": "#FAFBFD",
        "editorIndentGuide.background1": "#E3E5E8",
        "editorError.foreground": "#D44747",
        "editorError.border": "#00000000",
        "editorWarning.foreground": "#C58A16",
        "editorOverviewRuler.errorForeground": "#D44747AA",
        "scrollbarSlider.background": "#94A3B866",
        "scrollbarSlider.hoverBackground": "#64748B80",
        "scrollbarSlider.activeBackground": "#47556980",
      },
    });
  }

  function decorateErrors(monaco, model, markers) {
    const getEditors = monaco.editor.getEditors;
    if (typeof getEditors !== "function") return;

    const errors = (markers || []).filter((marker) => marker.severity === monaco.MarkerSeverity.Error);
    for (const editor of getEditors()) {
      if (editor.getModel?.() !== model) continue;
      const oldIds = decorationIds.get(editor) || [];
      const next = errors.map((marker) => ({
        range: new monaco.Range(
          Math.max(1, Number(marker.startLineNumber) || 1),
          1,
          Math.max(1, Number(marker.endLineNumber || marker.startLineNumber) || 1),
          1,
        ),
        options: {
          isWholeLine: true,
          className: "tns-ti-error-line",
          lineNumberClassName: "tns-ti-error-line-number",
          glyphMarginClassName: "tns-ti-error-glyph",
          glyphMarginHoverMessage: { value: String(marker.message || "Syntax error") },
        },
      }));
      decorationIds.set(editor, editor.deltaDecorations(oldIds, next));
    }
  }

  function patchMarkers(monaco) {
    if (monaco.editor[PATCH_FLAG]) return;
    const original = monaco.editor.setModelMarkers.bind(monaco.editor);
    monaco.editor.setModelMarkers = (model, owner, markers) => {
      original(model, owner, markers);
      if (String(owner || "").startsWith("tns-ti-basic") || model?.getLanguageId?.() === "ti-basic") {
        decorateErrors(monaco, model, markers);
      }
    };
    monaco.editor[PATCH_FLAG] = true;
  }

  function apply() {
    const api = window.TnsMonacoEditor;
    const monaco = api?.monaco;
    if (!monaco) return false;

    installStyles();
    installTiTokenizer(monaco);
    defineReferenceLightTheme(monaco);
    patchMarkers(monaco);

    if (String(document.documentElement.dataset.theme || "light").toLowerCase() === "light") {
      monaco.editor.setTheme("tns-lua-light");
    }
    return true;
  }

  if (!apply()) {
    window.addEventListener("tns-monaco-ready", apply, { once: true });
  }

  window.addEventListener("tns-theme-change", (event) => {
    if (event.detail?.theme === "light") apply();
  });
})();
