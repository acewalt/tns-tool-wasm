// Cloudflare Worker URL, without a trailing slash.
window.TNS_TOOL_STATS_API_BASE_URL = "https://tns-tool-stats.guard-mauricio-save.workers.dev";

(() => {
  const TOTAL_VISITORS_LABELS = {
    es: "visitantes totales",
    en: "total visitors",
    fr: "visiteurs au total",
  };

  const statsRoot = document.querySelector("#site-stats");
  if (!statsRoot || document.querySelector("#stats-total-visitors")) return;

  const totalCard = document.createElement("div");
  totalCard.className = "site-stat";
  totalCard.innerHTML = `
    <strong id="stats-total-visitors">-</strong>
    <span id="stats-total-visitors-label">visitantes totales</span>
  `;
  statsRoot.appendChild(totalCard);

  const style = document.createElement("style");
  style.textContent = `
    @media (max-width: 860px) {
      .site-stats {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (max-width: 480px) {
      .site-stat {
        padding-left: 6px;
        padding-right: 6px;
      }

      .site-stat span {
        font-size: 9px;
        letter-spacing: 0.02em;
      }
    }
  `;
  document.head.appendChild(style);

  const totalValue = totalCard.querySelector("#stats-total-visitors");
  const totalLabel = totalCard.querySelector("#stats-total-visitors-label");

  function currentLanguage() {
    const activeLanguage = document.querySelector("#language-buttons button.active[data-lang]")?.dataset.lang;
    const documentLanguage = String(document.documentElement.lang || "").slice(0, 2).toLowerCase();
    return activeLanguage || documentLanguage || "es";
  }

  function updateTotalLabel(language = currentLanguage()) {
    totalLabel.textContent = TOTAL_VISITORS_LABELS[language] || TOTAL_VISITORS_LABELS.es;
  }

  function updateTotalVisitors(data) {
    if (!data || data.totalVisitors === undefined || data.totalVisitors === null) return;
    const value = Number(data.totalVisitors);
    if (!Number.isFinite(value) || value < 0) return;
    totalValue.textContent = String(Math.trunc(value));
  }

  updateTotalLabel();

  const languageButtons = document.querySelector("#language-buttons");
  languageButtons?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-lang]");
    if (!button) return;
    updateTotalLabel(button.dataset.lang);
  });

  const languageObserver = new MutationObserver(() => updateTotalLabel());
  languageObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"],
  });
  if (languageButtons) {
    languageObserver.observe(languageButtons, {
      attributes: true,
      subtree: true,
      attributeFilter: ["class"],
    });
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await nativeFetch(...args);

    try {
      const requestTarget = typeof args[0] === "string" ? args[0] : args[0]?.url;
      if (requestTarget) {
        const pathname = new URL(requestTarget, window.location.href).pathname;
        if (pathname === "/api/stats" || pathname === "/api/visit" || pathname === "/api/generated") {
          response.clone().json().then(updateTotalVisitors).catch(() => {});
        }
      }
    } catch {
      // Stats are optional; never interfere with the main app fetch flow.
    }

    return response;
  };
})();

// Load the terminal-style skin for the main, XML, PY and dynamically created
// Lua logs without touching their existing IDs or update logic.
(() => {
  if (!document.querySelector('link[data-terminal-log-theme="true"]')) {
    const themeLink = document.createElement("link");
    themeLink.rel = "stylesheet";
    themeLink.href = "./terminal-log-theme.css?v=20260827-terminal-v2";
    themeLink.dataset.terminalLogTheme = "true";
    document.head.appendChild(themeLink);
  }

  if (!document.querySelector('script[data-terminal-log-theme="true"]')) {
    const themeScript = document.createElement("script");
    themeScript.src = "./terminal-log-theme.js?v=20260827-terminal-v2";
    themeScript.dataset.terminalLogTheme = "true";
    document.head.appendChild(themeScript);
  }
})();

