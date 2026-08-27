(() => {
  "use strict";

  const STYLE_ID = "tns-animated-theme-toggle-style";
  const BUTTON_ID = "theme-btn";
  const STORAGE_KEY = "tns-tool-theme";
  let switching = false;

  const MOON_SVG = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="32" height="32" aria-hidden="true">
      <path fill-rule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clip-rule="evenodd"></path>
    </svg>`;

  const SUN_SVG = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="32" height="32" aria-hidden="true">
      <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"></path>
    </svg>`;

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .header-actions .tns-theme-toggle {
        width: 56px !important;
        min-width: 56px !important;
        height: 56px !important;
        min-height: 56px !important;
        padding: 0 !important;
        align-self: center;
        display: grid !important;
        place-items: center;
        position: relative;
        overflow: hidden;
        border: 0 !important;
        border-radius: 50% !important;
        background: #ffffff !important;
        color: #111827 !important;
        line-height: 1 !important;
        cursor: pointer;
        box-shadow: 0 0 50px 20px rgba(0, 0, 0, 0.10) !important;
        transform: none;
        isolation: isolate;
      }

      .header-actions .tns-theme-toggle:hover {
        background: #ffffff !important;
        transform: translateY(-1px) scale(1.035) !important;
        box-shadow: 0 0 52px 20px rgba(0, 0, 0, 0.12) !important;
      }

      .header-actions .tns-theme-toggle:active {
        transform: scale(.96) !important;
      }

      .header-actions .tns-theme-toggle:focus-visible {
        outline: 3px solid rgba(141, 230, 42, .72);
        outline-offset: 4px;
      }

      .tns-theme-icon {
        grid-column: 1 / 1;
        grid-row: 1 / 1;
        display: grid;
        place-items: center;
        width: 32px;
        height: 32px;
        line-height: .1;
        transition: transform 500ms cubic-bezier(.2, .8, .2, 1), opacity 350ms ease;
        will-change: transform;
      }

      .tns-theme-icon svg {
        display: block;
        width: 32px;
        height: 32px;
      }

      .tns-theme-icon--moon {
        transition-delay: 200ms;
        transform: rotate(0deg) scale(1);
        opacity: 1;
      }

      .tns-theme-icon--sun {
        transform: rotate(0deg) scale(0);
        opacity: 0;
      }

      .tns-theme-toggle.is-dark .tns-theme-icon--moon {
        transition-delay: 0ms;
        transform: rotate(360deg) scale(0);
        opacity: 0;
      }

      .tns-theme-toggle.is-dark .tns-theme-icon--sun {
        transition-delay: 200ms;
        transform: rotate(360deg) scale(1);
        opacity: 1;
      }

      .tns-theme-fallback-ripple {
        position: fixed;
        z-index: 2147483646;
        width: 12px;
        height: 12px;
        margin: -6px 0 0 -6px;
        border-radius: 50%;
        pointer-events: none;
        transform: scale(0);
        will-change: transform, opacity;
        transition: transform 540ms cubic-bezier(.22, 1, .36, 1), opacity 170ms ease;
      }

      .tns-theme-fallback-ripple.expand {
        transform: scale(var(--tns-ripple-scale, 160));
      }

      .tns-theme-fallback-ripple.fade {
        opacity: 0;
      }

      ::view-transition-group(root) {
        animation-duration: 0s;
      }

      ::view-transition-old(root),
      ::view-transition-new(root) {
        animation: none;
        mix-blend-mode: normal;
      }

      ::view-transition-old(root) {
        z-index: 1;
      }

      ::view-transition-new(root) {
        z-index: 2;
      }

      @media (prefers-reduced-motion: reduce) {
        .tns-theme-icon {
          transition-duration: .01ms !important;
          transition-delay: 0ms !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function currentTheme() {
    const attr = String(document.documentElement.dataset.theme || "").toLowerCase();
    if (attr === "dark" || attr === "light") return attr;

    const stored = String(localStorage.getItem(STORAGE_KEY) || "").toLowerCase();
    if (stored === "dark" || stored === "light") return stored;

    return "light";
  }

  function syncButton(button, theme) {
    const dark = theme === "dark";
    button.classList.toggle("is-dark", dark);
    button.setAttribute("aria-pressed", dark ? "true" : "false");
    button.setAttribute("aria-label", dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
    button.title = dark ? "Modo claro" : "Modo oscuro";
  }

  function applyTheme(theme, button) {
    const next = theme === "dark" ? "dark" : "light";
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    window.TnsMonacoEditor?.setTheme?.(next);
    syncButton(button, next);
    window.dispatchEvent(new CustomEvent("tns-theme-change", { detail: { theme: next } }));
  }

  function radiusFromPoint(x, y) {
    const farX = Math.max(x, window.innerWidth - x);
    const farY = Math.max(y, window.innerHeight - y);
    return Math.hypot(farX, farY);
  }

  async function fallbackTransition(nextTheme, button, x, y, radius) {
    const ripple = document.createElement("div");
    ripple.className = "tns-theme-fallback-ripple";
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.background = nextTheme === "dark" ? "#0b1220" : "#f6f8fb";
    ripple.style.setProperty("--tns-ripple-scale", String(Math.max(1, radius / 6 + 3)));
    document.body.appendChild(ripple);

    requestAnimationFrame(() => requestAnimationFrame(() => ripple.classList.add("expand")));

    await new Promise((resolve) => setTimeout(resolve, 300));
    applyTheme(nextTheme, button);
    await new Promise((resolve) => setTimeout(resolve, 235));
    ripple.classList.add("fade");
    setTimeout(() => ripple.remove(), 190);
  }

  async function switchTheme(button) {
    if (switching) return;
    switching = true;

    const nextTheme = currentTheme() === "dark" ? "light" : "dark";
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = radiusFromPoint(x, y);
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    try {
      if (!reduceMotion && typeof document.startViewTransition === "function") {
        const transition = document.startViewTransition(() => {
          applyTheme(nextTheme, button);
        });

        await transition.ready;

        const animation = document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${radius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 720,
            easing: "cubic-bezier(.22, 1, .36, 1)",
            pseudoElement: "::view-transition-new(root)",
          }
        );

        await Promise.allSettled([transition.finished, animation.finished]);
      } else if (!reduceMotion) {
        await fallbackTransition(nextTheme, button, x, y, radius);
      } else {
        applyTheme(nextTheme, button);
      }
    } finally {
      switching = false;
    }
  }

  function install() {
    if (document.documentElement.dataset.tnsAnimatedThemeToggle === "1") return;

    const original = document.getElementById(BUTTON_ID);
    if (!original) return;

    installStyles();

    // app.js already attached its old instant theme click handler. Replacing
    // the node removes only that listener while preserving the same #theme-btn
    // contract for the rest of the application.
    const button = original.cloneNode(false);
    button.id = BUTTON_ID;
    button.type = "button";
    button.className = `${original.className || "theme-button"} tns-theme-toggle`.trim();
    button.innerHTML = `
      <span class="tns-theme-icon tns-theme-icon--moon">${MOON_SVG}</span>
      <span class="tns-theme-icon tns-theme-icon--sun">${SUN_SVG}</span>
    `;
    original.replaceWith(button);

    const theme = currentTheme();
    syncButton(button, theme);

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      switchTheme(button);
    });

    document.documentElement.dataset.tnsAnimatedThemeToggle = "1";
  }

  const scheduleInstall = () => setTimeout(install, 0);

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", scheduleInstall, { once: true });
  } else {
    scheduleInstall();
  }
})();
