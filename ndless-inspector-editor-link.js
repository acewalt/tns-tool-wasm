(() => {
  "use strict";

  function inspectorFileName(overlay) {
    const firstValue = overlay?.querySelector(".ndless-summary-grid .ndless-field strong");
    return String(firstValue?.textContent || "").trim();
  }

  function inputFiles() {
    const files = [];
    for (const input of document.querySelectorAll('input[type="file"]')) {
      for (const file of Array.from(input.files || [])) {
        if (file && /\.tns$/i.test(file.name || "")) files.push(file);
      }
    }
    return files;
  }

  function sameVisibleFile(file, visibleName) {
    if (!file) return false;
    if (!visibleName) return true;
    return String(file.name || "") === visibleName;
  }

  function resolveInspectorFile(overlay) {
    const visibleName = inspectorFileName(overlay);
    const candidates = inputFiles();
    const exact = candidates.find(file => sameVisibleFile(file, visibleName));
    if (exact) return exact;

    const remembered = window.TnsNdlessEditor?.getLastFile?.() || null;
    if (sameVisibleFile(remembered, visibleName)) return remembered;

    // If there is only one active TNS input, it is safer than stale remembered state.
    if (candidates.length === 1) return candidates[0];
    return remembered;
  }

  async function openInspectedFile(overlay) {
    const file = resolveInspectorFile(overlay);
    if (!file) {
      alert("The inspected .tns file is no longer available. Please open the file again.");
      return;
    }

    const parsed = await window.NdlessFormatDetector?.inspectFile?.(file);
    if (!parsed?.valid || parsed.family !== "ndless") {
      alert(`The selected file (${file.name}) no longer matches the valid Ndless file shown in the Inspector. Please open it again.`);
      return;
    }

    await window.TnsNdlessEditor?.open?.(file);
  }

  // The legacy editor injects the Edit Ndless button after the Inspector opens.
  // Capture its click before the legacy bubble listener so it cannot use a stale
  // lastTnsFile value when the Inspector is showing a newer exported file.
  document.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest("#ndless-inspector-overlay .ndless-edit-btn") : null;
    if (!button) return;
    const overlay = button.closest("#ndless-inspector-overlay");
    if (!overlay) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openInspectedFile(overlay).catch(error => {
      console.error("Ndless Inspector → Editor link failed:", error);
      alert(error?.message || String(error));
    });
  }, true);

  window.NdlessInspectorEditorLink = Object.freeze({ resolveInspectorFile });
})();