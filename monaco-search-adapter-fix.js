(() => {
  "use strict";

  const PATCH_FLAG = "__tnsSearchAdapterFixed";

  function augmentAdapter(adapter) {
    if (!adapter || adapter.__tnsSearchAdapterReady) return adapter;
    adapter.__tnsSearchAdapterReady = true;

    if (!("value" in adapter)) {
      Object.defineProperty(adapter, "value", {
        configurable: true,
        enumerable: false,
        get() {
          return typeof adapter.getValue === "function" ? adapter.getValue() : "";
        },
        set(value) {
          if (typeof adapter.setValue === "function") adapter.setValue(String(value ?? ""));
        },
      });
    }

    if (!("selectionStart" in adapter)) {
      Object.defineProperty(adapter, "selectionStart", {
        configurable: true,
        enumerable: false,
        get() {
          return Number(adapter.getSelectionOffsets?.().start || 0);
        },
      });
    }

    if (!("selectionEnd" in adapter)) {
      Object.defineProperty(adapter, "selectionEnd", {
        configurable: true,
        enumerable: false,
        get() {
          return Number(adapter.getSelectionOffsets?.().end || 0);
        },
      });
    }

    if (typeof adapter.addEventListener !== "function") {
      adapter.addEventListener = (type, callback) => {
        if (type === "input" && typeof adapter.onInput === "function") {
          return adapter.onInput(() => callback({ type: "input", target: adapter }));
        }
        return { dispose() {} };
      };
    }

    return adapter;
  }

  function patchApi() {
    const api = window.TnsMonacoEditor;
    if (!api || api[PATCH_FLAG]) return false;
    api[PATCH_FLAG] = true;

    for (const name of ["createLuaEditor", "createTextEditor", "createPythonEditor", "createTiEditor"]) {
      const original = api[name];
      if (typeof original !== "function") continue;
      api[name] = function (...args) {
        return augmentAdapter(original.apply(this, args));
      };
    }
    return true;
  }

  if (!patchApi()) {
    window.addEventListener("tns-monaco-ready", patchApi, { once: true });
  }
})();
