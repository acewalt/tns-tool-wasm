(() => {
  "use strict";

  if (window.__tnsLovePreviewPasteInstalled) return;
  window.__tnsLovePreviewPasteInstalled = true;

  const NIL_SAFE_MARK = "__tnsPreviewNilSafeV1";
  const HARDEN_MARK = "__tnsPreviewNilHardenV1";

  function copyFunctionMarkers(target, source) {
    for (const key of Object.keys(source || {})) {
      try {
        target[key] = source[key];
      } catch (_error) {}
    }
  }

  function installNilSafeLuaReads() {
    const root = window;

    for (const name of ["lua_rawget", "lua_tableget"]) {
      const current = root[name];
      if (typeof current !== "function" || current[NIL_SAFE_MARK]) continue;

      const safeRead = function (table, key) {
        // Lua has one missing-value representation: nil. JavaScript undefined
        // must never leak into generated Lua arithmetic or nil comparisons.
        if (table == null || table === false || key === undefined || key === null) return null;
        const value = current.apply(this, arguments);
        return value === undefined ? null : value;
      };

      copyFunctionMarkers(safeRead, current);
      safeRead[NIL_SAFE_MARK] = true;
      safeRead.__tnsPreviewNilSafeBase = current;
      root[name] = safeRead;
    }
  }

  function installPreviewRuntimeIsolation() {
    const currentHarden = window.hardenLuaJsPreviewRuntime;
    if (typeof currentHarden !== "function") return false;

    if (!currentHarden[HARDEN_MARK]) {
      const isolatedHarden = function (...args) {
        const result = currentHarden.apply(this, args);

        // app.js and love-project-compat.js are allowed to rebuild/wrap LuaJS.
        // Normalize table reads only after those Preview-specific patches finish.
        // Ndless ARM does not use this hook, so its runtime remains untouched.
        installNilSafeLuaReads();
        return result;
      };

      copyFunctionMarkers(isolatedHarden, currentHarden);
      isolatedHarden[HARDEN_MARK] = true;
      isolatedHarden.__tnsPreviewHardenBase = currentHarden;
      window.hardenLuaJsPreviewRuntime = isolatedHarden;
    }

    // Also repair an already initialized preview if this helper loaded late.
    installNilSafeLuaReads();
    return true;
  }

  if (!installPreviewRuntimeIsolation()) {
    let attempts = 0;
    const retry = window.setInterval(() => {
      attempts += 1;
      if (installPreviewRuntimeIsolation() || attempts >= 240) {
        window.clearInterval(retry);
      }
    }, 25);

    window.addEventListener(
      "DOMContentLoaded",
      () => installPreviewRuntimeIsolation(),
      { once: true }
    );
  }

  function isEditableTarget(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(
      target.closest(
        'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]'
      )
    );
  }

  function dispatchPreviewKey(canvas, key) {
    const options = {
      key,
      bubbles: true,
      cancelable: true,
      composed: true,
    };

    canvas.dispatchEvent(new KeyboardEvent("keydown", options));
    canvas.dispatchEvent(new KeyboardEvent("keyup", options));
  }

  document.addEventListener(
    "paste",
    (event) => {
      const canvas = document.querySelector("#love-preview-canvas");
      if (!canvas?.isConnected) return;

      // Preserve native paste in the calculator composer and any normal form field.
      if (isEditableTarget(event.target) || isEditableTarget(document.activeElement)) return;

      const text = event.clipboardData?.getData("text/plain") ?? "";
      if (!text) return;

      event.preventDefault();

      // Normalize Windows/macOS line endings so a pasted multi-line test behaves
      // like typing each line and pressing Enter in the Preview LÖVE window.
      const normalized = text.replace(/\r\n?/g, "\n");

      for (const char of normalized) {
        if (char === "\n") {
          dispatchPreviewKey(canvas, "Enter");
        } else if (char === "\t") {
          dispatchPreviewKey(canvas, "Tab");
        } else {
          dispatchPreviewKey(canvas, char);
        }
      }

      canvas.focus({ preventScroll: true });
    },
    true
  );
})();
