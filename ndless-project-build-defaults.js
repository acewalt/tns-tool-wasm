(() => {
  "use strict";

  const SELECTOR = ".ndless-project-dialog-overlay-v2 form.ndless-project-dialog";
  let currentForm = null;
  let cleanup = null;

  function enhance(form) {
    if (!form || form === currentForm || form.dataset.ndlessBuildDefaults === "1") return;
    cleanup?.();
    currentForm = form;
    form.dataset.ndlessBuildDefaults = "1";

    const template = form.querySelector("select[name='template']");
    const target = form.querySelector("select[name='target']");
    const language = form.querySelector("select[name='language']");
    const note = form.querySelector("[data-project-mode-note]");
    if (!template || !target) return;

    let browser = Array.from(template.options).find(option => option.value === "browser-minimal");
    if (!browser) {
      browser = document.createElement("option");
      browser.value = "browser-minimal";
      browser.textContent = "Browser minimal (freestanding)";
      template.insertBefore(browser, template.firstChild);
    }

    let userPickedTemplate = false;
    const originalNote = note?.textContent || "";

    const sync = ({ targetChanged = false } = {}) => {
      const modern = target.value === "zehn-modern";
      const assembly = language?.value === "asm";
      browser.disabled = !modern || assembly;

      if (assembly && template.value === "browser-minimal") template.value = "basic";
      if (!modern && template.value === "browser-minimal") template.value = "basic";

      // The default project must be buildable. Switching to Modern Zehn selects
      // the browser starter unless the user subsequently picks another template.
      if (modern && !assembly && (targetChanged || !userPickedTemplate)) {
        template.value = "browser-minimal";
      }

      if (note) {
        if (modern && !assembly && template.value === "browser-minimal") {
          note.textContent = "Browser-ready starter: Build TNS can compile this minimal project without the external Ndless SDK.";
        } else if (modern) {
          note.textContent = "This SDK template uses Ndless headers/libraries. Browser Build TNS needs the full Ndless sysroot for it; Browser minimal works immediately.";
        } else {
          note.textContent = originalNote;
        }
      }
    };

    const onTemplate = () => { userPickedTemplate = true; sync(); };
    const onTarget = () => { userPickedTemplate = false; sync({ targetChanged: true }); };
    const onLanguage = () => sync();
    template.addEventListener("change", onTemplate);
    target.addEventListener("change", onTarget);
    language?.addEventListener("change", onLanguage);
    cleanup = () => {
      template.removeEventListener("change", onTemplate);
      target.removeEventListener("change", onTarget);
      language?.removeEventListener("change", onLanguage);
    };

    sync({ targetChanged: target.value === "zehn-modern" });
  }

  function findAndEnhance() {
    const form = document.querySelector(SELECTOR);
    if (form) enhance(form);
  }

  document.addEventListener("click", event => {
    if (event.target.closest?.("#xml-new-ndless-project")) setTimeout(findAndEnhance, 0);
  }, true);

  document.addEventListener("change", event => {
    if (event.target.closest?.(SELECTOR)) setTimeout(findAndEnhance, 0);
  }, true);
})();
