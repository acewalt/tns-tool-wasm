(() => {
  "use strict";

  if (window.__tnsLovePreviewPasteInstalled) return;
  window.__tnsLovePreviewPasteInstalled = true;

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