// Show a blurred, animated three-step progress overlay while images/PDF pages
// are being converted into TI-Nspire image cards.
(() => {
  if (document.querySelector('script[data-import-progress-stepper="true"]')) return;

  const progressScript = document.createElement("script");
  progressScript.src = "./import-progress-stepper.js?v=20260827-import-stepper-v5";
  progressScript.dataset.importProgressStepper = "true";
  document.head.appendChild(progressScript);
})();

// The progress stepper uses the XML log as an event stream. When that log is
// truly empty on the very first import, its first mutation used to become the
// observer baseline and the initial "Carga..." / "PDF: abriendo..." event was
// swallowed. Prime the empty log with one invisible blank line as soon as the
// user starts any media import, before the file picker returns a selection.
(() => {
  const MEDIA_BUTTON_IDS = new Set([
    "file-page-add-image",
    "file-page-add-pdf",
    "file-page-add-pdf-syntax-v2",
    "add-image-widget",
    "add-pdf-widget",
  ]);

  window.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest("button") : null;
    if (!button?.id || !MEDIA_BUTTON_IDS.has(button.id)) return;

    const xmlLog = document.querySelector("#xml-log");
    if (!xmlLog || xmlLog.textContent !== "") return;

    xmlLog.textContent = "\n";
  }, true);
})();

// Legacy compatibility route. The unified media controller owns the actual PDF
// import behavior, but this wrapper remains harmless for older cached markup.
(() => {
  if (document.querySelector('script[data-syntax-pdf-import="true"]')) return;

  const script = document.createElement("script");
  script.src = "./syntax-pdf-import.js?v=20260827-syntax-pdf-v2";
  script.dataset.syntaxPdfImport = "true";
  document.head.appendChild(script);
})();

// Legacy compatibility route for older cached inspector markup.
(() => {
  if (document.querySelector('script[data-inspector-image-batch-sync="true"]')) return;

  const script = document.createElement("script");
  script.src = "./inspector-image-batch-sync.js?v=20260827-inspector-image-batch-v1";
  script.dataset.inspectorImageBatchSync = "true";
  document.head.appendChild(script);
})();

// Replace the old instant theme button with a circular moon/sun toggle and a
// page-wide circular reveal using the View Transitions API (with a fallback).
(() => {
  if (document.querySelector('script[data-animated-theme-toggle="true"]')) return;

  const script = document.createElement("script");
  script.src = "./theme-transition-toggle.js?v=20260827-theme-reveal-v2";
  script.dataset.animatedThemeToggle = "true";
  document.head.appendChild(script);
})();

