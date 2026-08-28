(() => {
  "use strict";

  const STYLE_ID = "tns-ti-reference-theme-style";
  const PATCH_FLAG = "__tnsTiReferenceMarkersPatched";
  const MARKER_LISTENER_FLAG = "__tnsTiReferenceMarkerListener";
  const EDITOR_LISTENER_FLAG = "__tnsTiReferenceEditorListener";
  const decorationIds = new WeakMap();

  const TI_BLUE = "#0000FF";
  const TI_RED = "#FF0000";
  const TI_GREEN = "#20801C";

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      /* TI-Nspire reference style: a soft red row plus a solid red gutter dot. */
      .monaco-editor .tns-ti-error-line {
        background: rgba(255, 0, 0, 0.105) !important;
      }

      .monaco-editor .tns-ti-error-line-number {
        color: ${TI_RED} !important;
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
        background: ${TI_RED};
        box-shadow: 0 0 0 1px rgba(255, 0, 0, 0.10);
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
        // Preserve the existing non-TI light palette for Lua/Python.
        { token: "keyword", foreground: "0000CC" },
        { token: "comment", foreground: "008000", fontStyle: "italic" },
        { token: "string", foreground: "C00000" },
        { token: "string.invalid", foreground: "FF0000" },
        { token: "number", foreground: "C00000" },
        { token: "operator", foreground: "C00000" },
        { token: "delimiter", foreground: "111111" },
        { token: "identifier", foreground: "111111" },
        { token: "type", foreground: "0050B3" },

        // Exact TI Program Editor palette requested from the supplied references.
        // Commands / control words: pure blue and bold.
        { token: "keyword.ti", foreground: "0000FF", fontStyle: "bold" },
        // Quoted display/request text: TI green.
        { token: "string.ti", foreground: "20801C" },
        // Broken / unterminated strings are genuinely invalid, so show pure red.
        { token: "string.invalid.ti", foreground: "FF0000" },
        // Comments stay in the same TI green family.
        { token: "comment.ti", foreground: "20801C", fontStyle: "italic" },
        // Functions, variables, values, operators, commas and brackets are black.
        { token: "builtin.ti", foreground: "111111" },
        { token: "identifier.ti", foreground: "111111" },
        { token: "number.ti", foreground: "111111" },
        { token: "operator.ti", foreground: "111111" },
        { token: "delimiter.ti", foreground: "111111" },
      ],
      colors: {
        "editor.background": "#FFFFFF",
        "editor.foreground": "#111111",
        "editorLineNumber.foreground": "#73777F",
        "editorLineNumber.activeForeground": "#303030",
        "editorGutter.background": "#FFFFFF",
        "editorGutter.foldingControlForeground": "#4C5563",
        "editor.selectionBackground": "#D8E8FF",
        "editor.inactiveSelectionBackground": "#EAF2FF",
        "editorCursor.foreground": "#111111",
        "editor.lineHighlightBackground": "#FAFBFD",
        "editorIndentGuide.background1": "#E3E5E8",
        "editorError.foreground": "#FF0000",
        "editorError.border": "#00000000",
        "editorWarning.foreground": "#C58A16",
        "editorOverviewRuler.errorForeground": "#FF0000CC",
        "editorOverviewRuler.warningForeground": "#C58A16AA",
        "scrollbarSlider.background": "#94A3B866",
        "scrollbarSlider.hoverBackground": "#64748B80",
        "scrollbarSlider.activeBackground": "#47556980",
      },
    });
  }

  function isTiModel(model) {
    return model?.getLanguageId?.() === "ti-basic";
  }

  function getEditors(monaco) {
    return typeof monaco.editor.getEditors === "function" ? monaco.editor.getEditors() : [];
  }

  function tuneEditor(editor) {
    if (!isTiModel(editor?.getModel?.())) return;
    // The reference uses plain black punctuation. Monaco's bracket-pair
    // colorization otherwise paints parentheses blue/yellow independently of tokens.
    editor.updateOptions?.({
      bracketPairColorization: { enabled: false },
      guides: { bracketPairs: false, bracketPairsHorizontal: false },
    });
  }

  function decorateErrors(monaco, model, markers) {
    if (!isTiModel(model)) return;
    const errors = (markers || []).filter((marker) => marker.severity === monaco.MarkerSeverity.Error);

    for (const editor of getEditors(monaco)) {
      if (editor.getModel?.() !== model) continue;
      tuneEditor(editor);
      const oldIds = decorationIds.get(editor) || [];
      const next = errors.map((marker) => {
        const line = Math.max(1, Number(marker.startLineNumber) || 1);
        return {
          range: new monaco.Range(line, 1, line, 1),
          options: {
            isWholeLine: true,
            className: "tns-ti-error-line",
            lineNumberClassName: "tns-ti-error-line-number",
            glyphMarginClassName: "tns-ti-error-glyph",
            glyphMarginHoverMessage: { value: String(marker.message || "Syntax error") },
          },
        };
      });
      decorationIds.set(editor, editor.deltaDecorations(oldIds, next));
    }
  }

  function refreshModelErrors(monaco, model) {
    if (!isTiModel(model)) return;
    const markers = monaco.editor.getModelMarkers({ resource: model.uri });
    decorateErrors(monaco, model, markers);
  }

  function refreshAllTiEditors(monaco) {
    for (const editor of getEditors(monaco)) {
      tuneEditor(editor);
      const model = editor.getModel?.();
      if (isTiModel(model)) refreshModelErrors(monaco, model);
    }
  }

  function patchMarkers(monaco) {
    if (!monaco.editor[PATCH_FLAG]) {
      const original = monaco.editor.setModelMarkers.bind(monaco.editor);
      monaco.editor.setModelMarkers = (model, owner, markers) => {
        original(model, owner, markers);
        if (isTiModel(model)) decorateErrors(monaco, model, markers);
      };
      monaco.editor[PATCH_FLAG] = true;
    }

    // Also listen to Monaco's marker-change event. This catches diagnostics that
    // existed before this patch loaded and any code path that bypasses our wrapper.
    if (!monaco.editor[MARKER_LISTENER_FLAG] && typeof monaco.editor.onDidChangeMarkers === "function") {
      monaco.editor.onDidChangeMarkers((resources) => {
        for (const resource of resources || []) {
          const model = monaco.editor.getModel(resource);
          if (isTiModel(model)) refreshModelErrors(monaco, model);
        }
      });
      monaco.editor[MARKER_LISTENER_FLAG] = true;
    }

    if (!monaco.editor[EDITOR_LISTENER_FLAG] && typeof monaco.editor.onDidCreateEditor === "function") {
      monaco.editor.onDidCreateEditor((editor) => {
        window.setTimeout(() => {
          tuneEditor(editor);
          const model = editor.getModel?.();
          if (isTiModel(model)) refreshModelErrors(monaco, model);
        }, 0);
      });
      monaco.editor[EDITOR_LISTENER_FLAG] = true;
    }
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

    // Apply punctuation/error styling to editors already open when this script loads.
    window.setTimeout(() => refreshAllTiEditors(monaco), 0);
    return true;
  }

  if (!apply()) {
    window.addEventListener("tns-monaco-ready", apply, { once: true });
  }

  window.addEventListener("tns-theme-change", (event) => {
    if (event.detail?.theme === "light") apply();
  });
})();
