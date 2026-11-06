(() => {
  "use strict";

  const VERSION = "20260903-lua-guide-cas-v1";
  const INSTALLED = "data-lua-guide-cas-installed";

  const COPY_SNIPPETS = {
    basic: `platform.apiLevel = "2.0"

local result = "Pulsa ENTER"

function on.enterKey()
    local value, err = math.evalStr("factor(x^2-1)")
    result = value or ("ERROR: " .. tostring(err))
    platform.window:invalidate()
end

function on.paint(gc)
    gc:setFont("sansserif", "r", 10)
    gc:drawString(result, 8, 20, "top")
end`,
    ode: `platform.apiLevel = "2.0"

local result = "Pulsa ENTER"

function on.enterKey()
    local value, err = math.evalStr("deSolve(y'=x*y,x,y)")
    result = value or ("ERROR: " .. tostring(err))
    platform.window:invalidate()
end

function on.paint(gc)
    gc:setFont("sansserif", "r", 9)
    gc:drawString(result, 8, 20, "top")
end`
  };

  const TEXT = {
    es: {
      tab: "CAS",
      title: "CAS en Lua ScriptApp",
      intro: "Usa la misma API Lua que usaría una TI-Nspire CAS real. El Preview intenta reproducir el resultado para que puedas desarrollar y probar desde el PC.",
      apiTitle: "API principal",
      evalTitle: "math.eval(expresión)",
      evalBody: "Pide al motor matemático evaluar una expresión y devolver un valor Lua compatible cuando es posible (número, booleano, texto, etc.).",
      evalStrTitle: "math.evalStr(expresión)",
      evalStrBody: "Devuelve el resultado matemático como texto. Es la opción más útil para resultados simbólicos como factor, integral, solve o deSolve.",
      calcTitle: "En la calculadora",
      calcFlow: "Lua → math.eval / math.evalStr → Math Server / CAS de TI → resultado",
      calcBody: "La calculadora usa su CAS real. Tu código no conoce Giac ni SymPy; solo llama a la API oficial de Lua.",
      previewTitle: "En Preview LÖVE",
      previewFlow: "Lua → API TI emulada → Giac → (si hace falta) SymPy / fallback → resultado",
      previewBody: "Giac es el CAS principal. Para casos que Giac no cubre, especialmente algunas EDO, el Preview puede usar SymPy y fallbacks propios. El Lua guardado en el .tns no se modifica.",
      warningTitle: "Compatibilidad importante",
      warningBody: "No asumas que el texto será idéntico entre PC y calculadora. Expresiones equivalentes pueden salir reordenadas. Además, evita llamar al CAS durante la inicialización del ScriptApp: en una TI real puede aparecer “cannot execute during initialization”. Ejecuta las pruebas desde eventos como on.enterKey(), callbacks de botones o después de iniciar la app.",
      funcsTitle: "Funciones del documento (Func XML)",
      funcsBody: "Si el documento contiene Func de TI-Basic/XML (por ejemplo sint, zint o utilidades propias), el Preview intenta respetar esa ruta local antes de enviar una expresión al CAS externo.",
      examplesTitle: "Comandos rápidos",
      testTitle: "Pruebas listas para copiar",
      basicTest: "Prueba básica: factor",
      odeTest: "Prueba EDO: deSolve",
      copy: "Copiar prueba",
      copied: "Copiado",
      statusTitle: "Estado del CAS del Preview",
      refresh: "Actualizar estado",
      giac: "Giac",
      sympy: "SymPy",
      fallback: "Último fallback",
      bridge: "Bridge",
      notLoaded: "no cargado",
      idle: "en espera",
      ready: "listo",
      error: "error",
      none: "ninguno",
      searchHint: "Mientras CAS esté activo, el buscador de arriba filtra esta guía.",
      checkTitle: "Qué comparar al probar",
      checkBody: "Compara el significado matemático, no solo el string. Por ejemplo, y+3*ln(y-1) y 3*ln(y-1)+y son la misma expresión. Para deSolve, valida que la familia de soluciones satisfaga la EDO.",
      examples: [
        ["Número", 'math.eval("1+1")', "→ 2"],
        ["Factor", 'math.evalStr("factor(x^2-1)")', "→ (x-1)*(x+1)"],
        ["Integral TI", 'math.evalStr("integral(x^2,x)")', "→ x^3/3"],
        ["Resolver", 'math.evalStr("solve(x^2-4=0,x)")', "→ soluciones"],
        ["EDO", 'math.evalStr("deSolve(y\'=x*y,x,y)")', "→ solución simbólica"]
      ]
    },
    en: {
      tab: "CAS",
      title: "CAS in Lua ScriptApp",
      intro: "Use the same Lua API that a real TI-Nspire CAS uses. Preview attempts to reproduce the result so you can develop and test on your PC.",
      apiTitle: "Main API",
      evalTitle: "math.eval(expression)",
      evalBody: "Asks the math engine to evaluate an expression and returns a compatible Lua value when possible (number, boolean, text, etc.).",
      evalStrTitle: "math.evalStr(expression)",
      evalStrBody: "Returns the mathematical result as text. This is normally the useful choice for symbolic results such as factor, integral, solve, or deSolve.",
      calcTitle: "On the calculator",
      calcFlow: "Lua → math.eval / math.evalStr → TI Math Server / CAS → result",
      calcBody: "The calculator uses its real CAS. Your Lua does not know about Giac or SymPy; it only calls the TI Lua API.",
      previewTitle: "In LÖVE Preview",
      previewFlow: "Lua → emulated TI API → Giac → (when needed) SymPy / fallback → result",
      previewBody: "Giac is the primary CAS. For cases Giac does not cover, especially some ODEs, Preview can use SymPy and custom fallbacks. The Lua stored in the .tns is not rewritten.",
      warningTitle: "Important compatibility rule",
      warningBody: "Do not expect identical output strings between PC and calculator. Equivalent expressions can be reordered. Also avoid calling the CAS while the ScriptApp is initializing: a real TI can report “cannot execute during initialization”. Run tests from events such as on.enterKey(), button callbacks, or after startup.",
      funcsTitle: "Document functions (Func XML)",
      funcsBody: "If the document contains TI-Basic/XML Func entries (for example sint, zint, or custom helpers), Preview tries to keep that local route before sending an expression to the external CAS.",
      examplesTitle: "Quick commands",
      testTitle: "Ready-to-copy tests",
      basicTest: "Basic test: factor",
      odeTest: "ODE test: deSolve",
      copy: "Copy test",
      copied: "Copied",
      statusTitle: "Preview CAS status",
      refresh: "Refresh status",
      giac: "Giac",
      sympy: "SymPy",
      fallback: "Last fallback",
      bridge: "Bridge",
      notLoaded: "not loaded",
      idle: "idle",
      ready: "ready",
      error: "error",
      none: "none",
      searchHint: "While CAS is active, the search box above filters this guide.",
      checkTitle: "What to compare when testing",
      checkBody: "Compare mathematical meaning, not only the string. For example, y+3*ln(y-1) and 3*ln(y-1)+y are the same expression. For deSolve, validate that the solution family satisfies the ODE.",
      examples: [
        ["Number", 'math.eval("1+1")', "→ 2"],
        ["Factor", 'math.evalStr("factor(x^2-1)")', "→ (x-1)*(x+1)"],
        ["TI integral", 'math.evalStr("integral(x^2,x)")', "→ x^3/3"],
        ["Solve", 'math.evalStr("solve(x^2-4=0,x)")', "→ solutions"],
        ["ODE", 'math.evalStr("deSolve(y\'=x*y,x,y)")', "→ symbolic solution"]
      ]
    },
    fr: {
      tab: "CAS",
      title: "CAS dans Lua ScriptApp",
      intro: "Utilisez la même API Lua qu'une vraie TI-Nspire CAS. L'aperçu tente de reproduire le résultat pour développer et tester sur PC.",
      apiTitle: "API principale",
      evalTitle: "math.eval(expression)",
      evalBody: "Demande au moteur mathématique d'évaluer une expression et renvoie une valeur Lua compatible lorsque c'est possible.",
      evalStrTitle: "math.evalStr(expression)",
      evalStrBody: "Renvoie le résultat mathématique sous forme de texte, particulièrement utile pour factor, integral, solve ou deSolve.",
      calcTitle: "Sur la calculatrice",
      calcFlow: "Lua → math.eval / math.evalStr → Math Server / CAS TI → résultat",
      calcBody: "La calculatrice utilise son vrai CAS. Le code Lua appelle uniquement l'API TI.",
      previewTitle: "Dans l'aperçu LÖVE",
      previewFlow: "Lua → API TI émulée → Giac → (si nécessaire) SymPy / fallback → résultat",
      previewBody: "Giac est le CAS principal. Pour certains cas non couverts, notamment des EDO, l'aperçu peut utiliser SymPy et des fallbacks. Le Lua du .tns n'est pas réécrit.",
      warningTitle: "Règle de compatibilité importante",
      warningBody: "Ne supposez pas que le texte sera identique entre PC et calculatrice. Des expressions équivalentes peuvent être réordonnées. Évitez aussi d'appeler le CAS pendant l'initialisation du ScriptApp : une vraie TI peut afficher “cannot execute during initialization”. Utilisez des événements comme on.enterKey() ou des callbacks de boutons.",
      funcsTitle: "Fonctions du document (Func XML)",
      funcsBody: "Si le document contient des Func TI-Basic/XML, l'aperçu tente de conserver cette route locale avant d'envoyer l'expression au CAS externe.",
      examplesTitle: "Commandes rapides",
      testTitle: "Tests prêts à copier",
      basicTest: "Test de base : factor",
      odeTest: "Test EDO : deSolve",
      copy: "Copier le test",
      copied: "Copié",
      statusTitle: "État du CAS de l'aperçu",
      refresh: "Actualiser l'état",
      giac: "Giac",
      sympy: "SymPy",
      fallback: "Dernier fallback",
      bridge: "Bridge",
      notLoaded: "non chargé",
      idle: "en attente",
      ready: "prêt",
      error: "erreur",
      none: "aucun",
      searchHint: "Quand CAS est actif, la recherche ci-dessus filtre ce guide.",
      checkTitle: "Que comparer pendant les tests",
      checkBody: "Comparez le sens mathématique, pas seulement la chaîne de caractères. Pour deSolve, vérifiez que la famille de solutions satisfait l'EDO.",
      examples: [
        ["Nombre", 'math.eval("1+1")', "→ 2"],
        ["Factor", 'math.evalStr("factor(x^2-1)")', "→ (x-1)*(x+1)"],
        ["Intégrale TI", 'math.evalStr("integral(x^2,x)")', "→ x^3/3"],
        ["Solve", 'math.evalStr("solve(x^2-4=0,x)")', "→ solutions"],
        ["EDO", 'math.evalStr("deSolve(y\'=x*y,x,y)")', "→ solution symbolique"]
      ]
    }
  };

  function inferLanguage(categories) {
    const text = String(categories?.textContent || "").toLowerCase();
    if (text.includes("todo") || text.includes("mapeos")) return "es";
    if (text.includes("tout") || text.includes("correspondances")) return "fr";
    if (text.includes("all") || text.includes("mappings")) return "en";
    const lang = String(document.documentElement.lang || "").toLowerCase();
    if (lang.startsWith("fr")) return "fr";
    if (lang.startsWith("en")) return "en";
    return "es";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function stateValue(value, t) {
    const text = String(value ?? "").trim();
    if (!text) return t.notLoaded;
    if (text === "ready") return t.ready;
    if (text === "idle") return t.idle;
    if (text === "error") return t.error;
    return text;
  }

  function statusHtml(t) {
    let bridge = null;
    let hybrid = null;
    try { bridge = window.TnsCasBridge?.getStatus?.() || null; } catch (_error) {}
    try { hybrid = window.TnsCasHybrid?.getStatus?.() || null; } catch (_error) {}

    const giac = bridge?.backend || stateValue(bridge?.status, t);
    const sympy = stateValue(hybrid?.sympyStatus, t);
    const fallback = hybrid?.lastFallback || t.none;
    const version = bridge?.version || hybrid?.version || t.notLoaded;

    return `
      <div class="cas-guide-status-item"><span>${escapeHtml(t.bridge)}</span><strong>${escapeHtml(version)}</strong></div>
      <div class="cas-guide-status-item"><span>${escapeHtml(t.giac)}</span><strong>${escapeHtml(giac)}</strong></div>
      <div class="cas-guide-status-item"><span>${escapeHtml(t.sympy)}</span><strong>${escapeHtml(sympy)}</strong></div>
      <div class="cas-guide-status-item"><span>${escapeHtml(t.fallback)}</span><strong>${escapeHtml(fallback)}</strong></div>`;
  }

  function buildPanel(t) {
    const examples = t.examples.map(([label, code, result]) => `
      <div class="cas-guide-example">
        <span>${escapeHtml(label)}</span>
        <code>${escapeHtml(code)}</code>
        <small>${escapeHtml(result)}</small>
      </div>`).join("");

    const panel = document.createElement("section");
    panel.className = "lua-guide-cas-panel";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="cas-guide-hero cas-searchable">
        <div>
          <span class="cas-guide-kicker">TI-Nspire Lua CAS</span>
          <h3>${escapeHtml(t.title)}</h3>
          <p>${escapeHtml(t.intro)}</p>
        </div>
        <span class="cas-guide-api-pill">math.eval · math.evalStr</span>
      </div>

      <div class="cas-guide-grid">
        <article class="cas-guide-card cas-searchable">
          <h4>${escapeHtml(t.apiTitle)}</h4>
          <div class="cas-guide-api-row"><code>${escapeHtml(t.evalTitle)}</code><p>${escapeHtml(t.evalBody)}</p></div>
          <div class="cas-guide-api-row"><code>${escapeHtml(t.evalStrTitle)}</code><p>${escapeHtml(t.evalStrBody)}</p></div>
        </article>

        <article class="cas-guide-card cas-searchable">
          <h4>${escapeHtml(t.calcTitle)}</h4>
          <div class="cas-guide-flow">${escapeHtml(t.calcFlow)}</div>
          <p>${escapeHtml(t.calcBody)}</p>
        </article>

        <article class="cas-guide-card cas-searchable">
          <h4>${escapeHtml(t.previewTitle)}</h4>
          <div class="cas-guide-flow">${escapeHtml(t.previewFlow)}</div>
          <p>${escapeHtml(t.previewBody)}</p>
        </article>

        <article class="cas-guide-card cas-guide-warning cas-searchable">
          <h4>${escapeHtml(t.warningTitle)}</h4>
          <p>${escapeHtml(t.warningBody)}</p>
        </article>

        <article class="cas-guide-card cas-searchable">
          <h4>${escapeHtml(t.funcsTitle)}</h4>
          <p>${escapeHtml(t.funcsBody)}</p>
        </article>

        <article class="cas-guide-card cas-guide-wide cas-searchable">
          <h4>${escapeHtml(t.examplesTitle)}</h4>
          <div class="cas-guide-examples">${examples}</div>
        </article>

        <article class="cas-guide-card cas-guide-wide cas-searchable">
          <h4>${escapeHtml(t.testTitle)}</h4>
          <div class="cas-guide-test-actions">
            <button type="button" class="cas-guide-copy" data-cas-copy="basic">${escapeHtml(t.copy)} · ${escapeHtml(t.basicTest)}</button>
            <button type="button" class="cas-guide-copy" data-cas-copy="ode">${escapeHtml(t.copy)} · ${escapeHtml(t.odeTest)}</button>
          </div>
          <p class="cas-guide-search-hint">${escapeHtml(t.searchHint)}</p>
        </article>

        <article class="cas-guide-card cas-searchable">
          <div class="cas-guide-card-heading">
            <h4>${escapeHtml(t.statusTitle)}</h4>
            <button type="button" class="cas-guide-refresh">${escapeHtml(t.refresh)}</button>
          </div>
          <div class="cas-guide-status">${statusHtml(t)}</div>
        </article>

        <article class="cas-guide-card cas-searchable">
          <h4>${escapeHtml(t.checkTitle)}</h4>
          <p>${escapeHtml(t.checkBody)}</p>
        </article>
      </div>`;
    return panel;
  }

  function findSearchInput(categories) {
    const parent = categories.parentElement;
    if (!parent) return null;
    const direct = parent.querySelector('input[type="search"], input[placeholder]');
    if (direct) return direct;
    const grand = parent.parentElement;
    return grand?.querySelector('input[type="search"], input[placeholder]') || null;
  }

  function install(categories) {
    if (!categories || categories.getAttribute(INSTALLED) === "true") return;
    const list = categories.parentElement?.querySelector(".lua-guide-list")
      || categories.parentElement?.parentElement?.querySelector(".lua-guide-list");
    if (!list) return;

    categories.setAttribute(INSTALLED, "true");
    let lang = inferLanguage(categories);
    let t = TEXT[lang];

    const button = document.createElement("button");
    button.type = "button";
    button.className = "lua-guide-category cas-guide-tab";
    button.textContent = t.tab;
    button.setAttribute("aria-pressed", "false");
    categories.appendChild(button);

    let panel = buildPanel(t);
    list.insertAdjacentElement("beforebegin", panel);
    const search = findSearchInput(categories);

    function refreshLanguage() {
      const nextLang = inferLanguage(categories);
      if (nextLang === lang) return;
      lang = nextLang;
      t = TEXT[lang];
      button.textContent = t.tab;
      const wasOpen = !panel.hidden;
      const replacement = buildPanel(t);
      panel.replaceWith(replacement);
      panel = replacement;
      panel.hidden = !wasOpen;
      bindPanelActions();
      if (wasOpen) refreshStatus();
    }

    function refreshStatus() {
      const status = panel.querySelector(".cas-guide-status");
      if (status) status.innerHTML = statusHtml(t);
    }

    async function copySnippet(kind, control) {
      const code = COPY_SNIPPETS[kind];
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code);
      } catch (_error) {
        const area = document.createElement("textarea");
        area.value = code;
        area.style.position = "fixed";
        area.style.left = "-9999px";
        document.body.appendChild(area);
        area.select();
        try { document.execCommand("copy"); } catch (_copyError) {}
        area.remove();
      }
      const old = control.textContent;
      control.textContent = t.copied;
      window.setTimeout(() => { control.textContent = old; }, 1200);
    }

    function bindPanelActions() {
      panel.querySelectorAll("[data-cas-copy]").forEach((control) => {
        control.addEventListener("click", () => copySnippet(control.dataset.casCopy, control));
      });
      panel.querySelector(".cas-guide-refresh")?.addEventListener("click", refreshStatus);
    }

    function showCas() {
      refreshLanguage();
      Array.from(categories.querySelectorAll("button")).forEach((item) => {
        item.classList.toggle("active", item === button);
        if (item === button) item.setAttribute("aria-pressed", "true");
      });
      list.style.display = "none";
      panel.hidden = false;
      refreshStatus();
      if (search?.value) filter(search.value);
    }

    function hideCas() {
      button.classList.remove("active");
      button.setAttribute("aria-pressed", "false");
      panel.hidden = true;
      list.style.display = "";
    }

    function filter(query) {
      if (panel.hidden) return;
      const needle = String(query || "").trim().toLowerCase();
      panel.querySelectorAll(".cas-searchable").forEach((item) => {
        item.hidden = !!needle && !String(item.textContent || "").toLowerCase().includes(needle);
      });
    }

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      showCas();
    });

    categories.addEventListener("click", (event) => {
      const target = event.target.closest("button");
      if (!target || target === button) return;
      hideCas();
      window.setTimeout(refreshLanguage, 0);
    }, true);

    search?.addEventListener("input", () => filter(search.value));
    bindPanelActions();
  }

  function scan() {
    document.querySelectorAll(".lua-guide-categories").forEach(install);
  }

  const observer = new MutationObserver(scan);
  function start() {
    scan();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  window.TnsLuaGuideCas = { version: VERSION, scan };
})();
