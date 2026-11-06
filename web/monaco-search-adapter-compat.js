(() => {
  "use strict";

  const PATCH_FLAG = "__tnsSearchAdapterCompatPatched";

  function makeCompatible(adapter) {
    if (!adapter || adapter.__tnsSearchAdapterCompatible) return adapter;

    Object.defineProperty(adapter, "__tnsSearchAdapterCompatible", {
      value: true,
      configurable: false,
      enumerable: false,
    });

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

    Object.defineProperty(adapter, "selectionStart", {
      configurable: true,
      enumerable: false,
      get() {
        return typeof adapter.getSelectionOffsets === "function"
          ? Number(adapter.getSelectionOffsets()?.start || 0)
          : 0;
      },
    });

    Object.defineProperty(adapter, "selectionEnd", {
      configurable: true,
      enumerable: false,
      get() {
        return typeof adapter.getSelectionOffsets === "function"
          ? Number(adapter.getSelectionOffsets()?.end || 0)
          : 0;
      },
    });

    if (typeof adapter.addEventListener !== "function") {
      adapter.addEventListener = (type, listener) => {
        if (type === "input" && typeof adapter.onInput === "function") {
          const disposable = adapter.onInput(() => listener?.({ type: "input", target: adapter }));
          return disposable;
        }
        return null;
      };
    }

    return adapter;
  }

  function patchApi() {
    const api = window.TnsMonacoEditor;
    if (!api || api[PATCH_FLAG]) return false;
    api[PATCH_FLAG] = true;

    for (const name of ["createTextEditor", "createLuaEditor", "createPythonEditor", "createTiEditor"]) {
      const original = api[name];
      if (typeof original !== "function") continue;
      api[name] = function (...args) {
        return makeCompatible(original.apply(this, args));
      };
    }
    return true;
  }

  if (!patchApi()) {
    window.addEventListener("tns-monaco-ready", patchApi, { once: true });
  }
})();