// Add support and feedback information inside the About modal, between
// Purpose and Development and Interface. Keep it synchronized with the site's
// Spanish / English / French language selection.
(() => {
  const PAYPAL_URL = "https://paypal.me/waltDx";
  const DISCUSSION_URL = "https://github.com/acewalt/tns-tool-wasm/discussions/2";

  const SUPPORT_TEXT = {
    es: "Si mi herramienta te resultó útil y quieres apoyar su desarrollo, puedes invitarme un café. ¡Muchas gracias por tu apoyo!",
    en: "If my tool was useful to you and you'd like to support its development, you can buy me a coffee. Thank you very much for your support!",
    fr: "Si mon outil vous a été utile et que vous souhaitez soutenir son développement, vous pouvez m'offrir un café. Merci beaucoup pour votre soutien !",
  };

  const FEEDBACK_TEXT = {
    es: {
      title: "Feedback",
      body: "Los reportes de errores, preguntas, sugerencias y archivos de prueba son bienvenidos.",
    },
    en: {
      title: "Feedback",
      body: "Bug reports, questions, suggestions, and test files are welcome.",
    },
    fr: {
      title: "Feedback",
      body: "Les rapports de bugs, questions, suggestions et fichiers de test sont les bienvenus.",
    },
  };

  function currentLanguage() {
    const activeLanguage = document.querySelector("#language-buttons button.active[data-lang]")?.dataset.lang;
    const documentLanguage = String(document.documentElement.lang || "").slice(0, 2).toLowerCase();
    return activeLanguage || documentLanguage || "es";
  }

  function injectAboutExtras() {
    const modal = document.querySelector(".about-modal");
    if (!modal || modal.querySelector('[data-about-extras="true"]')) return;

    const headings = modal.querySelectorAll(":scope > h3");
    const developmentHeading = headings[1];
    if (!developmentHeading) return;

    const lang = currentLanguage();
    const feedback = FEEDBACK_TEXT[lang] || FEEDBACK_TEXT.es;
    const fragment = document.createDocumentFragment();

    const supportParagraph = document.createElement("p");
    supportParagraph.dataset.aboutExtras = "true";
    supportParagraph.dataset.aboutSupport = "true";
    supportParagraph.className = "about-support-note";
    supportParagraph.append(document.createTextNode(`${SUPPORT_TEXT[lang] || SUPPORT_TEXT.es} `));

    const paypalLink = document.createElement("a");
    paypalLink.href = PAYPAL_URL;
    paypalLink.target = "_blank";
    paypalLink.rel = "noopener noreferrer";
    paypalLink.textContent = PAYPAL_URL;
    supportParagraph.append(paypalLink);
    fragment.append(supportParagraph);

    const feedbackHeading = document.createElement("h3");
    feedbackHeading.textContent = feedback.title;
    fragment.append(feedbackHeading);

    const feedbackParagraph = document.createElement("p");
    feedbackParagraph.append(document.createTextNode(`${feedback.body} `));

    const discussionLink = document.createElement("a");
    discussionLink.href = DISCUSSION_URL;
    discussionLink.target = "_blank";
    discussionLink.rel = "noopener noreferrer";
    discussionLink.textContent = DISCUSSION_URL;
    feedbackParagraph.append(discussionLink);
    fragment.append(feedbackParagraph);

    developmentHeading.before(fragment);
  }

  const observer = new MutationObserver(injectAboutExtras);
  observer.observe(document.body, { childList: true, subtree: true });
  injectAboutExtras();
})();

// Improve text-link contrast inside the About modal in dark mode. This also
// overrides the browser's low-contrast default visited-link purple without
// changing the GitHub / LinkedIn pill buttons.
(() => {
  if (document.querySelector('style[data-about-dark-link-contrast="true"]')) return;

  const style = document.createElement("style");
  style.dataset.aboutDarkLinkContrast = "true";
  style.textContent = `
    [data-theme="dark"] .about-modal p a,
    [data-theme="dark"] .about-modal p a:visited,
    [data-theme="dark"] .about-modal li a,
    [data-theme="dark"] .about-modal li a:visited {
      color: #7dd3fc;
      text-decoration-color: rgba(125, 211, 252, 0.7);
      text-underline-offset: 2px;
    }

    [data-theme="dark"] .about-modal p a:hover,
    [data-theme="dark"] .about-modal p a:focus-visible,
    [data-theme="dark"] .about-modal li a:hover,
    [data-theme="dark"] .about-modal li a:focus-visible {
      color: #bae6fd;
      text-decoration: underline;
      text-decoration-thickness: 2px;
      text-decoration-color: currentColor;
    }
  `;
  document.head.appendChild(style);
})();

// Keep the normal TI-Nspire LuaJS preview independent from the extra LÖVE
// project/LuaJIT compatibility layer. Load paste support only after isolation
// is installed so Ctrl+V remains an input feature, not a runtime patch.
(() => {
  if (document.querySelector('script[data-nspire-preview-isolation="true"]')) return;

  const isolationScript = document.createElement("script");
  isolationScript.src = "./lua-nspire-preview-isolation.js?v=20260903-nspire-isolation-v4";
  isolationScript.dataset.nspirePreviewIsolation = "true";
  isolationScript.async = false;
  isolationScript.addEventListener("load", () => {
    if (document.querySelector('script[data-love-preview-paste="true"]')) return;
    const pasteScript = document.createElement("script");
    pasteScript.src = "./love-preview-paste.js?v=20260903-paste-v2";
    pasteScript.dataset.lovePreviewPaste = "true";
    pasteScript.async = false;
    document.head.appendChild(pasteScript);
  }, { once: true });
  document.head.appendChild(isolationScript);
})();
