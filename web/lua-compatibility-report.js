(() => {
  "use strict";

  const OVERLAY_ID = "tns-lua-compatibility-overlay";
  const LANGS = ["es", "en", "fr"];

  const TEXT = {
    es: {
      title: "Informe de compatibilidad Lua",
      subtitle: "Análisis estático del archivo importado. No sustituye una prueba en una TI-Nspire real.",
      tiApis: "APIs TI-Nspire detectadas",
      cas: "CAS",
      events: "Eventos",
      warnings: "Avisos",
      lines: "líneas",
      chars: "caracteres",
      ready: "Listo",
      review: "Revisar",
      none: "No usa CAS",
      hybrid: "Ruta híbrida: Giac → SymPy/fallback cuando haga falta",
      noWarnings: "No se detectaron problemas conocidos por el analizador estático.",
      noApis: "No se detectaron APIs TI-Nspire conocidas.",
      noEvents: "No se detectaron callbacks on.*.",
      noCas: "No se detectaron llamadas a math.eval/math.evalStr.",
      dynamicCas: "Hay llamadas CAS construidas dinámicamente; su expresión exacta solo se conoce en ejecución.",
      topLevelCas: "math.eval/math.evalStr parece ejecutarse durante la inicialización. En la TI real el Math Server puede no estar disponible en ese momento; ejecútalo desde un evento/callback posterior.",
      gmatch: "string.gmatch se detectó en el archivo. El Preview LuaJS ha mostrado incompatibilidad con esta función; conviene probar esa ruta explícitamente.",
      restrictedLib: "Se detectaron librerías Lua que normalmente no forman parte del entorno ScriptApp de TI-Nspire (io/os/package/require/debug). Revisa esas líneas.",
      copy: "Copiar informe",
      close: "Cerrar",
      copied: "Informe copiado",
      tiLabel: "TI-Nspire",
      previewLabel: "Preview",
      casLabel: "CAS",
      staticOnly: "Estado basado en análisis estático",
      literal: "literal",
      dynamic: "dinámica",
      line: "línea"
    },
    en: {
      title: "Lua compatibility report",
      subtitle: "Static analysis of the imported file. This does not replace testing on a real TI-Nspire.",
      tiApis: "Detected TI-Nspire APIs",
      cas: "CAS",
      events: "Events",
      warnings: "Warnings",
      lines: "lines",
      chars: "characters",
      ready: "Ready",
      review: "Review",
      none: "No CAS usage",
      hybrid: "Hybrid route: Giac → SymPy/fallback when needed",
      noWarnings: "No known issues were detected by the static analyzer.",
      noApis: "No known TI-Nspire APIs were detected.",
      noEvents: "No on.* callbacks were detected.",
      noCas: "No math.eval/math.evalStr calls were detected.",
      dynamicCas: "Some CAS calls are built dynamically; their exact expression is only known at runtime.",
      topLevelCas: "math.eval/math.evalStr appears to run during initialization. On a real TI the Math Server may not be available then; run it from a later event/callback.",
      gmatch: "string.gmatch was detected. Preview LuaJS has shown incompatibility with this function; explicitly test that path.",
      restrictedLib: "Lua libraries that are normally outside the TI-Nspire ScriptApp environment were detected (io/os/package/require/debug). Review those lines.",
      copy: "Copy report",
      close: "Close",
      copied: "Report copied",
      tiLabel: "TI-Nspire",
      previewLabel: "Preview",
      casLabel: "CAS",
      staticOnly: "Status based on static analysis",
      literal: "literal",
      dynamic: "dynamic",
      line: "line"
    },
    fr: {
      title: "Rapport de compatibilité Lua",
      subtitle: "Analyse statique du fichier importé. Elle ne remplace pas un test sur une vraie TI-Nspire.",
      tiApis: "API TI-Nspire détectées",
      cas: "CAS",
      events: "Événements",
      warnings: "Avertissements",
      lines: "lignes",
      chars: "caractères",
      ready: "Prêt",
      review: "À vérifier",
      none: "Aucun usage CAS",
      hybrid: "Route hybride : Giac → SymPy/fallback si nécessaire",
      noWarnings: "Aucun problème connu n’a été détecté par l’analyseur statique.",
      noApis: "Aucune API TI-Nspire connue n’a été détectée.",
      noEvents: "Aucun callback on.* n’a été détecté.",
      noCas: "Aucun appel à math.eval/math.evalStr n’a été détecté.",
      dynamicCas: "Certains appels CAS sont construits dynamiquement ; leur expression exacte n’est connue qu’à l’exécution.",
      topLevelCas: "math.eval/math.evalStr semble être exécuté pendant l’initialisation. Sur la TI réelle, le Math Server peut ne pas être disponible à ce moment ; utilisez un événement/callback ultérieur.",
      gmatch: "string.gmatch a été détecté. Preview LuaJS a montré une incompatibilité avec cette fonction ; testez explicitement ce chemin.",
      restrictedLib: "Des bibliothèques Lua généralement absentes de l’environnement ScriptApp TI-Nspire ont été détectées (io/os/package/require/debug). Vérifiez ces lignes.",
      copy: "Copier le rapport",
      close: "Fermer",
      copied: "Rapport copié",
      tiLabel: "TI-Nspire",
      previewLabel: "Preview",
      casLabel: "CAS",
      staticOnly: "État basé sur une analyse statique",
      literal: "littéral",
      dynamic: "dynamique",
      line: "ligne"
    }
  };

  function language() {
    const active = document.querySelector("#language-buttons button.active[data-lang]")?.dataset.lang;
    if (LANGS.includes(active)) return active;
    const html = String(document.documentElement.lang || "").slice(0, 2).toLowerCase();
    if (LANGS.includes(html)) return html;
    return "es";
  }

  function t(lang = language()) { return TEXT[lang] || TEXT.es; }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function unique(items) { return [...new Set(items)].sort((a, b) => String(a).localeCompare(String(b))); }
  function lineNumberAt(code, index) { return code.slice(0, Math.max(0, index)).split("\n").length; }
  function bytesOf(code) {
    try { return new TextEncoder().encode(code).length; }
    catch (_error) { return String(code || "").length; }
  }
  function formatBytes(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(n >= 10240 ? 0 : 1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  }

  function collectEvents(code) {
    const out = [];
    const re = /\bfunction\s+on\.([A-Za-z_][\w]*)\s*\(/g;
    let match;
    while ((match = re.exec(code))) out.push(`on.${match[1]}`);
    return unique(out);
  }

  function collectApis(code) {
    const out = [];
    const patterns = [
      [/\bplatform\.(apiLevel|window|gc|withGC)\b/g, (m) => `platform.${m[1]}`],
      [/\bmath\.(evalStr|eval)\b/g, (m) => `math.${m[1]}`],
      [/\btimer\.([A-Za-z_][\w]*)\b/g, (m) => `timer.${m[1]}`],
      [/\bvar\.([A-Za-z_][\w]*)\b/g, (m) => `var.${m[1]}`],
      [/\bclipboard\.([A-Za-z_][\w]*)\b/g, (m) => `clipboard.${m[1]}`],
      [/\btoolpalette\.([A-Za-z_][\w]*)\b/g, (m) => `toolpalette.${m[1]}`],
      [/\bgc\s*:\s*([A-Za-z_][\w]*)\b/g, (m) => `gc:${m[1]}`]
    ];
    for (const [re, map] of patterns) {
      let match;
      while ((match = re.exec(code))) out.push(map(match));
    }
    return unique(out);
  }

  function collectCas(code) {
    const calls = [];
    const literalRe = /\bmath\.(evalStr|eval)\s*\(\s*(["'])(.*?)\2\s*\)/gs;
    const occupied = [];
    let match;
    while ((match = literalRe.exec(code))) {
      const expression = match[3];
      const command = expression.trim().match(/^([A-Za-z_][\w]*)\s*\(/)?.[1] || "expression";
      calls.push({ api: `math.${match[1]}`, kind: "literal", expression, command, line: lineNumberAt(code, match.index) });
      occupied.push([match.index, literalRe.lastIndex]);
    }

    const anyRe = /\bmath\.(evalStr|eval)\s*\(/g;
    while ((match = anyRe.exec(code))) {
      if (occupied.some(([start, end]) => match.index >= start && match.index < end)) continue;
      calls.push({ api: `math.${match[1]}`, kind: "dynamic", expression: "", command: "dynamic", line: lineNumberAt(code, match.index) });
    }
    return calls.sort((a, b) => a.line - b.line);
  }

  function topLevelCasLines(code) {
    const lines = String(code || "").split(/\r?\n/);
    let functionDepth = 0;
    const hits = [];
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i].replace(/--.*$/, "");
      const opens = (line.match(/\bfunction\b/g) || []).length;
      if (opens) functionDepth += opens;
      if (functionDepth === 0 && /\bmath\.(?:evalStr|eval)\s*\(/.test(line)) hits.push(i + 1);
      if (/^\s*end\s*[,;]?\s*$/.test(line)) functionDepth = Math.max(0, functionDepth - 1);
    }
    return hits;
  }

  function analyze(codeInput, name = "Archivo Lua") {
    const code = String(codeInput ?? "");
    const apis = collectApis(code);
    const casCalls = collectCas(code);
    const events = collectEvents(code);
    const warnings = [];
    const topLevelCas = topLevelCasLines(code);
    if (topLevelCas.length) warnings.push({ code: "top-level-cas", severity: "warning", lines: topLevelCas });

    const gmatchLines = [];
    for (const match of code.matchAll(/\bstring\.gmatch\b/g)) gmatchLines.push(lineNumberAt(code, match.index));
    if (gmatchLines.length) warnings.push({ code: "string-gmatch", severity: "warning", lines: unique(gmatchLines) });

    const restrictedLines = [];
    for (const match of code.matchAll(/\b(?:io\.|os\.|package\.|debug\.|require\s*\()/g)) restrictedLines.push(lineNumberAt(code, match.index));
    if (restrictedLines.length) warnings.push({ code: "restricted-lib", severity: "warning", lines: unique(restrictedLines) });
    if (casCalls.some((call) => call.kind === "dynamic")) warnings.push({ code: "dynamic-cas", severity: "info", lines: casCalls.filter(c => c.kind === "dynamic").map(c => c.line) });

    return {
      version: "20260903-lua-compat-v1",
      name: String(name || "Archivo Lua"),
      code,
      lines: code ? code.split(/\r?\n/).length : 0,
      chars: code.length,
      bytes: bytesOf(code),
      apis,
      casCalls,
      events,
      warnings,
      status: {
        ti: topLevelCas.length || restrictedLines.length ? "review" : "ready",
        preview: gmatchLines.length || restrictedLines.length ? "review" : "ready",
        cas: casCalls.length ? "hybrid" : "none"
      }
    };
  }

  function warningText(warning, lang = language()) {
    const tx = t(lang);
    const base = warning.code === "top-level-cas" ? tx.topLevelCas
      : warning.code === "string-gmatch" ? tx.gmatch
      : warning.code === "restricted-lib" ? tx.restrictedLib
      : warning.code === "dynamic-cas" ? tx.dynamicCas
      : warning.code;
    const lines = warning.lines?.length ? ` (${tx.line}${warning.lines.length > 1 ? "s" : ""}: ${warning.lines.join(", ")})` : "";
    return `${base}${lines}`;
  }

  function reportText(report, lang = language()) {
    const tx = t(lang);
    return [
      `${tx.title}: ${report.name}`,
      `${report.lines} ${tx.lines} · ${report.chars} ${tx.chars} · ${formatBytes(report.bytes)}`,
      `${tx.tiLabel}: ${report.status.ti === "ready" ? tx.ready : tx.review}`,
      `${tx.previewLabel}: ${report.status.preview === "ready" ? tx.ready : tx.review}`,
      `${tx.casLabel}: ${report.status.cas === "hybrid" ? tx.hybrid : tx.none}`,
      "",
      `${tx.tiApis} (${report.apis.length})`,
      ...(report.apis.length ? report.apis.map(v => `- ${v}`) : [`- ${tx.noApis}`]),
      "",
      `${tx.events} (${report.events.length})`,
      ...(report.events.length ? report.events.map(v => `- ${v}`) : [`- ${tx.noEvents}`]),
      "",
      `${tx.cas} (${report.casCalls.length})`,
      ...(report.casCalls.length ? report.casCalls.map(c => `- ${c.api} · ${c.kind === "literal" ? tx.literal : tx.dynamic} · ${tx.line} ${c.line}${c.expression ? ` · ${c.expression}` : ""}`) : [`- ${tx.noCas}`]),
      "",
      `${tx.warnings} (${report.warnings.length})`,
      ...(report.warnings.length ? report.warnings.map(w => `- ${warningText(w, lang)}`) : [`- ${tx.noWarnings}`])
    ].join("\n");
  }

  function statusBadge(label, state, tx) {
    const value = state === "ready" ? tx.ready : state === "review" ? tx.review : state === "hybrid" ? "Hybrid" : tx.none;
    return `<span class="tns-lua-compat-badge ${escapeHtml(state)}"><b>${escapeHtml(label)}</b><span>${escapeHtml(value)}</span></span>`;
  }

  function showReport(report) {
    if (!report) return null;
    document.getElementById(OVERLAY_ID)?.remove();
    const lang = language();
    const tx = t(lang);
    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.className = "tns-lua-compat-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", tx.title);

    const apiList = report.apis.length ? report.apis.map(api => `<li><code>${escapeHtml(api)}</code></li>`).join("") : `<li class="muted">${escapeHtml(tx.noApis)}</li>`;
    const eventList = report.events.length ? report.events.map(ev => `<li><code>${escapeHtml(ev)}</code></li>`).join("") : `<li class="muted">${escapeHtml(tx.noEvents)}</li>`;
    const casList = report.casCalls.length ? report.casCalls.map(call => `<li><div><code>${escapeHtml(call.api)}</code> <span class="tns-lua-compat-kind">${escapeHtml(call.kind === "literal" ? tx.literal : tx.dynamic)} · ${escapeHtml(tx.line)} ${call.line}</span></div>${call.expression ? `<pre>${escapeHtml(call.expression)}</pre>` : ""}</li>`).join("") : `<li class="muted">${escapeHtml(tx.noCas)}</li>`;
    const warningList = report.warnings.length ? report.warnings.map(w => `<li class="${w.severity === "warning" ? "warn" : "info"}">${escapeHtml(warningText(w, lang))}</li>`).join("") : `<li class="ok">${escapeHtml(tx.noWarnings)}</li>`;

    overlay.innerHTML = `
      <section class="tns-lua-compat-card">
        <header class="tns-lua-compat-head">
          <div><div class="tns-lua-compat-kicker">Lua · Compatibility Center</div><h2>${escapeHtml(tx.title)}</h2><p>${escapeHtml(tx.subtitle)}</p></div>
          <button type="button" class="tns-lua-compat-x" aria-label="${escapeHtml(tx.close)}">×</button>
        </header>
        <div class="tns-lua-compat-file"><strong>${escapeHtml(report.name)}</strong><span>${report.lines} ${escapeHtml(tx.lines)} · ${report.chars} ${escapeHtml(tx.chars)} · ${escapeHtml(formatBytes(report.bytes))}</span></div>
        <div class="tns-lua-compat-badges">${statusBadge(tx.tiLabel, report.status.ti, tx)}${statusBadge(tx.previewLabel, report.status.preview, tx)}${statusBadge(tx.casLabel, report.status.cas, tx)}</div>
        <p class="tns-lua-compat-static-note">${escapeHtml(tx.staticOnly)}</p>
        <div class="tns-lua-compat-grid">
          <section><h3>${escapeHtml(tx.tiApis)} <span>${report.apis.length}</span></h3><ul>${apiList}</ul></section>
          <section><h3>${escapeHtml(tx.events)} <span>${report.events.length}</span></h3><ul>${eventList}</ul></section>
          <section class="wide"><h3>${escapeHtml(tx.cas)} <span>${report.casCalls.length}</span></h3><p class="tns-lua-compat-engine">${escapeHtml(report.status.cas === "hybrid" ? tx.hybrid : tx.none)}</p><ul class="cas-list">${casList}</ul></section>
          <section class="wide"><h3>${escapeHtml(tx.warnings)} <span>${report.warnings.length}</span></h3><ul class="warning-list">${warningList}</ul></section>
        </div>
        <footer class="tns-lua-compat-actions"><button type="button" class="secondary tns-lua-compat-copy">${escapeHtml(tx.copy)}</button><button type="button" class="primary tns-lua-compat-close">${escapeHtml(tx.close)}</button></footer>
      </section>`;

    const close = () => { overlay.classList.add("closing"); setTimeout(() => overlay.remove(), 180); };
    overlay.querySelector(".tns-lua-compat-x")?.addEventListener("click", close);
    overlay.querySelector(".tns-lua-compat-close")?.addEventListener("click", close);
    overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });
    overlay.querySelector(".tns-lua-compat-copy")?.addEventListener("click", async (event) => {
      try {
        await navigator.clipboard.writeText(reportText(report, lang));
        event.currentTarget.textContent = tx.copied;
        setTimeout(() => { if (event.currentTarget?.isConnected) event.currentTarget.textContent = tx.copy; }, 1400);
      } catch (_error) {}
    });
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("visible"));
    return overlay;
  }

  window.TnsLuaCompatibility = { version: "20260903-lua-compat-v1", analyze, showReport, reportText, formatBytes };
})();
