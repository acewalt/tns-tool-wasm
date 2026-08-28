(() => {
  "use strict";

  function enhanceWizard() {
    const form = document.querySelector(".ndless-project-dialog-overlay-v2 form.ndless-project-dialog");
    if (!form || form.dataset.browserTemplateEnhanced === "1") return;
    form.dataset.browserTemplateEnhanced = "1";
    const language = form.querySelector("select[name='language']");
    const template = form.querySelector("select[name='template']");
    const target = form.querySelector("select[name='target']");
    const note = form.querySelector("[data-project-mode-note]");
    if (!template || !target || !language) return;

    const sync = () => {
      const arm = language.value === "asm";
      let browser = Array.from(template.options).find(option => option.value === "browser-minimal");
      if (!arm && !browser) {
        browser = document.createElement("option");
        browser.value = "browser-minimal";
        browser.textContent = "Browser minimal (freestanding)";
        template.insertBefore(browser, template.firstChild);
      }
      if (arm) return;
      const browserOption = Array.from(template.options).find(option => option.value === "browser-minimal");
      if (browserOption) browserOption.disabled = target.value !== "zehn-modern";
      if (template.value === "browser-minimal" && target.value !== "zehn-modern") template.value = "basic";
      if (note && template.value === "browser-minimal") {
        note.textContent = "Browser minimal avoids <os.h>/newlib so Build TNS can compile it with the lazy freestanding ARM provider. Modern Zehn only.";
      }
    };

    form.addEventListener("change", () => setTimeout(sync, 0));
    setTimeout(sync, 0);
  }

  document.addEventListener("click", event => {
    if (event.target.closest?.("#xml-new-ndless-project")) setTimeout(enhanceWizard, 0);
  }, true);
})();
